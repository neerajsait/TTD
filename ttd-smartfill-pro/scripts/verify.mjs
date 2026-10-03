import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url);
const required = [
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "options.html",
  "options.css",
  "options.js",
  "shared/constants.js",
  "shared/storage.js",
  "shared/fields.js",
  "shared/filler.js",
  "README.md"
];
const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));

for (const relative of required) {
  const path = new URL(relative, root);
  if (!statSync(path).isFile()) throw new Error(`Missing required file: ${relative}`);
}

const contentScripts = manifest.content_scripts?.[0]?.js || [];
for (const script of contentScripts) {
  if (!statSync(new URL(script, root)).isFile()) throw new Error(`Manifest references missing script: ${script}`);
}

const hosts = manifest.host_permissions || [];
if (hosts.length !== 2 || !hosts.every((host) => host.startsWith("https://*.") && host.endsWith("/*"))) {
  throw new Error("Host permissions are broader than the two supported TTD domains.");
}

const forbiddenPermissions = ["tabs", "cookies", "webRequest", "unlimitedStorage", "identity"];
if (forbiddenPermissions.some((permission) => manifest.permissions?.includes(permission))) {
  throw new Error("Manifest contains a forbidden broad permission.");
}

const files = required.filter((file) => file.endsWith(".js")).map((file) => new URL(file, root));
const forbiddenNetworkPatterns = /fetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//;
for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (forbiddenNetworkPatterns.test(source) && file.pathname.endsWith("background.js")) {
    throw new Error(`Unexpected network-capable code in ${file.pathname}`);
  }
}

console.log(`Verified TTD SmartFill Pro: ${required.length} required files, ${contentScripts.length} content scripts.`);