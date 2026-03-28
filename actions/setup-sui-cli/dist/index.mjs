import os from "node:os";
import path from "node:path";
import * as core from "@actions/core";
import * as io from "@actions/io";
import { z } from "zod";
import * as exec from "@actions/exec";
import * as cache from "@actions/cache";
import * as tc from "@actions/tool-cache";
//#region src/schemas.ts
const SuiEnvEntrySchema = z.object({
	alias: z.string(),
	rpc: z.string()
}).loose();
const SuiEnvsSchema = z.array(SuiEnvEntrySchema);
const SuiKeyImportSchema = z.object({
	suiAddress: z.string().optional(),
	address: z.string().optional()
}).loose();
//#endregion
//#region src/find-rpc-url.ts
function findRpcUrl(envsRaw, network) {
	return SuiEnvsSchema.parse(envsRaw).find((e) => e.alias === network)?.rpc ?? "";
}
//#endregion
//#region src/resolve-deployer-address.ts
function resolveDeployerAddress(importRaw) {
	const result = SuiKeyImportSchema.parse(importRaw);
	return result.suiAddress ?? result.address ?? "";
}
//#endregion
//#region src/run-command.ts
async function runCommand(cmd, args) {
	const result = await exec.getExecOutput(cmd, args, {
		silent: true,
		ignoreReturnCode: true
	});
	if (result.exitCode !== 0) throw new Error(`${cmd} ${args.join(" ")} failed with exit code ${result.exitCode}\n${result.stderr.trim()}`);
	return {
		stdout: result.stdout.trim(),
		stderr: result.stderr.trim()
	};
}
//#endregion
//#region src/configure-wallet.ts
async function configureWallet(network, privateKey) {
	const envsResult = await runCommand("sui", [
		"client",
		"envs",
		"--json"
	]);
	const rpcUrl = findRpcUrl(JSON.parse(envsResult.stdout), network);
	if (!rpcUrl) throw new Error(`Could not resolve RPC URL from Sui config for network alias: ${network}. Expected one of the configured Sui environments (for this action: mainnet or testnet).`);
	core.info("Importing private key...");
	const importResultRaw = await runCommand("sui", [
		"keytool",
		"import",
		privateKey,
		"ed25519",
		"--json"
	]);
	core.info(`Import result: ${importResultRaw.stdout}`);
	const deployerAddress = resolveDeployerAddress(JSON.parse(importResultRaw.stdout));
	if (!deployerAddress) throw new Error("Failed to import deployer key or resolve deployer address");
	core.info(`Imported deployer address: ${deployerAddress} with network ${network} (RPC: ${rpcUrl})`);
	await runCommand("sui", [
		"client",
		"switch",
		"--env",
		network
	]);
	await runCommand("sui", [
		"client",
		"switch",
		"--address",
		deployerAddress
	]);
	const activeAddress = (await runCommand("sui", ["client", "active-address"])).stdout;
	core.info(`Sui active address: ${activeAddress}`);
	core.setOutput("rpc_url", rpcUrl);
	core.setOutput("active_address", activeAddress);
}
//#endregion
//#region src/platform.ts
function normalizeRunnerOs() {
	const runnerOs = (process.env.RUNNER_OS || process.platform).toLowerCase();
	if (runnerOs === "linux") return "linux";
	if (runnerOs === "macos" || runnerOs === "darwin") return "macos";
	if (runnerOs === "windows" || runnerOs === "win32") return "windows";
	throw new Error(`Unsupported RUNNER_OS: ${process.env.RUNNER_OS || process.platform}.`);
}
function normalizeRunnerArch() {
	const runnerArch = (process.env.RUNNER_ARCH || process.arch).toLowerCase();
	if (runnerArch === "x64") return "x64";
	if (runnerArch === "arm64") return "arm64";
	throw new Error(`Unsupported RUNNER_ARCH: ${process.env.RUNNER_ARCH || process.arch}.`);
}
function resolvePlatformSpec() {
	const runnerOs = normalizeRunnerOs();
	const runnerArch = normalizeRunnerArch();
	if (runnerOs === "linux" && runnerArch === "x64") return {
		archiveSuffix: "ubuntu-x86_64",
		binaryName: "sui"
	};
	if (runnerOs === "linux" && runnerArch === "arm64") return {
		archiveSuffix: "ubuntu-aarch64",
		binaryName: "sui"
	};
	if (runnerOs === "macos" && runnerArch === "x64") return {
		archiveSuffix: "macos-x86_64",
		binaryName: "sui"
	};
	if (runnerOs === "macos" && runnerArch === "arm64") return {
		archiveSuffix: "macos-arm64",
		binaryName: "sui"
	};
	if (runnerOs === "windows" && runnerArch === "x64") return {
		archiveSuffix: "windows-x86_64",
		binaryName: "sui.exe"
	};
	throw new Error(`Unsupported runner combination: ${runnerOs}/${runnerArch}.`);
}
function buildReleaseArchiveName(version) {
	const { archiveSuffix } = resolvePlatformSpec();
	return `sui-${version}-${archiveSuffix}.tgz`;
}
//#endregion
//#region src/ensure-sui-installed.ts
async function ensureSuiInstalled(version, installDir, suiBinPath) {
	const cacheKey = `sui-cli-${process.env.RUNNER_OS || process.platform}-${process.env.RUNNER_ARCH || process.arch}-${version}`;
	try {
		await cache.restoreCache([suiBinPath], cacheKey);
		core.info(`Checked cache for key ${cacheKey}`);
	} catch (error) {
		core.warning(`Cache restore failed: ${error instanceof Error ? error.message : String(error)}`);
	}
	let shouldInstall = true;
	try {
		const { stdout } = await runCommand(suiBinPath, ["--version"]);
		if (stdout.includes(version)) {
			core.info(`Using existing Sui CLI ${version}`);
			core.info(stdout);
			shouldInstall = false;
		}
	} catch {
		shouldInstall = true;
	}
	if (shouldInstall) {
		core.info(`Installing Sui CLI ${version}...`);
		const { binaryName } = resolvePlatformSpec();
		const url = `https://github.com/MystenLabs/sui/releases/download/${version}/${buildReleaseArchiveName(version)}`;
		core.info(`Downloading release archive: ${url}`);
		const archivePath = await tc.downloadTool(url);
		const extractedPath = await tc.extractTar(archivePath);
		const downloadedSuiPath = path.join(extractedPath, binaryName);
		await io.mkdirP(installDir);
		await io.cp(downloadedSuiPath, suiBinPath, { force: true });
		if (normalizeRunnerOs() !== "windows") await exec.exec("chmod", ["0755", suiBinPath], { silent: true });
		try {
			await cache.saveCache([suiBinPath], cacheKey);
			core.info(`Saved Sui CLI to cache key ${cacheKey}`);
		} catch (error) {
			core.warning(`Cache save skipped: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	await runCommand("sui", ["--version"]);
	await runCommand("sui", [
		"client",
		"-y",
		"active-env"
	]);
}
//#endregion
//#region src/index.ts
const SUPPORTED_NETWORKS = new Set(["mainnet", "testnet"]);
async function main() {
	const network = core.getInput("network") || "testnet";
	const privateKey = core.getInput("private_key");
	const version = core.getInput("version") || "mainnet-v1.68.1";
	if (!version) throw new Error("version input is required");
	if (!SUPPORTED_NETWORKS.has(network)) throw new Error(`Unsupported network '${network}'. Supported values are: mainnet, testnet.`);
	const installDir = path.join(os.homedir(), ".local", "bin");
	const { binaryName } = resolvePlatformSpec();
	const suiBinPath = path.join(installDir, binaryName);
	await io.mkdirP(installDir);
	core.addPath(installDir);
	await ensureSuiInstalled(version, installDir, suiBinPath);
	if (privateKey) await configureWallet(network, privateKey);
	else core.warning("private_key input is empty; installed Sui CLI only and skipped wallet configuration.");
}
try {
	await main();
} catch (error) {
	core.setFailed(error instanceof Error ? error.message : String(error));
}
//#endregion
export {};
