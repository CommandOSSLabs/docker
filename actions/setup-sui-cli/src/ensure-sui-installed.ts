import path from 'node:path'
import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import {
  buildReleaseArchiveName,
  normalizeRunnerOs,
  resolvePlatformSpec,
} from './platform.ts'
import { runCommand } from './run-command.ts'

export async function ensureSuiInstalled(
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
