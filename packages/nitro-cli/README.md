# nitro-cli Package

Source repository: https://github.com/commandOSSLabs/docker

Containerized `nitro-cli` tooling for building and inspecting [AWS Nitro Enclave] EIF images.

This package wraps the Nitro Enclaves CLI in Docker Compose so you can:
- Build an EIF from a Docker image URI.
- Describe the generated EIF metadata.

## Upstream Repository

The original Nitro Enclaves CLI project is maintained by AWS:
- [aws/aws-nitro-enclaves-cli](https://github.com/aws/aws-nitro-enclaves-cli)

## Multi-Architecture Support

This container image is built to support multiple architectures:
- `x86_64` (amd64)
- `arm64` (aarch64)

Docker will automatically select the appropriate architecture for your platform. ARM64 support enables running the tooling on Apple Silicon (M1/M2/M3) and other ARM-based systems.

[AWS Nitro Enclave]: https://aws.amazon.com/ec2/nitro/nitro-enclaves/