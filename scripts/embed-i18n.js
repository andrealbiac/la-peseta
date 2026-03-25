#!/usr/bin/env node
/**
 * After editing i18n.json, run: node scripts/embed-i18n.js
 * Refreshes the EMBEDDED_I18N fallback inside i18n.js (for file:// and offline).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "i18n.json");
const i18nJsPath = path.join(root, "i18n.js");

const bundle = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const embedded = "const EMBEDDED_I18N = " + JSON.stringify(bundle) + ";\n";

let js = fs.readFileSync(i18nJsPath, "utf8");
const marker = /const EMBEDDED_I18N = \{[\s\S]*?\};\n/;
if (!marker.test(js)) {
  console.error("Could not find EMBEDDED_I18N block in i18n.js");
  process.exit(1);
}
js = js.replace(marker, embedded);
fs.writeFileSync(i18nJsPath, js);
console.log("Updated EMBEDDED_I18N in i18n.js");
