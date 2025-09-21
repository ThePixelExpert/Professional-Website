# Complete Fresh K3s Cluster Setup Guide

## Prerequisites
- 4 fresh Raspberry Pi OS installations
- SSH enabled on all Pis
- Network connectivity verified

## IP Address Plan
- Master: 192.168.0.40 (raspberrypi)
- Worker 1: 192.168.0.41 (node1)
- Worker 2: 192.168.0.42 (node2)
- Worker 3: 192.168.0.43 (node3)

---

## Phase 1: Basic Pi Configuration

### On ALL 4 Nodes (Master + Workers)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Enable container features for K3s
echo 'cgroup_enable=cpuset cgroup_memory=1 cgroup_enable=memory' | sudo tee -a /boot/firmware/cmdline.txt

# Install Docker for registry/image building
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker pi

# Reboot for cgroup changes
sudo reboot
```

---

## Phase 2: K3s Cluster Installation

### Master Node (192.168.0.40)
```bash
# Install K3s master
curl -sfL https://get.k3s.io | sh -

# Wait for startup
sleep 30

# Verify master is ready
sudo k3s kubectl get nodes
sudo k3s kubectl get pods -A

# Get join token for workers
sudo cat /var/lib/rancher/k3s/server/node-token
```

### Worker Nodes (192.168.0.41, 192.168.0.42, 192.168.0.43)
```bash
# Replace <TOKEN> with actual token from master
curl -sfL https://get.k3s.io | K3S_URL=https://192.168.0.40:6443 K3S_TOKEN=<TOKEN> sh -
```

### Verify Cluster
```bash
# On master node
sudo k3s kubectl get nodes -o wide
# Should show all 4 nodes as Ready
```

---

## Phase 3: Container Registry Setup

### On Master Node (192.168.0.40)
```bash
# Set up local registry
docker run -d -p 5000:5000 --restart=always --name registry registry:2

# Verify registry is running
curl http://localhost:5000/v2/_catalog
```

### Configure Registry on ALL Nodes
```bash
# On Master
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "192.168.0.40:5000":
    endpoint:
      - "http://192.168.0.40:5000"
configs:
  "192.168.0.40:5000":
    tls:
      insecure_skip_verify: true
EOF
sudo systemctl restart k3s

# On Each Worker
for node in 192.168.0.41 192.168.0.42 192.168.0.43; do
  ssh pi@$node 'sudo mkdir -p /etc/rancher/k3s'
  ssh pi@$node 'sudo tee /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "192.168.0.40:5000":
    endpoint:
      - "http://192.168.0.40:5000"
configs:
  "192.168.0.40:5000":
    tls:
      insecure_skip_verify: true
EOF'
  ssh pi@$node 'sudo systemctl restart k3s-agent'
done
```

### Test Registry
```bash
# Build and push test image
docker pull alpine:latest
docker tag alpine:latest 192.168.0.40:5000/alpine:latest
docker push 192.168.0.40:5000/alpine:latest
curl http://localhost:5000/v2/_catalog
```

---

## Phase 4: Install Monitoring Stack (Prometheus + Grafana)

### Create Monitoring Namespace
```bash
sudo k3s kubectl create namespace monitoring
```

### Deploy Prometheus ConfigMap
```bash
sudo k3s kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - source_labels: [__address__]
        regex: '(.*):10250'
        target_label: __address__
        replacement: '${1}:9100'
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
    - job_name: 'edwards-engineering-frontend'
      static_configs:
      - targets: ['frontend-service.default.svc.cluster.local:80']
    - job_name: 'edwards-engineering-backend'
      static_configs:
      - targets: ['backend-service.default.svc.cluster.local:3001']
EOF
```

### Build and Push Monitoring Images
```bash
# Pull and push to local registry
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest
docker pull prom/node-exporter:latest

docker tag prom/prometheus:latest 192.168.0.40:5000/prometheus:latest
docker tag grafana/grafana:latest 192.168.0.40:5000/grafana:latest
docker tag prom/node-exporter:latest 192.168.0.40:5000/node-exporter:latest

docker push 192.168.0.40:5000/prometheus:latest
docker push 192.168.0.40:5000/grafana:latest
docker push 192.168.0.40:5000/node-exporter:latest
```

### Deploy Monitoring Stack
```bash
sudo k3s kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: 192.168.0.40:5000/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        args:
          - '--config.file=/etc/prometheus/prometheus.yml'
          - '--storage.tsdb.retention.time=15d'
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: config
        configMap:
          name: prometheus-config
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus-service
  namespace: monitoring
spec:
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090
    nodePort: 30090
  type: NodePort
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: 192.168.0.40:5000/grafana:latest
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: "admin123"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "300m"
---
apiVersion: v1
kind: Service
metadata:
  name: grafana-service
  namespace: monitoring
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000
    nodePort: 30300
  type: NodePort
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      containers:
      - name: node-exporter
        image: 192.168.0.40:5000/node-exporter:latest
        ports:
        - containerPort: 9100
        args:
          - '--path.rootfs=/host'
        volumeMounts:
        - name: root
          mountPath: /host
          readOnly: true
      volumes:
      - name: root
        hostPath:
          path: /
EOF
```

### Verify Monitoring Stack
```bash
sudo k3s kubectl get pods -n monitoring -o wide
# Access Grafana: http://192.168.0.40:30300 (admin/admin123)
# Access Prometheus: http://192.168.0.40:30090
```

---

## Phase 5: Deploy Edwards Engineering Website with Load Balancing

### Copy Deployment Files to Master
```bash
# From Windows machine, copy to master Pi
scp -r . pi@192.168.0.40:~/Professional-website/
```

### Build and Push Website Images
```bash
cd ~/Professional-website

# Build with registry tags
docker build -t 192.168.0.40:5000/edwards-engineering-frontend:latest -f Dockerfile.frontend .
docker build -t 192.168.0.40:5000/edwards-engineering-backend:latest -f Dockerfile.backend .

# Push to registry
docker push 192.168.0.40:5000/edwards-engineering-frontend:latest
docker push 192.168.0.40:5000/edwards-engineering-backend:latest
```

### Update Deployment Files for Registry
```bash
# Update frontend deployment
sed -i 's|image: edwards-engineering-frontend:latest|image: 192.168.0.40:5000/edwards-engineering-frontend:latest|g' k8s/frontend/deployment.yaml
sed -i 's|imagePullPolicy: Never|imagePullPolicy: Always|g' k8s/frontend/deployment.yaml

# Update backend deployment  
sed -i 's|image: edwards-engineering-backend:latest|image: 192.168.0.40:5000/edwards-engineering-backend:latest|g' k8s/backend/deployment.yaml
sed -i 's|imagePullPolicy: Never|imagePullPolicy: Always|g' k8s/backend/deployment.yaml
```

### Deploy with Load Balancing
```bash
# Apply deployments
sudo k3s kubectl apply -f k8s/

# Scale for load balancing (6 frontend, 4 backend like before)
sudo k3s kubectl scale deployment frontend-deployment --replicas=6
sudo k3s kubectl scale deployment backend-deployment --replicas=4

# Verify distribution across nodes
sudo k3s kubectl get pods -o wide
```

### Verify Website
```bash
curl -I http://192.168.0.40
# Should see Edwards Engineering website
```

---

## Phase 6: Deploy Pi-hole and Unbound

### Create DNS Namespace
```bash
sudo k3s kubectl create namespace dns
```

### Build and Push Pi-hole Images
```bash
# Pull and push Pi-hole images
docker pull pihole/pihole:latest
docker pull mvance/unbound:latest

docker tag pihole/pihole:latest 192.168.0.40:5000/pihole:latest
docker tag mvance/unbound:latest 192.168.0.40:5000/unbound:latest

docker push 192.168.0.40:5000/pihole:latest
docker push 192.168.0.40:5000/unbound:latest
```

### Deploy Unbound (Recursive DNS)
```bash
sudo k3s kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: unbound-config
  namespace: dns
data:
  unbound.conf: |
    server:
        verbosity: 0
        interface: 0.0.0.0
        port: 53
        do-ip4: yes
        do-udp: yes
        do-tcp: yes
        do-ip6: no
        prefer-ip6: no
        harden-glue: yes
        harden-dnssec-stripped: yes
        use-caps-for-id: no
        edns-buffer-size: 1232
        prefetch: yes
        num-threads: 1
        so-rcvbuf: 1m
        private-address: 192.168.0.0/16
        private-address: 169.254.0.0/16
        private-address: 172.16.0.0/12
        private-address: 10.0.0.0/8
        access-control: 127.0.0.1/32 allow
        access-control: 192.168.0.0/16 allow
        access-control: 172.16.0.0/12 allow
        access-control: 10.0.0.0/8 allow
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unbound
  namespace: dns
spec:
  replicas: 2
  selector:
    matchLabels:
      app: unbound
  template:
    metadata:
      labels:
        app: unbound
    spec:
      containers:
      - name: unbound
        image: 192.168.0.40:5000/unbound:latest
        ports:
        - containerPort: 53
          protocol: UDP
        - containerPort: 53
          protocol: TCP
        volumeMounts:
        - name: config
          mountPath: /opt/unbound/etc/unbound/unbound.conf
          subPath: unbound.conf
      volumes:
      - name: config
        configMap:
          name: unbound-config
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values: ["unbound"]
              topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: unbound-service
  namespace: dns
spec:
  selector:
    app: unbound
  ports:
  - port: 53
    targetPort: 53
    protocol: UDP
    name: dns-udp
  - port: 53
    targetPort: 53
    protocol: TCP
    name: dns-tcp
  type: ClusterIP
EOF
```

### Deploy Pi-hole
```bash
sudo k3s kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pihole
  namespace: dns
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pihole
  template:
    metadata:
      labels:
        app: pihole
    spec:
      containers:
      - name: pihole
        image: 192.168.0.40:5000/pihole:latest
        ports:
        - containerPort: 80
        - containerPort: 53
          protocol: UDP
        - containerPort: 53
          protocol: TCP
        env:
        - name: TZ
          value: "Europe/London"
        - name: WEBPASSWORD
          value: "admin123"
        - name: PIHOLE_DNS_
          value: "unbound-service.dns.svc.cluster.local#53"
        - name: DNSMASQ_LISTENING
          value: "all"
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values: ["pihole"]
              topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: pihole-service
  namespace: dns
spec:
  selector:
    app: pihole
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
    name: web
  - port: 53
    targetPort: 53
    protocol: UDP
    nodePort: 30053
    name: dns-udp
  - port: 53
    targetPort: 53
    protocol: TCP
    name: dns-tcp
  type: NodePort
EOF
```

### Verify DNS Stack
```bash
sudo k3s kubectl get pods -n dns -o wide
# Access Pi-hole: http://192.168.0.40:30080/admin (password: admin123)
```

---

## Phase 7: Ansible Automation Setup

### Install Ansible on Master Node
```bash
sudo apt update
sudo apt install -y ansible

# Create Ansible directory
mkdir -p ~/ansible/playbooks
cd ~/ansible
```

### Create Inventory
```bash
tee inventory.yml <<EOF
all:
  children:
    masters:
      hosts:
        192.168.0.40:
          ansible_user: pi
    workers:
      hosts:
        192.168.0.41:
          ansible_user: pi
        192.168.0.42:
          ansible_user: pi
        192.168.0.43:
          ansible_user: pi
    cluster:
      children:
        masters:
        workers:
EOF
```

### Create Complete Deployment Playbook
```bash
tee playbooks/deploy-full-stack.yml <<EOF
---
- name: Deploy Complete K3s Stack
  hosts: masters
  become: yes
  tasks:
    - name: Apply all Kubernetes manifests
      k8s:
        state: present
        definition: "{{ item }}"
      loop:
        - "{{ lookup('file', '~/Professional-website/k8s/frontend/deployment.yaml') | from_yaml_all | list }}"
        - "{{ lookup('file', '~/Professional-website/k8s/backend/deployment.yaml') | from_yaml_all | list }}"
        - "{{ lookup('file', '~/Professional-website/k8s/frontend/service.yaml') | from_yaml_all | list }}"
        - "{{ lookup('file', '~/Professional-website/k8s/backend/service.yaml') | from_yaml_all | list }}"
        - "{{ lookup('file', '~/Professional-website/k8s/ingress.yaml') | from_yaml_all | list }}"
      
    - name: Scale deployments for load balancing
      k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ item.name }}"
            namespace: default
          spec:
            replicas: "{{ item.replicas }}"
      loop:
        - { name: frontend-deployment, replicas: 6 }
        - { name: backend-deployment, replicas: 4 }

    - name: Wait for deployments to be ready
      k8s_info:
        api_version: apps/v1
        kind: Deployment
        name: "{{ item }}"
        namespace: default
        wait_condition:
          type: Available
          status: "True"
        wait_timeout: 300
      loop:
        - frontend-deployment
        - backend-deployment
EOF
```

### Test Ansible
```bash
# Test connectivity
ansible all -i inventory.yml -m ping

# Run deployment playbook
ansible-playbook -i inventory.yml playbooks/deploy-full-stack.yml
```

---

## Verification Commands

### Check All Services
```bash
# K3s cluster status
sudo k3s kubectl get nodes -o wide
sudo k3s kubectl get pods -A -o wide

# Website accessibility
curl -I http://192.168.0.40

# Monitoring stack
curl -I http://192.168.0.40:30300  # Grafana
curl -I http://192.168.0.40:30090  # Prometheus

# DNS stack
curl -I http://192.168.0.40:30080  # Pi-hole admin

# Registry
curl http://192.168.0.40:5000/v2/_catalog
```

### Load Balancing Verification
```bash
# Check pod distribution
sudo k3s kubectl get pods -o wide | grep frontend
sudo k3s kubectl get pods -o wide | grep backend

# Should see pods distributed across all 4 nodes
```

---

## Access URLs Summary

- **Edwards Engineering Website**: http://192.168.0.40
- **Grafana Monitoring**: http://192.168.0.40:30300 (admin/admin123)
- **Prometheus Metrics**: http://192.168.0.40:30090
- **Pi-hole Admin**: http://192.168.0.40:30080/admin (admin123)
- **Container Registry**: http://192.168.0.40:5000/v2/_catalog

## Final Status

When complete, you'll have:
✅ **4-node K3s cluster** with load balancing  
✅ **Container registry** for image management  
✅ **Monitoring stack** (Prometheus + Grafana)  
✅ **Edwards Engineering website** with 6 frontend + 4 backend replicas  
✅ **DNS filtering** (Pi-hole + Unbound)  
✅ **Ansible automation** for easy redeployments  

Total deployment time: ~45-60 minutes for complete stack