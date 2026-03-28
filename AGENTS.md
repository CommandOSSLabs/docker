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
