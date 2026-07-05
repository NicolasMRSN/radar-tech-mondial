// Build script: turns dashboard-source.jsx into a fully self-contained
// index.html. Unlike the previous version, this does NOT rely on unpkg.com
// (or any CDN) at page-load time: React, ReactDOM and d3 are inlined
// directly, and JSX is pre-compiled here (server-side) rather than in the
// visitor's browser. This is both faster (no CDN round-trips, no in-browser
// Babel parse cost) and more robust — Brave Shields, ad-blockers, corporate
// proxies, or a CDN outage can no longer break the page.
//
// Usage: npm install && node scripts/build.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@babel/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const src = fs.readFileSync(path.join(root, "dashboard-source.jsx"), "utf8");

let code = src
  .replace('import { useState, useMemo, useRef, useEffect } from "react";\n', "")
  .replace('import * as d3 from "d3";\n', "")
  .replace("export default function Dashboard()", "function Dashboard()");

const wrapped = `
(function () {
  try {
    const { useState, useMemo, useRef, useEffect } = React;

${code}

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(React.createElement(Dashboard));
    document.getElementById("root").dataset.rendered = "1";
  } catch (err) {
    console.error(err);
    document.getElementById("root").innerHTML =
      '<pre style="color:#EDEFF4;background:#0B1220;padding:24px;white-space:pre-wrap;font-family:monospace;font-size:13px;">Erreur au rendu du tableau de bord.\\n\\n' +
      (err && err.message ? err.message : String(err)) + "</pre>";
  }
})();
`;

const { code: compiled } = babel.transformSync(wrapped, {
  presets: [["@babel/preset-react", { runtime: "classic" }]],
});

function readLib(relPath) {
  return fs.readFileSync(path.join(root, "node_modules", relPath), "utf8");
}

const reactLib = readLib("react/umd/react.production.min.js");
const domLib = readLib("react-dom/umd/react-dom.production.min.js");
const d3Lib = readLib("d3/dist/d3.min.js");

for (const [name, content] of [["react", reactLib], ["react-dom", domLib], ["d3", d3Lib], ["app", compiled]]) {
  if (content.toLowerCase().includes("</script")) {
    throw new Error(`Refusing to inline ${name}: it contains a literal "</script" sequence that would break the HTML.`);
  }
}

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Radar Tech Mondial — Veille Tech / Défense / Industrie</title>
<meta name="description" content="Panorama mondial par pays des actualités technologiques, industrielles et de défense, avec carte, frise temporelle, réseau d'acteurs, tendances et synthèse." />
<style>html,body{margin:0;background:#0B1220;color:#EDEFF4;font-family:sans-serif;}</style>
</head>
<body>
<div id="root">
  <pre style="color:#8B96AB;background:#0B1220;padding:24px;white-space:pre-wrap;font-family:monospace;font-size:13px;">Chargement du tableau de bord…</pre>
</div>
<script>${reactLib}</script>
<script>${domLib}</script>
<script>${d3Lib}</script>
<script>${compiled}</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "index.html"), html);
console.log(`Wrote index.html (${(html.length / 1024).toFixed(0)} KB, fully self-contained, no CDN dependency).`);
