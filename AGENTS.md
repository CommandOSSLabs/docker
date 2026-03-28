# AGENTS.md

## Project Overview

- Monorepo with independent tools under packages.

## Setup Commands

WIP

## Build and Smoke Test Commands

WIP

## Code Style and Change Scope

- Keep changes scoped to one package unless a cross-cutting workflow change is required.
- Prefer minimal edits; avoid broad reformatting of config or generated files.
- When adding a package, follow existing layout:
  - packages/<name>/README.md
- When developing JavaScript or TypeScript GitHub Actions, prefer GitHub Actions toolkit packages whenever possible.
- For GitHub Actions, use toolkit primitives such as `@actions/core`, `@actions/exec`, `@actions/io`, `@actions/tool-cache`, and `@actions/cache` instead of custom wrappers when the toolkit already covers the behavior.
- If an action bundles a committed runtime artifact, regenerate and verify the checked-in bundle after source changes.

## Architecture and Key Files

WIP

## CI and Release Conventions

- Multi-architecture image publishing is required:
  - linux/amd64
  - linux/arm64
- If release to Docker Hub, README sync source of truth is required.

## References

- Root overview: README.md
- Packages: packages/*/README.md
