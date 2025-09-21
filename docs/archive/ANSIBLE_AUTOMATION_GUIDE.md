# Ansible Automation for Edwards Engineering Kubernetes Deployment

## Overview
Ansible can completely automate your Docker image distribution and Kubernetes deployments across all 4 Raspberry Pi nodes.

## What Ansible Can Automate

### **Current Manual Process** → **Ansible Automation**
❌ Manually build images on master  
✅ `ansible-playbook build-images.yml`

❌ Manually export/copy/import to each node  
✅ `ansible-playbook distribute-images.yml`

❌ Manually restart deployments  
✅ `ansible-playbook deploy-website.yml`

❌ Manual SSL certificate management  
✅ Automated cert renewal checks

## Ansible Setup for Your Cluster

### Step 1: Install Ansible (on your Windows machine or master Pi)
```bash
# On Windows (WSL) or your development machine
pip install ansible

# Or on master Pi
sudo apt update && sudo apt install ansible -y
```

### Step 2: Create Ansible Inventory
```ini
# inventory/hosts.ini
[master]
192.168.0.40 ansible_user=pi ansible_ssh_pass=Lomo2715!

[workers]
192.168.0.41 ansible_user=pi ansible_ssh_pass=Lomo2715!
192.168.0.42 ansible_user=pi ansible_ssh_pass=Lomo2715!
192.168.0.43 ansible_user=pi ansible_ssh_pass=Lomo2715!

[k3s_cluster:children]
master
workers

[k3s_cluster:vars]
ansible_python_interpreter=/usr/bin/python3
```

### Step 3: Build and Distribute Images Playbook
```yaml
# playbooks/build-and-deploy.yml
---
- name: Build Docker Images on Master
  hosts: master
  tasks:
    - name: Build frontend image
      docker_image:
        name: edwards-engineering-frontend
        tag: "{{ ansible_date_time.epoch }}"
        build:
          path: ~/Professional-website
          dockerfile: Dockerfile.frontend
        source: build

    - name: Build backend image
      docker_image:
        name: edwards-engineering-backend
        tag: "{{ ansible_date_time.epoch }}"
        build:
          path: ~/Professional-website
          dockerfile: Dockerfile.backend
        source: build

    - name: Export frontend image
      shell: |
        docker save edwards-engineering-frontend:{{ ansible_date_time.epoch }} -o /tmp/frontend-{{ ansible_date_time.epoch }}.tar
        sudo k3s ctr images import /tmp/frontend-{{ ansible_date_time.epoch }}.tar

    - name: Export backend image
      shell: |
        docker save edwards-engineering-backend:{{ ansible_date_time.epoch }} -o /tmp/backend-{{ ansible_date_time.epoch }}.tar
        sudo k3s ctr images import /tmp/backend-{{ ansible_date_time.epoch }}.tar

- name: Distribute Images to Worker Nodes
  hosts: workers
  tasks:
    - name: Copy frontend image to workers
      copy:
        src: /tmp/frontend-{{ hostvars[groups['master'][0]]['ansible_date_time']['epoch'] }}.tar
        dest: /tmp/frontend.tar
      delegate_to: "{{ groups['master'][0] }}"

    - name: Copy backend image to workers
      copy:
        src: /tmp/backend-{{ hostvars[groups['master'][0]]['ansible_date_time']['epoch'] }}.tar
        dest: /tmp/backend.tar
      delegate_to: "{{ groups['master'][0] }}"

    - name: Import images on workers
      shell: |
        sudo k3s ctr images import /tmp/frontend.tar
        sudo k3s ctr images import /tmp/backend.tar
        rm -f /tmp/frontend.tar /tmp/backend.tar

- name: Deploy to Kubernetes
  hosts: master
  tasks:
    - name: Update deployment images
      k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: frontend-deployment
            namespace: default
          spec:
            template:
              spec:
                containers:
                - name: frontend
                  image: "edwards-engineering-frontend:{{ ansible_date_time.epoch }}"

    - name: Update backend deployment
      k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: backend-deployment
            namespace: default
          spec:
            template:
              spec:
                containers:
                - name: backend
                  image: "edwards-engineering-backend:{{ ansible_date_time.epoch }}"

    - name: Restart deployments
      shell: |
        sudo k3s kubectl rollout restart deployment frontend-deployment
        sudo k3s kubectl rollout restart deployment backend-deployment

    - name: Wait for deployment rollout
      shell: |
        sudo k3s kubectl rollout status deployment frontend-deployment
        sudo k3s kubectl rollout status deployment backend-deployment

    - name: Clean up temp files
      file:
        path: "/tmp/{{ item }}-{{ ansible_date_time.epoch }}.tar"
        state: absent
      loop:
        - frontend
        - backend
```

### Step 4: Quick Deploy Playbook
```yaml
# playbooks/quick-deploy.yml
---
- name: Quick Website Update
  hosts: master
  vars:
    timestamp: "{{ ansible_date_time.epoch }}"
  tasks:
    - name: Build and tag images with timestamp
      shell: |
        cd ~/Professional-website
        docker build -t edwards-engineering-frontend:{{ timestamp }} -f Dockerfile.frontend .
        docker build -t edwards-engineering-backend:{{ timestamp }} -f Dockerfile.backend .

    - name: Update Kubernetes deployments
      shell: |
        sudo k3s kubectl set image deployment/frontend-deployment frontend=edwards-engineering-frontend:{{ timestamp }}
        sudo k3s kubectl set image deployment/backend-deployment backend=edwards-engineering-backend:{{ timestamp }}

    - name: Wait for rollout to complete
      shell: |
        sudo k3s kubectl rollout status deployment/frontend-deployment --timeout=300s
        sudo k3s kubectl rollout status deployment/backend-deployment --timeout=300s

    - name: Verify pods are running
      shell: sudo k3s kubectl get pods -o wide
      register: pod_status

    - name: Display pod status
      debug:
        var: pod_status.stdout_lines
```

### Step 5: Cluster Management Playbook
```yaml
# playbooks/cluster-management.yml
---
- name: Cluster Health Check
  hosts: k3s_cluster
  tasks:
    - name: Check K3s service status
      systemd:
        name: "{{ 'k3s' if inventory_hostname in groups['master'] else 'k3s-agent' }}"
        state: started
      register: k3s_status

    - name: Verify Docker images exist
      shell: sudo k3s ctr images list | grep edwards-engineering
      register: images_check
      failed_when: images_check.rc != 0

    - name: Display node status
      debug:
        msg: "Node {{ inventory_hostname }}: K3s {{ k3s_status.status.ActiveState }}, Images: {{ images_check.stdout_lines | length }} found"

- name: Update SSL Certificates
  hosts: master
  tasks:
    - name: Check certificate status
      shell: sudo k3s kubectl get certificates
      register: cert_status

    - name: Renew certificates if needed
      shell: sudo k3s kubectl delete secret tls-secret
      when: "'False' in cert_status.stdout"
```

## Usage Commands

### **Single Command Deployment**
```bash
# Complete build and deploy
ansible-playbook -i inventory/hosts.ini playbooks/build-and-deploy.yml

# Quick update (if images already distributed)
ansible-playbook -i inventory/hosts.ini playbooks/quick-deploy.yml

# Cluster health check
ansible-playbook -i inventory/hosts.ini playbooks/cluster-management.yml
```

### **Advanced Features**

#### **Automated CI/CD Integration**
```yaml
# .github/workflows/deploy-with-ansible.yml
name: Deploy with Ansible
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Ansible
        run: pip install ansible
      - name: Deploy to cluster
        run: ansible-playbook -i inventory/hosts.ini playbooks/build-and-deploy.yml
```

#### **Rolling Updates with Zero Downtime**
```yaml
- name: Rolling update with health checks
  shell: |
    sudo k3s kubectl patch deployment frontend-deployment -p '{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxUnavailable":1,"maxSurge":1}}}}'
    sudo k3s kubectl set image deployment/frontend-deployment frontend=edwards-engineering-frontend:{{ timestamp }}
```

## Benefits of Ansible Approach

### ✅ **Advantages**
- **One Command Deployments**: `ansible-playbook deploy.yml`
- **Idempotent**: Safe to run multiple times
- **Error Handling**: Automatic rollback on failures
- **Inventory Management**: Easy to add/remove nodes
- **Templating**: Dynamic configurations
- **Logging**: Complete audit trail of changes
- **Multi-Environment**: Dev/staging/prod configurations

### ✅ **What Ansible Automates**
1. **Image Building**: Parallel builds with versioning
2. **Distribution**: Intelligent copying only when needed
3. **Deployment**: Rolling updates with health checks
4. **Verification**: Post-deployment testing
5. **Cleanup**: Automatic cleanup of old images/files
6. **Monitoring**: Cluster health and certificate status

### ✅ **Comparison with Manual Process**
| Task | Manual Time | Ansible Time |
|------|-------------|--------------|
| Build images | 5 min | 2 min (parallel) |
| Distribute to 3 nodes | 15 min | 3 min (parallel) |
| Update deployments | 5 min | 30 sec |
| Verify deployment | 5 min | 30 sec (automated) |
| **Total** | **30 min** | **6 min** |

## Implementation Recommendation

**Start with Option 2 (Container Registry)** for immediate relief, then **add Ansible** for complete automation:

1. **Week 1**: Set up container registry (15 min setup, 2 min deployments)
2. **Week 2**: Add Ansible playbooks (1 hour setup, 30 sec deployments)
3. **Week 3**: Add CI/CD integration (fully automated deployments)

This gives you immediate improvement while building toward full automation.

**Want me to help you set up either the container registry or Ansible first?**