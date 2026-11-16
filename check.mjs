// Quick validation: node check.mjs
// Checks the content.json structure, icon names and links. No dependencies (Node 18+).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const content = JSON.parse(readFileSync("public/content.json", "utf8"));
const { icons } = await import(pathToFileURL(resolve("public/assets/icons.js")).href);

const ACCENTS = ["frost", "purple", "green"];
const problems = [];

function need(ok, message) {
  if (!ok) problems.push(message);
}

function icon(name, where) {
  need(icons[name], `${where}: icon "${name}" not found (public/assets/icons.js)`);
}

function link(url, where) {
  need(/^(https?:\/\/|\/|#)/.test(url || ""), `${where}: invalid url "${url}"`);
}

need(content.title, "title is missing");
icon(content.icon, "icon");
need(Array.isArray(content.tabs) && content.tabs.length, "tabs is missing");
const ids = new Set();
for (const t of content.tabs || []) {
  const w = `tab "${t.name}"`;
  need(t.id && t.name, "tab: id/name is missing");
  need(!ids.has(t.id), `${w}: duplicate id`);
  ids.add(t.id);
  need(!!t.groups !== !!t.article, `${w}: must have either "groups" or "article"`);
  icon(t.icon, w);
  for (const g of t.groups || []) {
    need(g.name, `${w}: group name is missing`);
    icon(g.icon, `group "${g.name}"`);
    need(!g.accent || ACCENTS.includes(g.accent), `group "${g.name}": unknown accent "${g.accent}" (use ${ACCENTS.join(" | ")})`);
    for (const it of g.items || []) {
      const x = `${g.name} / ${it.name}`;
      need(it.name, `${g.name}: item name is missing`);
      icon(it.icon, x);
      link(it.url, x);
      if (it.matrix) link(it.matrix, `${x} (matrix)`);
    }
  }
  if (t.article) {
    icon(t.article.icon, `${w} article`);
    for (const c of t.article.contact || []) icon(c.icon, `${w} contact`);
  }
}
const count = (content.tabs || []).flatMap((t) => t.groups || []).reduce((n, g) => n + g.items.length, 0);

if (problems.length) {
  console.error("Problems:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`OK: ${content.tabs.length} tabs, ${count} services.`);
