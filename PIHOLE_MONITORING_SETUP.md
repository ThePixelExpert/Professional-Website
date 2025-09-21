# Pi-hole Monitoring Setup

## Overview
Monitor dedicated Pi-hole Pi using existing Prometheus + Grafana on K3s cluster.

## On Pi-hole Pi (192.168.0.45)

### 1. Install Node Exporter
```bash
# Download and install node_exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-armv7.tar.gz
tar xvfz node_exporter-1.6.1.linux-armv7.tar.gz
sudo mv node_exporter-1.6.1.linux-armv7/node_exporter /usr/local/bin/
sudo useradd --no-create-home --shell /bin/false node_exporter
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

### 2. Install Pi-hole Exporter (Optional)
```bash
# For Pi-hole specific metrics
docker run -d \
  --name pihole_exporter \
  -p 9617:9617 \
  -e PIHOLE_HOSTNAME=localhost \
  -e PIHOLE_PASSWORD=admin123 \
  ekofr/pihole-exporter:latest
```

## On K3s Cluster

### 3. Update Prometheus Configuration
Add to Prometheus scrape configs:
```yaml
- job_name: 'pihole-pi-system'
  static_configs:
  - targets: ['192.168.0.45:9100']  # Node Exporter

- job_name: 'pihole-metrics'
  static_configs:
  - targets: ['192.168.0.45:9617']  # Pi-hole Exporter
```

### 4. Grafana Dashboards
- Import Node Exporter dashboard (ID: 1860)
- Import Pi-hole dashboard (ID: 10176)

## Benefits
- Centralized monitoring in existing Grafana
- Pi-hole DNS query statistics
- System health monitoring (CPU, RAM, disk)
- No duplicate monitoring infrastructure