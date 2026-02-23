FROM ubuntu:24.04

ARG KUBECTL_VERSION=v1.32.0
ARG KUBESEAL_VERSION=0.27.3
ARG FLUX_VERSION=2.4.0
ARG HELM_VERSION=v3.17.0

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl wget git openssh-server sudo ca-certificates \
    bash-completion vim nano \
    && rm -rf /var/lib/apt/lists/*

# kubectl
RUN curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && rm kubectl

# flux CLI
RUN curl -LO "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_linux_amd64.tar.gz" \
    && tar xfz flux_*.tar.gz \
    && install -m 755 flux /usr/local/bin/flux \
    && rm flux_*.tar.gz flux

# kubeseal
RUN curl -LO "https://github.com/bitnami-labs/sealed-secrets/releases/download/v${KUBESEAL_VERSION}/kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz" \
    && tar xfz kubeseal-*.tar.gz \
    && install -m 755 kubeseal /usr/local/bin/kubeseal \
    && rm -f kubeseal-*.tar.gz kubeseal README.md LICENSE

# helm
RUN curl -LO "https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz" \
    && tar xfz helm-*.tar.gz \
    && install -m 755 linux-amd64/helm /usr/local/bin/helm \
    && rm -rf helm-*.tar.gz linux-amd64

# dev user with passwordless sudo
RUN useradd -m -s /bin/bash -G sudo dev \
    && echo "dev ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# SSH setup
RUN mkdir /var/run/sshd \
    && sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config \
    && sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config \
    && sed -i 's/#PasswordAuthentication no/PasswordAuthentication no/' /etc/ssh/sshd_config

# kubectl bash completion
RUN echo 'source <(kubectl completion bash)' >> /home/dev/.bashrc \
    && echo 'source <(flux completion bash)' >> /home/dev/.bashrc \
    && echo 'source <(helm completion bash)' >> /home/dev/.bashrc

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22

ENTRYPOINT ["/entrypoint.sh"]
