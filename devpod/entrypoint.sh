#!/bin/bash
set -e

# Inject SSH public key from environment variable
if [ -n "$SSH_PUBLIC_KEY" ]; then
    mkdir -p /home/dev/.ssh
    echo "$SSH_PUBLIC_KEY" > /home/dev/.ssh/authorized_keys
    chmod 700 /home/dev/.ssh
    chmod 600 /home/dev/.ssh/authorized_keys
    chown -R dev:dev /home/dev/.ssh
    echo "SSH public key installed for user: dev"
else
    echo "WARNING: No SSH_PUBLIC_KEY set - you won't be able to SSH in"
fi

# Ensure .kube dir exists for the mounted kubeconfig
mkdir -p /home/dev/.kube
chown -R dev:dev /home/dev/.kube

exec /usr/sbin/sshd -D
