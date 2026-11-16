// Hızlı doğrulama: node check.mjs
// content.json biçimini, ikon adlarını ve bağlantıları kontrol eder. Bağımlılık yok (Node 18+).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const content = JSON.parse(readFileSync("public/content.json", "utf8"));
const { icons } = await import(pathToFileURL(resolve("public/assets/icons.js")).href);

const problems = [];
const need = (ok, msg) => ok || problems.push(msg);
const icon = (name, where) => need(icons[name], `${where}: "${name}" ikonu yok (public/assets/icons.js)`);
const link = (url, where) => need(/^(https?:\/\/|\/|#)/.test(url || ""), `${where}: geçersiz url "${url}"`);

need(content.title, "title eksik");
icon(content.icon, "icon");
need(Array.isArray(content.tabs) && content.tabs.length, "tabs eksik");
const ids = new Set();
for (const t of content.tabs || []) {
  const w = `sekme "${t.name}"`;
  need(t.id && t.name, "sekme: id/name eksik");
  need(!ids.has(t.id), `${w}: id tekrar ediyor`);
  ids.add(t.id);
  need(!!t.groups !== !!t.article, `${w}: ya "groups" ya "article" olmalı`);
  icon(t.icon, w);
  for (const g of t.groups || []) {
    need(g.name, `${w}: grup adı eksik`);
    icon(g.icon, `grup "${g.name}"`);
    for (const it of g.items || []) {
      const x = `${g.name} / ${it.name}`;
      need(it.name, `${g.name}: öğe adı eksik`);
      icon(it.icon, x);
      link(it.url, x);
      if (it.matrix) link(it.matrix, `${x} (matrix)`);
    }
  }
  if (t.article) {
    icon(t.article.icon, `${w} makale`);
    for (const c of t.article.contact || []) icon(c.icon, `${w} iletişim`);
  }
}
const count = (content.tabs || []).flatMap((t) => t.groups || []).reduce((n, g) => n + g.items.length, 0);

if (problems.length) {
  console.error("Sorunlar:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`Tamam: ${content.tabs.length} sekme, ${count} servis.`);
