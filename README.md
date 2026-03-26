# CommandOSS Docker Images

Collection of Docker images for CommandOSS projects.

## GitHub Actions: build and push packages

This repository includes two workflows:

- `.github/workflows/ci.yaml`: discovers package images on push and invokes publish.
- `.github/workflows/publish.yaml`: reusable/manual publish workflow with package selection.

Key behavior:

- Discovers all first-level folders in `packages/` containing a `Dockerfile`.
- Builds and pushes each package image to Docker Hub via a matrix job.
- Publishes multi-architecture images for `linux/amd64` and `linux/arm64`.
- Syncs each package README to Docker Hub by running `scripts/sync-dockerhub-readme.mjs`.

Manual publish:

- Run `.github/workflows/publish.yaml` via `workflow_dispatch`.
- Select which packages to deploy by toggling the boolean inputs (e.g., `deploy-nitro-cli`).

Expected image naming:

- `<DOCKERHUB_NAMESPACE>/<package-folder-name>:latest`
- `<DOCKERHUB_NAMESPACE>/<package-folder-name>:<git-sha>`

Required repository secrets:

- `DOCKERHUB_NAMESPACE` (for example: `cmdoss`)
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (PAT or token with push and repo-admin capabilities)

Optional repository secret:

- `DOCKERHUB_IDENTIFIER` (recommended when using org access tokens)