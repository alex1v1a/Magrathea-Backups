#!/usr/bin/env powershell
# Deep Thought Mission Control API Integration
# Reports all operations to Mission Control boards
# Fallback: Logs locally if API unavailable or unauthenticated

param(
    [string]$BoardId = "deepthought-tasks",
    [string]$ApiBaseUrl = "http://10.0.1.90:8000",
    [string]$ApiKey = $env:MISSION_CONTROL_API_KEY
)

# Local queue for when API is unavailable
$LocalQueuePath = "$env:USERPROFILE\.openclaw\workspace\magrathea\deepthought\logs\mission_control_queue.jsonl"
$LogPath = "$env:USERPROFILE\.openclaw\workspace\magrathea\deepthought\logs\mission_control_local.log"

# Ensure log directories exist
if (!(Test-Path (Split-Path $LocalQueuePath -Parent))) {
    New-Item -ItemType Directory -Path (Split-Path $LocalQueuePath -Parent) -Force | Out-Null
}

# Mission Control API Client
function Invoke-MissionControlApi {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [hashtable]$Body = @{}
    )
    
    $Headers = @{
        "Content-Type" = "application/json"
    }
    if ($ApiKey) {
        $Headers["Authorization"] = "Bearer $ApiKey"
    }
    
    $Uri = "$ApiBaseUrl/api/v1/$Endpoint"
    
    try {
        if ($Method -eq "GET") {
            $Response = Invoke-RestMethod -Uri $Uri -Method GET -Headers $Headers -TimeoutSec 10
        } else {
            $JsonBody = $Body | ConvertTo-Json -Depth 5
            $Response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -Body $JsonBody -TimeoutSec 10
        }
        return @{ Success = $true; Data = $Response }
    } catch {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        return @{ 
            Success = $false; 
            StatusCode = $StatusCode;
            Error = $_.Exception.Message 
        }
    }
}

# Report task to Mission Control (with local fallback)
function Report-Task {
    param(
        [string]$Title,
        [string]$Description,
        [string]$Status = "in_progress",
        [string]$Priority = "normal",
        [string]$Assignee = "deepthought",
        [hashtable]$Metadata = @{}
    )
    
    $TaskData = @{
        title = $Title
        description = $Description
        status = $Status
        priority = $Priority
        assignee = $Assignee
        created_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        metadata = $Metadata
    }
    
    # Try API first
    $Result = Invoke-MissionControlApi -Method "POST" -Endpoint "boards/$BoardId/tasks" -Body $TaskData
    
    if ($Result.Success) {
        Write-Host "Task reported to Mission Control: $Title" -ForegroundColor Green
        return @{ Success = $true; TaskId = $Result.Data.id }
    } else {
        # Fallback: queue locally
        $QueueEntry = @{
            timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
            endpoint = "boards/$BoardId/tasks"
            data = $TaskData
            api_error = $Result.Error
        } | ConvertTo-Json -Compress
        
        Add-Content -Path $LocalQueuePath -Value $QueueEntry
        
        # Also write to readable log
        $LogEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] QUEUED: $Title (API unavailable: $($Result.StatusCode))"
        Add-Content -Path $LogPath -Value $LogEntry
        
        Write-Warning "Mission Control unavailable (Status: $($Result.StatusCode)), task queued locally"
        return @{ Success = $false; Queued = $true; LocalPath = $LocalQueuePath }
    }
}

# Sync queued items when API becomes available
function Sync-QueuedTasks {
    if (!(Test-Path $LocalQueuePath)) { return }
    
    $Queue = Get-Content -Path $LocalQueuePath | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json }
    $Synced = 0
    $Failed = 0
    
    foreach ($Item in $Queue) {
        $Result = Invoke-MissionControlApi -Method "POST" -Endpoint $Item.endpoint -Body $Item.data
        if ($Result.Success) {
            $Synced++
        } else {
            $Failed++
        }
    }
    
    if ($Synced -gt 0) {
        # Clear queue after successful sync
        Clear-Content -Path $LocalQueuePath
        Write-Host "Synced $Synced queued tasks to Mission Control" -ForegroundColor Green
    }
    
    if ($Failed -gt 0) {
        Write-Warning "$Failed tasks failed to sync, remaining in queue"
    }
}

# Report cron job execution
function Report-CronExecution {
    param(
        [string]$JobName,
        [string]$JobId,
        [string]$Status,
        [int]$DurationSeconds,
        [string]$Output = ""
    )
    
    Report-Task `
        -Title "Cron: $JobName" `
        -Description "Job ID: $JobId`nDuration: ${DurationSeconds}s`nOutput: $Output" `
        -Status $(if ($Status -eq "success") { "completed" } else { "failed" }) `
        -Priority $(if ($Status -eq "failed") { "high" } else { "normal" }) `
        -Metadata @{
            type = "cron_job"
            job_id = $JobId
            duration_seconds = $DurationSeconds
        }
}

# Report sub-agent operation
function Report-SubAgentOperation {
    param(
        [string]$Task,
        [string]$SessionKey,
        [string]$Status,
        [int]$RuntimeSeconds = 0,
        [int]$TokensIn = 0,
        [int]$TokensOut = 0
    )
    
    Report-Task `
        -Title "Sub-Agent: $Task" `
        -Description "Session: $SessionKey`nRuntime: ${RuntimeSeconds}s`nTokens: $TokensIn in / $TokensOut out" `
        -Status $(if ($Status -eq "completed") { "completed" } else { "in_progress" }) `
        -Metadata @{
            type = "sub_agent"
            session_key = $SessionKey
            runtime_seconds = $RuntimeSeconds
            tokens_in = $TokensIn
            tokens_out = $TokensOut
        }
}

# Report API call
function Report-ApiCall {
    param(
        [string]$Service,
        [string]$Endpoint,
        [string]$Method,
        [int]$StatusCode,
        [int]$ResponseTimeMs = 0
    )
    
    $Status = if ($StatusCode -ge 200 -and $StatusCode -lt 300) { "completed" } else { "failed" }
    
    Report-Task `
        -Title "API Call: $Service" `
        -Description "$Method $Endpoint`nStatus: $StatusCode`nResponse Time: ${ResponseTimeMs}ms" `
        -Status $Status `
        -Priority $(if ($Status -eq "failed") { "high" } else { "low" }) `
        -Metadata @{
            type = "api_call"
            service = $Service
            endpoint = $Endpoint
            method = $Method
            status_code = $StatusCode
            response_time_ms = $ResponseTimeMs
        }
}

# Report backup operation
function Report-Backup {
    param(
        [string]$Type,
        [string]$Destination,
        [long]$SizeBytes,
        [string]$Status
    )
    
    $SizeMB = [math]::Round($SizeBytes / 1MB, 2)
    
    Report-Task `
        -Title "Backup: $Type" `
        -Description "Destination: $Destination`nSize: ${SizeMB} MB" `
        -Status $(if ($Status -eq "success") { "completed" } else { "failed" }) `
        -Metadata @{
            type = "backup"
            backup_type = $Type
            destination = $Destination
            size_bytes = $SizeBytes
        }
}

# Export functions
Export-ModuleMember -Function Report-Task, Report-CronExecution, Report-SubAgentOperation, Report-ApiCall, Report-Backup, Sync-QueuedTasks, Invoke-MissionControlApi
