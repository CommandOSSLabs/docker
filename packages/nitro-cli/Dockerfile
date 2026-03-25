FROM amazonlinux:2023

# Install Nitro CLI dependencies
RUN dnf install -y \
    aws-nitro-enclaves-cli \
    aws-nitro-enclaves-cli-devel \
    docker \
    gzip \
    tar

WORKDIR /workspace
VOLUME [ "/workspace" ]

ENTRYPOINT [ "/usr/bin/nitro-cli" ]
