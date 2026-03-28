import os from 'node:os'
import path from 'node:path'
import * as core from '@actions/core'
import * as io from '@actions/io'
import { configureWallet } from './configure-wallet.ts'
import { ensureSuiInstalled } from './ensure-sui-installed.ts'
import { resolvePlatformSpec } from './platform.ts'

const SUPPORTED_NETWORKS = new Set(['mainnet', 'testnet'])

async function main(): Promise<void> {
  const network = core.getInput('network') || 'testnet'
  const privateKey = core.getInput('private_key')
  const version = core.getInput('version') || 'mainnet-v1.68.1'

  if (!version) {
    throw new Error('version input is required')
  }

  if (!SUPPORTED_NETWORKS.has(network)) {
    throw new Error(
      `Unsupported network '${network}'. Supported values are: mainnet, testnet.`
    )
  }

  const installDir = path.join(os.homedir(), '.local', 'bin')
  const { binaryName } = resolvePlatformSpec()
  const suiBinPath = path.join(installDir, binaryName)

  await io.mkdirP(installDir)
  core.addPath(installDir)

  await ensureSuiInstalled(version, installDir, suiBinPath)

  if (privateKey) {
    await configureWallet(network, privateKey)
  } else {
    core.warning(
      'private_key input is empty; installed Sui CLI only and skipped wallet configuration.'
    )
  }
}

try {
  await main()
} catch (error) {
  core.setFailed(error instanceof Error ? error.message : String(error))
}
