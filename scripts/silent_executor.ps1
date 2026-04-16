# Silent Executor - Run PowerShell scripts completely hidden
# Usage: silent_executor.ps1 -ScriptPath "path\to\script.ps1" [args]

param(
    [Parameter(Mandatory=$true)]
    [string]$ScriptPath,
    
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$ScriptArgs
)

# Ensure script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Error "Script not found: $ScriptPath"
    exit 1
}

# Build argument list with proper escaping
$EscapedArgs = $ScriptArgs | ForEach-Object { '"{0}"' -f ($_ -replace '"', '\"') }
$ArgString = $EscapedArgs -join ' '

# Create process start info for completely hidden window
$StartInfo = New-Object System.Diagnostics.ProcessStartInfo
$StartInfo.FileName = "powershell.exe"
$StartInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" $ArgString"
$StartInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$StartInfo.CreateNoWindow = $true
$StartInfo.UseShellExecute = $false
$StartInfo.RedirectStandardOutput = $true
$StartInfo.RedirectStandardError = $true

# Start process
$Process = [System.Diagnostics.Process]::Start($StartInfo)

# Read output BEFORE waiting to prevent deadlock (buffer deadlock)
$Output = $Process.StandardOutput.ReadToEnd()
$StdErr = $Process.StandardError.ReadToEnd()

# Now wait for exit
$Process.WaitForExit()

# Output results
if ($Output) { Write-Host $Output }
if ($StdErr) { Write-Error $StdErr }

exit $Process.ExitCode
