import * as core from '@actions/core'
import { findRpcUrl } from './find-rpc-url.ts'
import { resolveDeployerAddress } from './resolve-deployer-address.ts'
import { runCommand } from './run-command.ts'

export async function configureWallet(
  network: string,
  privateKey: string
): Promise<void> {
  const envsResult = await runCommand('sui', ['client', 'envs', '--json'])
  const rpcUrl = findRpcUrl(JSON.parse(envsResult.stdout), network)

  if (!rpcUrl) {
    throw new Error(
      `Could not resolve RPC URL from Sui config for network alias: ${network}. Expected one of the configured Sui environments (for this action: mainnet or testnet).`
    )
  }

  core.info('Importing private key...')
  const importResultRaw = await runCommand('sui', [
    'keytool',
    'import',
    privateKey,
    'ed25519',
    '--json',
  ])
  core.info(`Import result: ${importResultRaw.stdout}`)

  const deployerAddress = resolveDeployerAddress(JSON.parse(importResultRaw.stdout))

  if (!deployerAddress) {
    throw new Error('Failed to import deployer key or resolve deployer address')
  }

  core.info(
    `Imported deployer address: ${deployerAddress} with network ${network} (RPC: ${rpcUrl})`
  )

  await runCommand('sui', ['client', 'switch', '--env', network])
  await runCommand('sui', ['client', 'switch', '--address', deployerAddress])

  const activeAddressResult = await runCommand('sui', [
    'client',
    'active-address',
  ])
  const activeAddress = activeAddressResult.stdout
  core.info(`Sui active address: ${activeAddress}`)

  core.setOutput('rpc_url', rpcUrl)
  core.setOutput('active_address', activeAddress)
}
