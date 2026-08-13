#!/usr/bin/env node

const { spawn } = require("node:child_process");

const BASE_URL = (process.env.SNIP_API || "http://localhost:3000").replace(/\/$/, "");

function usage() {
  console.log(`Snip CLI

Usage:
  snip add <url>    Create a short link and print shortUrl
  snip ls           List links as code / hits / url
  snip open <code>  Resolve code and open redirect target in browser
  snip help         Show this help

Environment:
  SNIP_API          Backend base URL (default: http://localhost:3000)`);
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function request(pathname, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${pathname}`, options);
  } catch {
    fail(`Could not reach backend at ${BASE_URL}`);
  }
  return response;
}

function pad(text, width) {
  const value = String(text);
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

async function cmdAdd(args) {
  const url = args[0];
  if (!url || !isHttpUrl(url)) {
    fail("Usage: snip add <http(s)-url>");
  }

  const response = await request("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    // noop
  }

  if (!response.ok) {
    fail(data.error || `Request failed with status ${response.status}`);
  }

  if (!data.shortUrl) {
    fail("Backend response did not include shortUrl");
  }

  console.log(data.shortUrl);
}

async function cmdLs() {
  const response = await request("/api/links");

  let links = [];
  try {
    links = await response.json();
  } catch {
    fail("Invalid response from backend");
  }

  if (!response.ok) {
    const msg = links && links.error ? links.error : `Request failed with status ${response.status}`;
    fail(msg);
  }

  if (!Array.isArray(links) || links.length === 0) {
    console.log("No links yet.");
    return;
  }

  const codeWidth = Math.max(4, ...links.map((l) => String(l.code || "").length));
  const hitsWidth = Math.max(4, ...links.map((l) => String(l.hits ?? "").length));

  console.log(`${pad("code", codeWidth)}  ${pad("hits", hitsWidth)}  url`);
  for (const link of links) {
    console.log(`${pad(link.code ?? "", codeWidth)}  ${pad(link.hits ?? "", hitsWidth)}  ${link.url ?? ""}`);
  }
}

function openInBrowser(target) {
  const platform = process.platform;
  let command;
  let args;

  if (platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", target];
  } else if (platform === "darwin") {
    command = "open";
    args = [target];
  } else {
    command = "xdg-open";
    args = [target];
  }

  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => {
    fail("Failed to open the browser on this system");
  });
  child.unref();
}

async function cmdOpen(args) {
  const code = args[0];
  if (!code) {
    fail("Usage: snip open <code>");
  }

  const response = await request(`/${encodeURIComponent(code)}`, {
    method: "GET",
    redirect: "manual"
  });

  if (response.status === 404) {
    fail("Unknown short code");
  }

  if (response.status < 300 || response.status >= 400) {
    fail(`Unexpected response status ${response.status}`);
  }

  const location = response.headers.get("location");
  if (!location) {
    fail("Redirect response missing Location header");
  }

  openInBrowser(location);
  console.log(location);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    usage();
    return;
  }

  if (command === "add") {
    await cmdAdd(args);
    return;
  }

  if (command === "ls") {
    await cmdLs();
    return;
  }

  if (command === "open") {
    await cmdOpen(args);
    return;
  }

  fail(`Unknown command: ${command}`);
}

main().catch((err) => {
  fail(err && err.message ? err.message : "Unexpected CLI error");
});
