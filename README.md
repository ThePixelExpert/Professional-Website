# Edwards Engineering Professional Website

**Live Site:** [https://edwardsengineering.org](https://edwardsengineering.org)

## Overview
React-based professional website running on a K3s Kubernetes cluster with automated CI/CD pipeline.

## Quick Start

### For Development
```bash
npm install
npm start
```
Opens [http://localhost:3000](http://localhost:3000) for local development.

### For Production Deployment
```bash
# Automated deployment (from cluster master node)
ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml
```

## Infrastructure
- **Platform:** 4-node Raspberry Pi K3s cluster  
- **Automation:** Ansible-based CI/CD pipeline
- **Container Registry:** Local Docker registry
- **SSL:** Let's Encrypt certificates
- **Load Balancing:** MetalLB across all nodes

## Documentation
- **[Infrastructure Guide](INFRASTRUCTURE_GUIDE.md)** - Complete system documentation
- **[Quick Reference](QUICK_REFERENCE.md)** - Essential commands and troubleshooting
- **[Container Registry Setup](CONTAINER_REGISTRY_SETUP.md)** - Registry configuration

## Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Express Backend │
│   (Port 3000)    │    │   (Port 3001)   │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
                     │
            ┌─────────────────┐
            │  K3s Cluster    │
            │  Load Balancer  │
            │  4 x RPi Nodes  │
            └─────────────────┘
                     │
              [edwardsengineering.org]
```

## Available Scripts

### Development
- `npm start` - Development server
- `npm test` - Test runner  
- `npm run build` - Production build
- `npm run eject` - Eject from Create React App

### Production
- Deployment handled automatically via Ansible
- Manual deployment commands available in [Quick Reference](QUICK_REFERENCE.md)

## Project Structure
```
├── src/                 # React frontend source
├── backend-options/     # Backend API services  
├── k8s/                # Kubernetes manifests
├── ansible/            # Deployment automation
├── public/             # Static assets
├── Dockerfile.frontend # Frontend container
├── Dockerfile.backend  # Backend container
└── nginx.conf         # Load balancer config
```

## Development Workflow
1. Make changes to source code
2. Test locally with `npm start`
3. Deploy with `ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml`
4. Verify at https://edwardsengineering.org

---

*Built with Create React App and deployed on Kubernetes*

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
