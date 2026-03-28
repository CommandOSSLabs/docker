import * as exec from '@actions/exec'

export async function runCommand(
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
