#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");
const cliDir = path.join(rootDir, "cli");
const bundleDir = path.join(rootDir, "bundle");
const pushEnabled = process.argv.includes("--push");

function run(command, args, options = {}) {
  const useCmdShim = process.platform === "win32" && ["npm", "npx"].includes(command);
  const executable = useCmdShim ? "cmd" : command;
  const finalArgs = useCmdShim ? ["/c", command, ...args] : args;

  const result = spawnSync(executable, finalArgs, {
    cwd: options.cwd || rootDir,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (result.error) {
    const rendered = [executable, ...finalArgs].join(" ");
    throw new Error(`Command failed to start: ${rendered}\n${result.error.message}`);
  }

  if (result.status !== 0) {
    const rendered = [command, ...args].join(" ");
    throw new Error(`Command failed (${result.status}): ${rendered}`);
  }
}

function runCapture(command, args, options = {}) {
  const useCmdShim = process.platform === "win32" && ["npm", "npx"].includes(command);
  const executable = useCmdShim ? "cmd" : command;
  const finalArgs = useCmdShim ? ["/c", command, ...args] : args;

  const result = spawnSync(executable, finalArgs, {
    cwd: options.cwd || rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    env: process.env,
    encoding: "utf8",
  });

  if (result.error) {
    const rendered = [executable, ...finalArgs].join(" ");
    throw new Error(`Command failed to start: ${rendered}\n${result.error.message}`);
  }

  if (result.status !== 0) {
    const rendered = [command, ...args].join(" ");
    throw new Error(`Command failed (${result.status}): ${rendered}\n${result.stderr || ""}`);
  }

  return result.stdout.trim();
}

function ensureExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${description}: ${filePath}`);
  }
}

function resetDirectory(targetDir) {
  for (const entry of fs.readdirSync(targetDir)) {
    if (entry === ".git") {
      continue;
    }

    fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
  }
}

function copyDir(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function hasStagedChanges(cwd) {
  const output = runCapture("git", ["diff", "--cached", "--name-only"], { cwd });
  return output.length > 0;
}

function resolveGitIdentity() {
  let name = "";
  let email = "";

  try {
    name = runCapture("git", ["config", "--get", "user.name"]);
    email = runCapture("git", ["config", "--get", "user.email"]);
  } catch {
    // If identity is missing, commits may fail and surface a clear git error.
  }

  return { name, email };
}

function commitIfNeeded(cwd, message, identity) {
  run("git", ["add", "-A"], { cwd });

  if (!hasStagedChanges(cwd)) {
    console.log(`No changes to commit in ${cwd}`);
    return false;
  }

  const args = [];
  if (identity.name) {
    args.push("-c", `user.name=${identity.name}`);
  }
  if (identity.email) {
    args.push("-c", `user.email=${identity.email}`);
  }

  args.push("commit", "-m", message);
  run("git", args, { cwd });
  return true;
}

function main() {
  ensureExists(path.join(rootDir, ".git"), "superproject git directory");
  ensureExists(backendDir, "backend submodule");
  ensureExists(frontendDir, "frontend submodule");
  ensureExists(cliDir, "cli submodule");
  ensureExists(bundleDir, "bundle submodule");

  const identity = resolveGitIdentity();

  console.log("Updating backend/frontend/cli submodules to branch tips...");
  run("git", ["submodule", "update", "--init", "--remote", "backend", "frontend", "cli"], { cwd: rootDir });

  console.log("Building frontend...");
  run("npm", ["install"], { cwd: frontendDir });
  run("npx", ["ng", "build"], { cwd: frontendDir });

  const distDir = path.join(frontendDir, "dist", "snip-frontend", "browser");
  const distIndex = path.join(distDir, "index.html");
  ensureExists(distIndex, "frontend build output (dist/snip-frontend/browser/index.html)");

  console.log("Assembling bundle submodule...");
  resetDirectory(bundleDir);

  fs.copyFileSync(path.join(backendDir, "server.js"), path.join(bundleDir, "server.js"));
  fs.copyFileSync(path.join(cliDir, "cli.js"), path.join(bundleDir, "cli.js"));
  copyDir(distDir, path.join(bundleDir, "public"));

  writeText(path.join(bundleDir, ".env"), "PUBLIC_DIR=./public\n");
  writeText(
    path.join(bundleDir, "package.json"),
    JSON.stringify(
      {
        name: "snip-bundle",
        private: true,
        scripts: {
          start: "bun server.js",
        },
      },
      null,
      2,
    ) + "\n",
  );

  writeText(
    path.join(bundleDir, "Dockerfile"),
    [
      "FROM oven/bun:1-alpine",
      "WORKDIR /app",
      "COPY . .",
      "ENV PORT=3000",
      "EXPOSE 3000",
      "CMD [\"bun\", \"server.js\"]",
      "",
    ].join("\n"),
  );

  writeText(
    path.join(bundleDir, ".dockerignore"),
    [
      ".git",
      ".gitignore",
      "node_modules",
      "npm-debug.log",
      "",
    ].join("\n"),
  );

  writeText(
    path.join(bundleDir, "railway.json"),
    JSON.stringify(
      {
        build: {
          builder: "DOCKERFILE",
          dockerfilePath: "Dockerfile",
        },
      },
      null,
      2,
    ) + "\n",
  );

  const bundleCommitted = commitIfNeeded(bundleDir, "Generate bundle output", identity);

  run("git", ["add", "backend", "frontend", "cli", "bundle"], { cwd: rootDir });
  const rootChanged = hasStagedChanges(rootDir);

  if (!rootChanged) {
    console.log("Superproject unchanged.");
  } else {
    const rootArgs = [];
    if (identity.name) {
      rootArgs.push("-c", `user.name=${identity.name}`);
    }
    if (identity.email) {
      rootArgs.push("-c", `user.email=${identity.email}`);
    }
    rootArgs.push("commit", "-m", "Bump submodule pointers after bundle build");
    run("git", rootArgs, { cwd: rootDir });

    if (pushEnabled) {
      console.log("Will push main after bundle push.");
    }
  }

  if (pushEnabled) {
    console.log("Pushing bundle branch...");
    run("git", ["push", "origin", "HEAD:bundle"], { cwd: bundleDir });
    console.log("Pushing main branch...");
    run("git", ["push", "origin", "main"], { cwd: rootDir });
  }

  if (!bundleCommitted && !rootChanged) {
    console.log("unchanged");
  }
}

main();
