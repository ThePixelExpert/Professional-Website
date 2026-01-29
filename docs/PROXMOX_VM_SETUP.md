# Proxmox VM Setup for Supabase Production

## Overview

This guide walks through creating a dedicated virtual machine on Proxmox VE for running Supabase in production. The VM will host the complete Supabase stack (database, auth, storage, realtime) via Docker Compose.

**Purpose**: Dedicated VM for Supabase production deployment

**Why VM over LXC**:
- Docker compatibility: VMs avoid the kernel sharing issues that LXC containers have with Docker
- Live migration: VMs can be migrated between Proxmox hosts without downtime
- Update stability: Proxmox updates don't break VMs like they sometimes break LXC containers
- Isolation: Full hardware virtualization provides better security boundaries

**Target Specifications**:
- **CPU**: 4 cores (Type: host)
- **RAM**: 8GB (no ballooning)
- **Storage**:
  - OS disk: 60GB (VirtIO Block)
  - Data disk: 120GB (VirtIO Block) - mounted at `/opt`
- **Network**: Bridged (vmbr0) on LAN (192.168.0.x)

## Prerequisites

Before starting, ensure you have:

- Proxmox VE 7.x or 8.x installed and accessible
- Ubuntu Server 22.04 LTS ISO uploaded to Proxmox
  - Download from: https://ubuntu.com/download/server
  - Upload via: Proxmox UI → Datacenter → [storage] → ISO Images → Upload
- Network configured (DHCP or static IP)
- SSH access to Proxmox host (optional, but helpful)
- DNS A record for `supabase.edwardstech.dev` (can be configured after VM creation)

## Step 1: Create VM in Proxmox UI

1. **Open Proxmox Web UI** at `https://your-proxmox-ip:8006`

2. **Click "Create VM"** button (top right)

3. **General Tab**:
   ```
   Node:   [Select your Proxmox node]
   VM ID:  [Next available, e.g., 100]
   Name:   supabase-prod
   ```
   - ☑ **Start at boot** (recommended)

4. **OS Tab**:
   ```
   Storage:      [Select your ISO storage]
   ISO Image:    ubuntu-22.04-live-server-amd64.iso
   Guest OS:
     Type:       Linux
     Version:    6.x - 2.6 Kernel
   ```

5. **System Tab**:
   ```
   Graphic card:     Default
   Machine:          q35
   BIOS:             SeaBIOS
   SCSI Controller:  VirtIO SCSI single
   ```
   - ☐ **Qemu Agent** (can enable later after installing qemu-guest-agent)
   - **Note**: Keep other settings as defaults

6. **Disks Tab**:
   ```
   Bus/Device:    VirtIO Block (0)
   Storage:       local-lvm (or your storage pool)
   Disk size:     60 GiB
   Cache:         Default (No cache)
   Discard:       [Leave unchecked unless using thin provisioning]
   ```
   - **Note**: This is the OS disk. Data disk will be added separately.

7. **CPU Tab**:
   ```
   Sockets:    1
   Cores:      4
   Type:       host
   ```
   - **Type: host** provides best performance by exposing host CPU features

8. **Memory Tab**:
   ```
   Memory (MiB):  8192
   ```
   - ☐ **Ballooning** (disable for production workloads)
   - **Minimum memory**: Leave blank (ballooning disabled)

9. **Network Tab**:
   ```
   Bridge:      vmbr0
   VLAN Tag:    [Leave blank unless using VLANs]
   Model:       VirtIO (paravirtualized)
   ```
   - ☐ **Firewall** (optional, can enable later)
   - **MAC address**: Auto (leave blank)

10. **Confirm Tab**:
    - Review settings
    - ☐ **Start after created** (uncheck - we need to add data disk first)
    - Click **Finish**

## Step 2: Add Data Disk

The data disk will store Docker volumes, separating application data from the OS.

1. **Select your VM** from the left sidebar (e.g., `100 (supabase-prod)`)

2. **Navigate to**: Hardware tab

3. **Click "Add"** → **Hard Disk**

4. **Configure the data disk**:
   ```
   Bus/Device:    VirtIO Block (1)
   Storage:       local-lvm (or your storage pool)
   Disk size:     120 GiB
   Cache:         Default (No cache)
   Discard:       [Leave unchecked unless using thin provisioning]
   ```
   - **Note**: This will appear as `/dev/sdb` in the VM

5. **Click "Add"**

6. **Verify hardware configuration**:
   ```
   ✓ scsi0: 60GB OS disk
   ✓ scsi1: 120GB data disk
   ✓ net0: VirtIO network
   ✓ 4 CPU cores
   ✓ 8192 MB RAM
   ```

## Step 3: Install Ubuntu

1. **Start the VM**: Click "Start" button

2. **Open Console**: Click "Console" tab to see the VM display

3. **Ubuntu Installation**:
   - Select language: **English**
   - Keyboard configuration: **[Your layout]**
   - Installation type: **Ubuntu Server** (not the minimized version)

4. **Network Configuration**:
   - Accept DHCP configuration (or configure static IP if needed)
   - **Note IP address** for later SSH access

5. **Proxy Configuration**:
   - Leave blank (unless you use a proxy)

6. **Mirror Configuration**:
   - Accept defaults

7. **Storage Configuration**:
   - Storage layout: **Use an entire disk**
   - Select disk: **/dev/sda** (60GB OS disk)
   - ☑ **Set up this disk as an LVM group**
   - **Note**: Do NOT select /dev/sdb (data disk) - we'll mount it manually
   - Confirm destructive action: **Continue**

8. **Profile Setup**:
   ```
   Your name:      [Your name]
   Server name:    supabase-prod
   Username:       supabase (or your preferred username)
   Password:       [Secure password]
   ```

9. **SSH Setup**:
   - ☑ **Install OpenSSH server**
   - ☐ **Import SSH identity** (optional)

10. **Featured Server Snaps**:
    - ☐ **Leave all unchecked** (we'll install Docker manually)

11. **Installation Progress**:
    - Wait for installation to complete (5-10 minutes)
    - When prompted: **Reboot Now**

12. **First Boot**:
    - Remove installation media (Proxmox does this automatically)
    - Wait for system to boot
    - Login with your username/password
    - **Note the IP address**: `ip addr show` or `hostname -I`

## Step 4: Configure Static IP (Optional)

If you prefer a static IP over DHCP, configure netplan:

1. **SSH into the VM**:
   ```bash
   ssh supabase@<VM_IP>
   ```

2. **Edit netplan configuration**:
   ```bash
   sudo nano /etc/netplan/00-installer-config.yaml
   ```

3. **Example static IP configuration**:
   ```yaml
   network:
     version: 2
     renderer: networkd
     ethernets:
       ens18:
         addresses:
           - 192.168.0.50/24
         routes:
           - to: default
             via: 192.168.0.1
         nameservers:
           addresses:
             - 192.168.0.1
             - 8.8.8.8
   ```
   - **Note**: Interface name may be `ens18`, `ens19`, or similar. Check with `ip link show`.

4. **Apply configuration**:
   ```bash
   sudo netplan apply
   ```

5. **Verify**:
   ```bash
   ip addr show
   ping -c 3 edwardstech.dev
   ```

## Step 5: Run Setup Script

Now that the VM is installed, run the automated setup script to install Docker and configure storage.

1. **SSH into the VM** (from your workstation):
   ```bash
   ssh supabase@<VM_IP>
   ```

2. **Copy the setup script** from your project:
   ```bash
   # On your workstation (from the project root):
   scp production/vm-setup.sh supabase@<VM_IP>:~/
   ```

3. **Run the setup script**:
   ```bash
   # On the VM:
   chmod +x ~/vm-setup.sh
   sudo ./vm-setup.sh
   ```

4. **What the script does**:
   - ✓ Verifies Ubuntu 22.04 and /dev/sdb exists
   - ✓ Updates system packages
   - ✓ Formats /dev/sdb as ext4
   - ✓ Mounts /dev/sdb to /opt
   - ✓ Installs Docker Engine via get.docker.com
   - ✓ Configures Docker data-root to /opt/docker
   - ✓ Creates directory structure: /opt/supabase, /opt/caddy, /opt/backups
   - ✓ Clones Supabase Docker Compose files
   - ✓ Copies .env.example to .env

5. **Expected output**:
   ```
   [INFO] Starting pre-flight checks...
   [INFO] Pre-flight checks passed!
   [INFO] Updating system packages...
   [INFO] Configuring data disk (/dev/sdb)...
   [INFO] Installing Docker Engine...
   [INFO] Configuring Docker...
   [INFO] Creating directory structure...
   [INFO] Cloning Supabase Docker Compose files...
   [INFO] VM setup complete!

   Next steps:
     1. Log out and log back in for docker group to take effect
     2. Edit /opt/supabase/.env with your configuration
     3. Start Supabase: cd /opt/supabase && docker compose up -d
   ```

## Step 6: Verify Setup

After running the setup script, verify everything is configured correctly.

1. **Log out and log back in** (required for docker group):
   ```bash
   exit
   ssh supabase@<VM_IP>
   ```

2. **Verify Docker works without sudo**:
   ```bash
   docker --version
   docker compose version
   docker ps
   ```

   Expected output:
   ```
   Docker version 24.0.x, build xxxxxx
   Docker Compose version v2.x.x
   CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
   ```

3. **Verify data disk is mounted**:
   ```bash
   df -h /opt
   ```

   Expected output:
   ```
   Filesystem      Size  Used Avail Use% Mounted on
   /dev/sdb        118G  1.2G  111G   2% /opt
   ```

4. **Verify Supabase files exist**:
   ```bash
   ls -la /opt/supabase/
   ```

   Expected output:
   ```
   total XX
   drwxr-xr-x  5 root root 4096 Jan 29 10:00 .
   drwxr-xr-x  6 root root 4096 Jan 29 10:00 ..
   -rw-r--r--  1 root root XXXX Jan 29 10:00 docker-compose.yml
   -rw-r--r--  1 root root XXXX Jan 29 10:00 .env
   -rw-r--r--  1 root root XXXX Jan 29 10:00 .env.example
   drwxr-xr-x  2 root root 4096 Jan 29 10:00 volumes
   ...
   ```

5. **Verify Docker Compose configuration**:
   ```bash
   cd /opt/supabase
   docker compose config > /dev/null && echo "✓ docker-compose.yml is valid"
   ```

## Step 7: Configure DNS (After Caddy Deployment)

DNS configuration is handled after Caddy is deployed in plan 04-04. For now, just note the VM's IP address.

**Current VM IP**: `_____________` (fill this in)

**Domain configuration** (to be done later):
- `supabase.edwardstech.dev` → VM IP (A record)

## Troubleshooting

### Docker Permission Denied

**Symptom**:
```bash
$ docker ps
permission denied while trying to connect to the Docker daemon socket
```

**Solution**:
```bash
# Verify user is in docker group
groups

# If docker group is missing, add it
sudo usermod -aG docker $USER

# Log out completely and log back in
exit
ssh supabase@<VM_IP>

# Verify
docker ps
```

**Alternative** (if logout doesn't help):
```bash
newgrp docker
```

### /dev/sdb Not Found

**Symptom**:
```
[ERROR] /dev/sdb not found. Ensure a second disk is attached to the VM in Proxmox.
```

**Solution**:
1. Shut down the VM: `sudo poweroff`
2. In Proxmox UI: Select VM → Hardware → Verify second disk exists
3. If missing: Add → Hard Disk (VirtIO Block, 120GB)
4. Start VM and re-run setup script

### Network Configuration Issues

**Symptom**: Can't reach internet from VM

**Check DNS**:
```bash
cat /etc/resolv.conf
ping -c 3 8.8.8.8      # Test IP connectivity
ping -c 3 google.com    # Test DNS resolution
```

**Fix DNS** (if needed):
```bash
sudo nano /etc/netplan/00-installer-config.yaml
# Add nameservers section (see Step 4)
sudo netplan apply
```

### Docker Daemon Not Starting

**Symptom**:
```bash
$ docker ps
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution**:
```bash
# Check Docker service status
sudo systemctl status docker

# Start Docker if stopped
sudo systemctl start docker
sudo systemctl enable docker

# Check for errors
sudo journalctl -u docker -n 50
```

### Disk Not Mounting on Reboot

**Symptom**: After reboot, `/opt` is not mounted

**Solution**:
```bash
# Verify /etc/fstab entry
cat /etc/fstab | grep /opt

# Should contain:
# /dev/sdb /opt ext4 defaults 0 2

# Mount manually
sudo mount /opt

# Verify
df -h /opt
```

### Setup Script Fails During Docker Installation

**Symptom**: `get-docker.sh` fails with package errors

**Solution**:
```bash
# Update package index
sudo apt update

# Fix broken packages
sudo apt --fix-broken install

# Re-run setup script
sudo ./vm-setup.sh
```

## Next Steps

After completing this VM setup:

1. ✅ VM is running Ubuntu 22.04 LTS
2. ✅ Docker is installed and working
3. ✅ /opt is mounted on separate 120GB disk
4. ✅ Supabase Docker Compose files are in /opt/supabase

**Continue to**:
- `production/README.md` - Configure Supabase environment variables
- Plan 04-03 - Deploy Supabase Docker Compose stack
- Plan 04-04 - Configure Caddy reverse proxy and SSL

## References

- [Supabase Self-Hosting Documentation](https://supabase.com/docs/guides/self-hosting)
- [Supabase Docker Compose Guide](https://supabase.com/docs/guides/self-hosting/docker)
- [Docker Installation Guide](https://docs.docker.com/engine/install/ubuntu/)
- [Proxmox VE Documentation](https://pve.proxmox.com/pve-docs/)
