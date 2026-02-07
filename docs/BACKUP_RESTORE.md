# Supabase Backup and Restore Guide

This document covers backup and restore procedures for the self-hosted Supabase deployment.

## Backup Strategy Overview

| Component | Method | Schedule | Retention |
|-----------|--------|----------|-----------|
| PostgreSQL Database | kartoza/pg-backup | Daily 2 AM | 7 days |
| Storage Files | Manual tar backup | Before updates | 7 days |
| Configuration | Git repository | On change | Unlimited |

## Automated Backups

### How It Works

The `kartoza/pg-backup` container runs alongside Supabase and automatically:
1. Executes pg_dump at 2 AM daily
2. Compresses backups with gzip
3. Removes backups older than 7 days
4. Stores backups in `/opt/backups/postgres/`

### Deploy Automated Backup

```bash
# On the VM:
cd /opt/supabase
docker compose -f docker-compose.backup.yml up -d

# Verify backup container is running
docker ps | grep backup
```

### Verify Backups

```bash
# List backup files
ls -lh /opt/backups/postgres/

# Check backup container logs
docker logs supabase-db-backup
```

## Manual Backup

### Database Backup

```bash
cd /opt/supabase
./backup.sh backup
```

Creates: `/opt/backups/postgres/manual-backup-YYYYMMDD-HHMMSS.sql.gz`

### Storage Backup

```bash
./backup.sh storage-backup
```

Creates: `/opt/backups/postgres/storage-backup-YYYYMMDD-HHMMSS.tar.gz`

### List Available Backups

```bash
./backup.sh list
```

## Restore Procedures

### Database Restore

**WARNING:** This will OVERWRITE all current data!

1. **Stop all traffic** (optional but recommended):
   - Update DNS to maintenance page, or
   - Stop frontend containers

2. **Perform restore**:
   ```bash
   cd /opt/supabase

   # List available backups
   ./backup.sh list

   # Restore from specific backup
   ./backup.sh restore manual-backup-20260129-020000.sql.gz
   ```

3. **Verify data**:
   - Check Supabase Studio for tables
   - Test API endpoints
   - Verify user authentication works

4. **Resume traffic**

### Storage Restore

```bash
./backup.sh storage-restore storage-backup-20260129-020000.tar.gz
```

### Point-in-Time Recovery

The automated backups are full dumps. For point-in-time recovery:
1. Restore the most recent backup BEFORE the incident
2. Accept data loss between backup and incident

For mission-critical deployments, consider:
- More frequent automated backups (hourly)
- PostgreSQL WAL archiving for true point-in-time recovery

## Disaster Recovery

### Complete VM Loss

1. Create new Proxmox VM following `docs/PROXMOX_VM_SETUP.md`
2. Run vm-setup.sh
3. Copy production configuration files
4. Configure .env with SAME secrets as original
5. Deploy Supabase and Caddy
6. Restore database from backup
7. Restore storage files
8. Verify OAuth and API access

### Database Corruption

1. Stop Supabase: `./deploy.sh stop`
2. Remove database volume: `docker volume rm supabase_db_data`
3. Start Supabase: `./deploy.sh start`
4. Restore from backup: `./backup.sh restore <file>`
5. Apply any missing migrations

## Off-Site Backup

For additional protection, copy backups off the VM:

```bash
# From your local machine or another server:
rsync -avz user@vm-ip:/opt/backups/postgres/ /path/to/offsite/backup/

# Or use rclone to sync to cloud storage:
rclone sync /opt/backups/postgres remote:supabase-backups
```

Recommended: Set up a cron job on another machine to pull backups daily.

## Testing Backups

**Backups are only useful if they restore successfully.**

Monthly testing procedure:
1. Create a test VM (or use local Docker)
2. Deploy Supabase with same configuration
3. Restore backup
4. Verify data integrity
5. Document any issues

## Backup Monitoring

### Check Last Backup

```bash
# Most recent backup file
ls -lt /opt/backups/postgres/*.gz | head -1

# Backup container status
docker ps | grep backup
docker logs --tail 20 supabase-db-backup
```

### Alert on Backup Failure

Consider adding monitoring:
- Check backup file age (alert if > 26 hours old)
- Check backup container health
- Integrate with your monitoring system (Prometheus, Grafana, etc.)

## Configuration Backup

Configuration files are stored in git and don't need automated backup:
- `.env.template` (in git)
- `docker-compose.override.yml` (in git)
- `deploy.sh` (in git)

**The only file NOT in git is `.env` (contains secrets).**

Backup `.env` separately:
```bash
# Encrypt and store securely
gpg -c /opt/supabase/.env
# Store encrypted file in password manager or secure location
```
