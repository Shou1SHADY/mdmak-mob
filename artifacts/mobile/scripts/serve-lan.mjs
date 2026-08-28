#!/usr/bin/env node
/**
 * Serves dist/ on this machine's LAN address so a phone on the same Wi-Fi can
 * install the app from its home screen.
 *
 * Two things a plain static server gets wrong for this:
 *
 *   - It binds to localhost, which a phone cannot reach. This binds 0.0.0.0 and
 *     prints the address to actually type.
 *   - It 404s every route but "/". The export is an SPA (web.output "single"),
 *     so expo-router resolves /leads, /invoices and the rest on the client —
 *     unknown paths must fall back to index.html or a deep link dies.
 *
 * Usage:  npm run serve:lan  [port]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.argv[2] ?? 8100);

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("No dist/index.html — run `npm run build:web` first.");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";

    // Refuse anything that climbs out of dist/.
    let file = path.join(DIST, rel);
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    // SPA fallback: a path with no file extension is a client route, not a
    // missing asset. A real missing asset (has an extension) still 404s, so a
    // broken image does not silently return HTML.
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (path.extname(rel)) {
        res.writeHead(404).end("Not found");
        return;
      }
      file = path.join(DIST, "index.html");
    }

    const body = fs.readFileSync(file);
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": body.length,
      // No caching: this is a test server and a stale bundle after a rebuild
      // wastes more time than the bytes save.
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch (err) {
    console.error(err);
    res.writeHead(500).end("Server error");
  }
});

function lanAddresses() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== "IPv4" || a.internal) continue;
      // Skip the virtual adapters WSL/Docker/Hyper-V add — a phone cannot reach
      // those, and offering them sends people down a dead end.
      if (/^(172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) continue;
      out.push({ name, address: a.address });
    }
  }
  return out;
}

server.listen(PORT, "0.0.0.0", () => {
  const addrs = lanAddresses();
  console.log(`\nServing ${path.relative(process.cwd(), DIST) || "dist"} on port ${PORT}\n`);
  console.log("  On this machine:  http://localhost:" + PORT);
  if (addrs.length === 0) {
    console.log("\n  No LAN address found — is Wi-Fi connected?");
  } else {
    console.log("\n  On your phone (same Wi-Fi):");
    for (const a of addrs) console.log(`      http://${a.address}:${PORT}     [${a.name}]`);
  }
  console.log("\n  iPhone: open that in SAFARI (not Chrome), then Share → Add to Home Screen.");
  console.log("  Ctrl+C to stop.\n");
});
