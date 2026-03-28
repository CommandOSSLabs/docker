import { SuiKeyImportSchema } from './schemas.ts'

export function resolveDeployerAddress(importRaw: unknown): string {
  const result = SuiKeyImportSchema.parse(importRaw)
  return result.suiAddress ?? result.address ?? ''
}
