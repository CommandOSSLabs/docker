import * as core from '@actions/core'
import { main } from './src/main.ts'

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
}
