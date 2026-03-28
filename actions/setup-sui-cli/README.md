# setup-sui-cli

Install a specific Sui CLI release and optionally configure a deployer wallet for a supported Sui network.

## Inputs

- `network`: Optional. Defaults to `testnet`. Supported values are `mainnet` and `testnet`.
- `private_key`: Optional. When omitted, the action only installs the CLI.
- `version`: Optional. Defaults to `mainnet-v1.68.1`. Override when a workflow needs a different Sui CLI release.

## Outputs

- `rpc_url`: Resolved RPC URL for the selected network.
- `active_address`: Imported address set as the active Sui address.

## Examples

Install only:

```yaml
- name: Set up Sui CLI
  uses: ./.github/actions/setup-sui-cli
```

Install and configure wallet:

```yaml
- name: Set up Sui CLI
  uses: ./.github/actions/setup-sui-cli
  with:
    network: testnet
    private_key: ${{ secrets.SUI_DEPLOYER_PRIVATE_KEY }}
```

Workflows using deployment environments such as `dev`, `staging`, and `production` should map them before calling this action.

## Notes

- If `private_key` is omitted, the action only installs the Sui CLI and does not set outputs.
- If `private_key` is provided, the action imports the key, switches environment and address, and sets `rpc_url` and `active_address`.
- If the requested version is already present at `~/.local/bin/sui`, the action reuses it.

## Development

- Runner requirements: supported GitHub runners with network access to `github.com/MystenLabs/sui` release artifacts. Current asset mapping covers Linux x64/arm64, macOS x64/arm64, and Windows x64.
- Source file: `index.ts`
- Bundled runtime file: `dist/index.js`
- Build command: `bun run build`
- Cache behavior: restores and saves the Sui binary with `@actions/cache` using runner OS, architecture, and version in the cache key.