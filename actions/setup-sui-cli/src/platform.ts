import type { PlatformSpec } from './types.ts'

export function normalizeRunnerOs(): 'linux' | 'macos' | 'windows' {
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

export function normalizeRunnerArch(): 'x64' | 'arm64' {
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

export function resolvePlatformSpec(): PlatformSpec {
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

export function buildReleaseArchiveName(version: string): string {
  const { archiveSuffix } = resolvePlatformSpec()
  return `sui-${version}-${archiveSuffix}.tgz`
}
