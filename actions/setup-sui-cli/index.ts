import os from 'node:os'
import path from 'node:path'
import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'

const SUPPORTED_NETWORKS = new Set(['mainnet', 'testnet'])

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }
type PlatformSpec = {
  archiveSuffix: string
  binaryName: string
}

async function runCommand(
  cmd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const result = await exec.getExecOutput(cmd, args, {
    silent: true,
    ignoreReturnCode: true,
  })

  if (result.exitCode !== 0) {
    throw new Error(
      `${cmd} ${args.join(' ')} failed with exit code ${result.exitCode}\n${result.stderr.trim()}`
    )
  }

  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  }
}

function parseJsonOrThrow(raw: string, context: string): JsonValue {
  try {
    return JSON.parse(raw) as JsonValue
  } catch {
    throw new Error(`${context} did not return valid JSON`)
  }
}

function findRpcUrl(envsJson: JsonValue, network: string): string {
  const stack: JsonValue[] = [envsJson]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) {
      continue
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        stack.push(item)
      }
      continue
    }

    if (typeof current === 'object') {
      const alias = (current as Record<string, JsonValue>).alias
      const rpc = (current as Record<string, JsonValue>).rpc
      if (alias === network && typeof rpc === 'string' && rpc.length > 0) {
        return rpc
      }

      for (const value of Object.values(current)) {
        stack.push(value)
      }
    }
  }

  return ''
}

function resolveDeployerAddress(importResult: JsonValue): string {
  if (!importResult || typeof importResult !== 'object') {
    return ''
  }

  const asRecord = importResult as Record<string, JsonValue>
  const direct = asRecord.suiAddress || asRecord.address
  if (typeof direct === 'string' && direct.length > 0) {
    return direct
  }

  if (Array.isArray(importResult)) {
    for (const item of importResult) {
      const candidate = resolveDeployerAddress(item)
      if (candidate) {
        return candidate
      }
    }
  }

  for (const value of Object.values(asRecord)) {
    if (value && typeof value === 'object') {
      const candidate = resolveDeployerAddress(value)
      if (candidate) {
        return candidate
      }
    }
  }

  return ''
}

function normalizeRunnerOs(): 'linux' | 'macos' | 'windows' {
  const runnerOs = (process.env.RUNNER_OS || process.platform).toLowerCase()

  if (runnerOs === 'linux') {
    return 'linux'
  }

  if (runnerOs === 'macos' || runnerOs === 'darwin') {
    return 'macos'
  }

  if (runnerOs === 'windows' || runnerOs === 'win32') {
    return 'windows'
  }

  throw new Error(
    `Unsupported RUNNER_OS: ${process.env.RUNNER_OS || process.platform}.`
  )
}

function normalizeRunnerArch(): 'x64' | 'arm64' {
  const runnerArch = (process.env.RUNNER_ARCH || process.arch).toLowerCase()

  if (runnerArch === 'x64') {
    return 'x64'
  }

  if (runnerArch === 'arm64') {
    return 'arm64'
  }

  throw new Error(
    `Unsupported RUNNER_ARCH: ${process.env.RUNNER_ARCH || process.arch}.`
  )
}

function resolvePlatformSpec(): PlatformSpec {
  const runnerOs = normalizeRunnerOs()
  const runnerArch = normalizeRunnerArch()

  if (runnerOs === 'linux' && runnerArch === 'x64') {
    return { archiveSuffix: 'ubuntu-x86_64', binaryName: 'sui' }
  }

  if (runnerOs === 'linux' && runnerArch === 'arm64') {
    return { archiveSuffix: 'ubuntu-aarch64', binaryName: 'sui' }
  }

  if (runnerOs === 'macos' && runnerArch === 'x64') {
    return { archiveSuffix: 'macos-x86_64', binaryName: 'sui' }
  }

  if (runnerOs === 'macos' && runnerArch === 'arm64') {
    return { archiveSuffix: 'macos-arm64', binaryName: 'sui' }
  }

  if (runnerOs === 'windows' && runnerArch === 'x64') {
    return { archiveSuffix: 'windows-x86_64', binaryName: 'sui.exe' }
  }

  throw new Error(`Unsupported runner combination: ${runnerOs}/${runnerArch}.`)
}

function buildReleaseArchiveName(version: string): string {
  const { archiveSuffix } = resolvePlatformSpec()
  return `sui-${version}-${archiveSuffix}.tgz`
}

async function ensureSuiInstalled(
  version: string,
  installDir: string,
  suiBinPath: string
): Promise<void> {
  const runnerOs = process.env.RUNNER_OS || process.platform
  const runnerArch = process.env.RUNNER_ARCH || process.arch
  const cacheKey = `sui-cli-${runnerOs}-${runnerArch}-${version}`

  try {
    await cache.restoreCache([suiBinPath], cacheKey)
    core.info(`Checked cache for key ${cacheKey}`)
  } catch (error) {
    core.warning(
      `Cache restore failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  let shouldInstall = true
  try {
    const { stdout } = await runCommand(suiBinPath, ['--version'])
    if (stdout.includes(version)) {
      core.info(`Using existing Sui CLI ${version}`)
      core.info(stdout)
      shouldInstall = false
    }
  } catch {
    shouldInstall = true
  }

  if (shouldInstall) {
    core.info(`Installing Sui CLI ${version}...`)
    const { binaryName } = resolvePlatformSpec()
    const archiveName = buildReleaseArchiveName(version)
    const url = `https://github.com/MystenLabs/sui/releases/download/${version}/${archiveName}`
    core.info(`Downloading release archive: ${url}`)

    const archivePath = await tc.downloadTool(url)
    const extractedPath = await tc.extractTar(archivePath)

    const downloadedSuiPath = path.join(extractedPath, binaryName)

    await io.mkdirP(installDir)
    await io.cp(downloadedSuiPath, suiBinPath, { force: true })

    if (normalizeRunnerOs() !== 'windows') {
      await exec.exec('chmod', ['0755', suiBinPath], { silent: true })
    }

    try {
      await cache.saveCache([suiBinPath], cacheKey)
      core.info(`Saved Sui CLI to cache key ${cacheKey}`)
    } catch (error) {
      core.warning(
        `Cache save skipped: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  await runCommand('sui', ['--version'])
  await runCommand('sui', ['client', '-y', 'active-env'])
}

async function configureWallet(
  network: string,
  privateKey: string
): Promise<void> {
  const envsResult = await runCommand('sui', ['client', 'envs', '--json'])
  const envsJson = parseJsonOrThrow(envsResult.stdout, 'sui client envs --json')
  const rpcUrl = findRpcUrl(envsJson, network)

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

  const importJson = parseJsonOrThrow(
    importResultRaw.stdout,
    'sui keytool import --json'
  )
  const deployerAddress = resolveDeployerAddress(importJson)

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
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
}
