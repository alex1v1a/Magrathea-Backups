# Deep Thought - Fleet Mission Control Consolidation
# 2026-04-11

## Decision: Single Mission Control Instance

**Primary Instance:** Deep Thought (http://10.0.1.99:8080)
**Rationale:**
- Deep Thought instance: ✅ Running and stable
- Marvin's instance: ❌ Windows/Next.js binding issues
- Fleet requires only ONE working Mission Control

## Fleet-Wide Boards to Create

### 1. Fleet Status Dashboard
- Board ID: `fleet-status`
- Purpose: Real-time status of all machines
- Fields: Machine, Status, Last Check, Issues

### 2. Team Tasks
- Board ID: `team-tasks`
- Purpose: Cross-machine task coordination
- Fields: Task, Assignee, Status, Priority, Due Date

### 3. Cron Job Monitor
- Board ID: `cron-monitor`
- Purpose: Fleet-wide cron job tracking
- Fields: Job Name, Machine, Schedule, Last Run, Status

### 4. SSH Mesh Status
- Board ID: `ssh-mesh`
- Purpose: SSH connectivity tracking
- Fields: From, To, Status, Last Verified

## Integration Plan

### Phase 1: Board Creation
- Create 4 fleet-wide boards
- Configure fields and columns
- Test API connectivity

### Phase 2: Cron Integration
- Modify all cron jobs to report to Mission Control
- Use MissionControlApi.psm1 module
- Queue tasks locally if API unavailable

### Phase 3: Team Onboarding
- Document API endpoints for team
- Share board IDs
- Train team on usage

## Current Status

| Component | Status |
|-----------|--------|
| Mission Control Service | ✅ Running on port 8080 |
| HTTP Endpoint | ✅ http://10.0.1.99:8080 |
| API Module | ✅ MissionControlApi.psm1 ready |
| SSH Mesh | ✅ Complete |
| Board Creation | ⏳ Pending |
| Team Integration | ⏳ Pending |

## API Endpoints (Deep Thought Instance)

Base URL: http://10.0.1.99:8080/api/v1

### Boards
- GET /boards - List all boards
- POST /boards - Create new board
- GET /boards/{id} - Get board details
- PUT /boards/{id} - Update board
- DELETE /boards/{id} - Delete board

### Tasks
- GET /boards/{id}/tasks - List board tasks
- POST /boards/{id}/tasks - Create task
- GET /tasks/{id} - Get task details
- PUT /tasks/{id} - Update task
- DELETE /tasks/{id} - Delete task

## Team Access

| Team Member | Access | Notes |
|-------------|--------|-------|
| Deep Thought | Full admin | Primary instance owner |
| Trillian | Read/Write | Via API integration |
| Bistromath | Read/Write | Via API integration |
| Marvin | Read/Write | Via API integration |

## Next Actions

1. Create fleet-status board
2. Create team-tasks board
3. Create cron-monitor board
4. Create ssh-mesh board
5. Test API with team
6. Document usage

---
Last Updated: 2026-04-11 21:41 CDT
