export type PlatformSpec = {
  archiveSuffix:
    | 'ubuntu-x86_64'
    | 'ubuntu-aarch64'
    | 'macos-x86_64'
    | 'macos-arm64'
    | 'windows-x86_64'
  binaryName: string
}
