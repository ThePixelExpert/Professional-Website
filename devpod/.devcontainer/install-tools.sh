#!/bin/bash
set -e

FLUX_VERSION=2.4.0
KUBESEAL_VERSION=0.27.3

echo "Installing flux CLI..."
curl -LO "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_linux_amd64.tar.gz"
tar xfz flux_${FLUX_VERSION}_linux_amd64.tar.gz
sudo install -m 755 flux /usr/local/bin/flux
rm -f flux_${FLUX_VERSION}_linux_amd64.tar.gz flux

echo "Installing kubeseal..."
curl -LO "https://github.com/bitnami-labs/sealed-secrets/releases/download/v${KUBESEAL_VERSION}/kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz"
tar xfz kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
rm -f kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz kubeseal README.md LICENSE

echo "All tools installed successfully"
