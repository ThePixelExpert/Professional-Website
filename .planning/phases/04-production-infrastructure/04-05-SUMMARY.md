---
phase: 04-production-infrastructure
plan: 05
subsystem: infrastructure-backup
tags: [backup, postgres, disaster-recovery, kartoza, automation]

dependencies:
  requires:
    - 04-03: Supabase Docker Compose deployment
  provides:
    - Automated daily PostgreSQL backups with retention
    - Manual backup and restore scripts
    - Comprehensive backup documentation
  affects:
    - 04-06: Production verification (backup testing)

tech-stack:
  added:
    - kartoza/pg-backup: Automated PostgreSQL backup container
  patterns:
    - Scheduled backup with cron (daily 2 AM)
    - 7-day retention policy
    - Separate backup volume (/opt/backups)

key-files:
  created:
    - production/docker-compose.backup.yml: kartoza/pg-backup service
    - production/backup.sh: Manual backup/restore script
    - docs/BACKUP_RESTORE.md: Comprehensive backup guide
  modified: []

decisions:
  - id: backup-kartoza
    choice: Use kartoza/pg-backup container
    rationale: Pre-built solution with cron scheduling, retention, compression
    alternatives: [Custom cron scripts, Supabase cloud backups]
    date: 2026-02-07

  - id: backup-schedule
    choice: Daily at 2 AM with 7-day retention
    rationale: Balances storage usage with recovery options for homelab
    alternatives: [Hourly backups, 30-day retention]
    date: 2026-02-07

  - id: backup-location
    choice: "/opt/backups/postgres on host"
    rationale: Persists across container recreation, on dedicated storage disk
    alternatives: [Docker volume, Remote storage]
    date: 2026-02-07

metrics:
  duration: 163 seconds
  tasks-completed: 3
  files-created: 3
  commits: 3
  completed: 2026-02-07
---

# Phase 4 Plan 5: Backup Automation Summary

**One-liner:** Automated daily PostgreSQL backups with kartoza/pg-backup, manual scripts for database and storage, and comprehensive disaster recovery documentation

## What Was Built

Created a complete backup and restore solution for the self-hosted Supabase deployment:

1. **Automated Backup Service** (docker-compose.backup.yml)
   - kartoza/pg-backup container for scheduled backups
   - Daily execution at 2 AM via cron
   - 7-day retention with automatic cleanup
   - Compressed backups with gzip
   - Connects to Supabase db container via network

2. **Manual Backup Script** (backup.sh)
   - `backup`: Create manual pg_dump backup
   - `restore`: Restore from backup with safety confirmation
   - `list`: Display available backups
   - `storage-backup`: Tar backup of storage files
   - `storage-restore`: Restore storage files
   - Color-coded output for better UX

3. **Comprehensive Documentation** (BACKUP_RESTORE.md)
   - Backup strategy overview
   - Automated backup deployment and verification
   - Manual backup/restore procedures
   - Disaster recovery scenarios (VM loss, database corruption)
   - Off-site backup recommendations
   - Testing and monitoring guidance
   - Configuration backup with GPG encryption

## How It Works

### Automated Backup Flow

```
2:00 AM Daily
    ↓
kartoza/pg-backup container
    ↓
pg_dump via db container
    ↓
gzip compression
    ↓
/opt/backups/postgres/
    ↓
Remove backups > 7 days old
```

### Manual Backup Flow

```
./backup.sh backup
    ↓
Check db container running
    ↓
docker exec pg_dump
    ↓
gzip compression
    ↓
/opt/backups/postgres/manual-backup-TIMESTAMP.sql.gz
```

### Restore Flow

```
./backup.sh restore <file>
    ↓
Confirmation prompt
    ↓
Stop Supabase services
    ↓
Start db container only
    ↓
gunzip | psql restore
    ↓
Start all services
```

## Key Files

### production/docker-compose.backup.yml
Automated backup service definition:
- kartoza/pg-backup:latest image
- Connects to `supabase_default` network
- Uses POSTGRES_PASSWORD from .env
- Mounts /opt/backups/postgres volume
- Daily cron schedule: `0 2 * * *`

### production/backup.sh
Executable script with 5 commands:
- `backup`: Manual database backup
- `restore <file>`: Restore with confirmation
- `list`: Show available backups
- `storage-backup`: Backup storage files
- `storage-restore <file>`: Restore storage files

### docs/BACKUP_RESTORE.md
Comprehensive guide covering:
- Backup strategy table (method, schedule, retention)
- Deployment instructions
- Restore procedures with warnings
- Disaster recovery playbooks
- Off-site backup recommendations
- Testing and monitoring guidance

## Decisions Made

### Use kartoza/pg-backup Container
**Decision:** Use pre-built kartoza/pg-backup instead of custom scripts

**Rationale:**
- Battle-tested community solution
- Built-in cron scheduling
- Automatic retention management
- Compression included
- Maintained and updated

**Alternatives considered:**
- Custom cron scripts: More maintenance, reinventing wheel
- Supabase cloud backups: Not available for self-hosted

### Daily 2 AM Schedule with 7-Day Retention
**Decision:** Daily backups at 2 AM, keep 7 days

**Rationale:**
- Daily provides good recovery granularity
- 2 AM minimizes impact during low-traffic period
- 7 days balances storage usage with recovery options
- Suitable for homelab with moderate data changes

**Alternatives considered:**
- Hourly backups: Excessive for portfolio site, storage intensive
- 30-day retention: Unnecessary for homelab, wastes disk space

### Host Path /opt/backups/postgres
**Decision:** Store backups on host at /opt/backups/postgres

**Rationale:**
- Persists across container recreation
- On dedicated /opt storage disk (separate from OS)
- Easy access for off-site backup scripts
- Standard Unix location for backups

**Alternatives considered:**
- Docker volume: Harder to access for off-site backup
- Remote storage: Adds complexity, not needed for initial deployment

## Testing Performed

1. **YAML Validation**: Verified docker-compose.backup.yml syntax
2. **Script Validation**: bash -n syntax check passed
3. **Executable Permissions**: backup.sh marked executable
4. **Documentation Completeness**: Verified all required sections present

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CRLF line endings in backup.sh**
- **Found during:** Task 2 verification
- **Issue:** backup.sh had Windows-style CRLF line terminators causing bash syntax error
- **Fix:** Applied sed command to convert CRLF to LF
- **Files modified:** production/backup.sh
- **Commit:** e9cf021

**Why this happened:** Write tool may have introduced CRLF based on content formatting

None - plan executed exactly as written, except for line ending fix.

## Integration Points

### With Existing Infrastructure

**Supabase Network:**
- backup service joins `supabase_default` network
- Accesses db container via hostname `db`
- Uses POSTGRES_PASSWORD from shared .env

**Storage Layout:**
- Backups on /opt (dedicated disk, separate from OS)
- Aligns with vm-setup.sh disk partitioning
- Co-located with Supabase data for efficiency

**Deployment Scripts:**
- Integrates with existing deploy.sh patterns
- Uses same docker compose commands
- Follows established conventions

### For Future Phases

**Phase 4 Plan 6 (Production Verification):**
- Can test backup/restore as part of verification
- Verify backup automation working
- Validate restore procedures

**Ongoing Operations:**
- Backup monitoring can integrate with future observability
- Off-site backup can sync to TrueNAS or cloud
- Retention policy adjustable via environment variable

## Next Phase Readiness

### Unblocked Work

**04-06 Production Verification:**
- Backup automation ready to test
- Restore procedures documented
- Can validate as part of end-to-end verification

### Potential Issues

1. **Backup Directory Not Created**
   - **Risk:** /opt/backups/postgres may not exist on first run
   - **Mitigation:** vm-setup.sh should create directory, or backup container will create it
   - **Action:** Verify directory exists in 04-06 testing

2. **Database Restore Testing**
   - **Risk:** Restore procedure untested in actual production environment
   - **Mitigation:** Documentation includes testing recommendations
   - **Action:** Include restore test in monthly maintenance

3. **Off-Site Backup Not Automated**
   - **Risk:** All backups on single VM, vulnerable to VM loss
   - **Mitigation:** Documented manual off-site backup commands
   - **Action:** Consider automating in future (cron + rsync/rclone)

## Usage Examples

### Deploy Automated Backup

```bash
# On VM after Supabase deployment
cd /opt/supabase
docker compose -f docker-compose.backup.yml up -d

# Verify running
docker ps | grep backup
```

### Create Manual Backup Before Update

```bash
cd /opt/supabase
./backup.sh backup
./backup.sh storage-backup
./backup.sh list
```

### Restore from Backup

```bash
cd /opt/supabase

# List available backups
./backup.sh list

# Restore database (with confirmation)
./backup.sh restore manual-backup-20260207-140000.sql.gz

# Restore storage if needed
./backup.sh storage-restore storage-backup-20260207-140000.tar.gz
```

### Copy Backups Off-Site

```bash
# From another machine
rsync -avz user@supabase-vm:/opt/backups/postgres/ /local/backup/
```

## Lessons Learned

### What Went Well

1. **Pre-built Solution:** kartoza/pg-backup provides exactly what's needed with minimal configuration
2. **Comprehensive Documentation:** BACKUP_RESTORE.md covers all scenarios from routine backup to disaster recovery
3. **Manual Script Utility:** backup.sh provides flexibility for ad-hoc operations without remembering complex Docker commands

### What Could Be Better

1. **Backup Monitoring:** No alerting if backups fail - relies on manual checks
2. **Off-Site Automation:** Manual process for copying backups off VM
3. **Storage Backup Frequency:** No automated storage backup (only database)

### Recommendations for Future

1. Add monitoring/alerting for backup failures (check file age)
2. Automate off-site backup with cron + rsync/rclone
3. Consider automated storage backups if file uploads become important
4. Document and test restore procedure monthly

## Commits

| Hash    | Type | Description |
|---------|------|-------------|
| 099c833 | feat | Add automated PostgreSQL backup service |
| e9cf021 | feat | Add manual backup and restore script |
| fc85287 | docs | Add comprehensive backup and restore guide |

---

**Status:** Complete
**Date:** 2026-02-07
**Duration:** 2.7 minutes
**Tasks:** 3/3 (100%)
