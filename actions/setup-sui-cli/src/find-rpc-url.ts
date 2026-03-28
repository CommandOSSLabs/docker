import { SuiEnvsSchema } from './schemas.ts'

export function findRpcUrl(envsRaw: unknown, network: string): string {
  const envs = SuiEnvsSchema.parse(envsRaw)
  return envs.find((e) => e.alias === network)?.rpc ?? ''
}
