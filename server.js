const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = process.env.PUBLIC_DIR;

function computeBaseUrl() {
  if (process.env.BASE_URL) {
    try {
      return new URL(process.env.BASE_URL).origin;
    } catch {
      return process.env.BASE_URL;
    }
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN.replace(/^https?:\/\//i, "");
    return `https://${domain}`;
  }

  return `http://localhost:${PORT}`;
}

const BASE_URL = computeBaseUrl();
const links = new Map();
const base62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function randomCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    const idx = Math.floor(Math.random() * base62.length);
    code += base62[idx];
  }
  return code;
}

function uniqueCode() {
  let code = randomCode();
  while (links.has(code)) {
    code = randomCode();
  }
  return code;
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function tryServeStatic(pathname) {
  if (!PUBLIC_DIR) {
    return null;
  }

  let requestPath = pathname;
  if (requestPath === "/") {
    requestPath = "/index.html";
  }

  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const sanitized = decoded.replace(/^\/+/, "");
  const publicRoot = path.resolve(PUBLIC_DIR);
  const fullPath = path.resolve(publicRoot, sanitized);

  if (fullPath !== publicRoot && !fullPath.startsWith(`${publicRoot}${path.sep}`)) {
    return null;
  }

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    return null;
  }

  const file = Bun.file(fullPath);

  const headers = corsHeaders();
  const type = file.type;
  if (type) {
    headers["Content-Type"] = type;
  }

  return new Response(file, { status: 200, headers });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (pathname === "/api/links" && req.method === "POST") {
      let payload;
      try {
        payload = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const inputUrl = payload?.url;
      if (typeof inputUrl !== "string" || !isValidHttpUrl(inputUrl)) {
        return json({ error: "Invalid URL" }, 400);
      }

      const code = uniqueCode();
      const entry = {
        code,
        url: inputUrl,
        shortUrl: `${BASE_URL}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };

      links.set(code, entry);
      return json(entry, 201);
    }

    if (pathname === "/api/links" && req.method === "GET") {
      return json(Array.from(links.values()));
    }

    if (req.method === "GET") {
      const staticResponse = await tryServeStatic(pathname);
      if (staticResponse) {
        return staticResponse;
      }

      const code = pathname.slice(1);
      if (!code) {
        return json({ error: "Not found" }, 404);
      }

      const found = links.get(code);
      if (!found) {
        return json({ error: "Not found" }, 404);
      }

      found.hits += 1;
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders(),
          Location: found.url,
        },
      });
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`Snip backend listening on http://localhost:${PORT}`);
