import { z } from 'zod'

export const SuiEnvEntrySchema = z
  .object({
    alias: z.string(),
    rpc: z.string(),
  })
  .loose()

export const SuiEnvsSchema = z.array(SuiEnvEntrySchema)

export const SuiKeyImportSchema = z
  .object({
    suiAddress: z.string().optional(),
    address: z.string().optional(),
  })
  .loose()
