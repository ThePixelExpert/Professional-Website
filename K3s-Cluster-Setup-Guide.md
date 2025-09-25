# K3s Raspberry Pi Cluster: Full Setup Guide

## 1. Prepare Raspberry Pi Nodes
- Flash Raspberry Pi OS Lite.
- Enable SSH: Place an empty file named `ssh` in the `/boot` partition.
- Boot and set static IPs (recommended).

## 2. Install K3s on the Master Node
```bash
curl -sfL https://get.k3s.io | sh -
# Check status
sudo kubectl get nodes
```
- For multi-node: Join agents using the token from `/var/lib/rancher/k3s/server/node-token`.

## 3. Install Docker Registry (on Pi or another node)
```bash
docker run -d -p 5000:5000 --restart=always --name registry registry:2
```
- Make registry accessible to your LAN.

## 4. Configure Docker on Your Build Machine
- Edit (or create) `daemon.json`:
  ```json
  {
    "insecure-registries": ["<REGISTRY_IP>:5000"]
  }
  ```
- Restart Docker Desktop.

## 5. Build and Push Images
```bash
docker build -t <REGISTRY_IP>:5000/your-image:tag .
docker push <REGISTRY_IP>:5000/your-image:tag
```

## 6. Install MetalLB (Load Balancer)
```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml
```
- Wait for pods to be running:
  ```bash
  kubectl -n metallb-system get pods
  ```

## 7. Configure MetalLB Address Pool
- Create `metallb-config.yaml`:
  ```yaml
  apiVersion: metallb.io/v1beta1
  kind: IPAddressPool
  metadata:
    name: my-ip-pool
    namespace: metallb-system
  spec:
    addresses:
    - 192.168.0.240-192.168.0.250  # Use unused LAN IPs

  ---
  apiVersion: metallb.io/v1beta1
  kind: L2Advertisement
  metadata:
    name: l2adv
    namespace: metallb-system
  ```
- Apply:
  ```bash
  kubectl apply -f metallb-config.yaml
  ```

## 8. Deploy Your App with LoadBalancer Services
- In your service YAMLs, set:
  ```yaml
  spec:
    type: LoadBalancer
    ports:
      - port: 80
        targetPort: 80
  ```
- Apply your manifests:
  ```bash
  kubectl apply -f k8s/frontend/deployment.yaml
  kubectl apply -f k8s/backend/deployment.yaml
  ```

## 9. Verify External Access
- Get external IPs:
  ```bash
  kubectl get svc
  ```
- Test from another machine:
  ```powershell
  Test-NetConnection <EXTERNAL-IP> -Port 80
  curl http://<EXTERNAL-IP>/
  ```

## 10. (Optional) Firewall/Port Checks
- On Pi:
  ```bash
  sudo netstat -tuln | grep -E '80|3001'
  sudo ufw status
  ```
- On your router: Ensure the MetalLB IP range is not blocked.

---

**Summary Checklist:**
- [x] K3s installed and running
- [x] Docker registry running and accessible
- [x] Docker configured for insecure registry
- [x] Images built and pushed
- [x] MetalLB installed and configured
- [x] Services set to `LoadBalancer`
- [x] External IPs assigned and ports open
