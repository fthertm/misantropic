// misantropic — a small, dependency-free page that renders content.json.
// You don't need to touch this file to add services or text: see README.md.
import { icons } from "./icons.js";

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function $(id) {
  return document.getElementById(id);
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/* ---------- icons ---------- */
function icon(name, cls = "") {
  const d = icons[name] || icons.link;
  return `<svg class="i ${cls}" viewBox="0 0 ${d[0]} ${d[1]}" aria-hidden="true" focusable="false"><path d="${d[2]}"/></svg>`;
}

/* ---------- mini markup: **bold**, *italic*, `code`, [text](url), :icon: ---------- */
function safeUrl(url) {
  return /^(https?:|mailto:|\/|#)/i.test(url) ? url : "#";
}

function md(src) {
  return esc(src)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const url = safeUrl(u.replace(/&amp;/g, "&"));
      const ext = /^https?:/i.test(url);
      return `<a href="${esc(url)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`;
    })
    .replace(/:([a-z0-9-]+):/g, (m, n) => (icons[n] ? icon(n, n) : m));
}

/* ---------- Matrix server status ---------- */
const matrixCache = new Map(); // base URL -> { ok, ver, time }
async function matrixStatus(base) {
  const hit = matrixCache.get(base);
  if (hit && Date.now() - hit.time < 60000) return hit;
  let res;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(`${base.replace(/\/$/, "")}/_matrix/federation/v1/version`, { signal: ctl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    res = { ok: true, ver: j?.server?.version ?? null, time: Date.now() };
  } catch {
    res = { ok: false, ver: null, time: Date.now() };
  }
  matrixCache.set(base, res);
  return res;
}

/* ---------- pages ---------- */
let data;
let currentTab;

function cardHtml(it) {
  const internal = it.url.startsWith("#");
  const rel = internal ? "" : ' rel="noreferrer"';
  const matrix = it.matrix ? ` data-matrix="${esc(it.matrix)}"` : "";
  return (
    `<a class="card" href="${esc(it.url)}"${rel}${matrix}><div class="card-in">` +
    `<div class="card-ico">${icon(it.icon)}</div>` +
    `<div class="card-txt"><p class="card-title">${esc(it.name)}</p>` +
    `<p class="card-sub">${it.subtitle ? esc(it.subtitle) : ""}</p></div></div></a>`
  );
}

function groupsHtml(groups) {
  const section = (g) =>
    `<section class="group"${g.accent ? ` data-accent="${esc(g.accent)}"` : ""}>` +
    `<h2>${icon(g.icon)}${esc(g.name)}</h2>${g.items.map(cardHtml).join("")}</section>`;
  return `<div class="groups">${groups.map(section).join("")}</div>`;
}

function contactHtml(contact) {
  if (!contact || !contact.length) return "";
  const lines = contact.map((c) => `<p>${icon(c.icon)}<span>${md(c.text)}</span></p>`);
  return `<div class="contact">${lines.join("")}</div>`;
}

function articleHtml(a) {
  const intro = a.intro ? `<p class="intro">${md(a.intro)}</p>` : "";
  const paragraphs = (a.paragraphs || []).map((p) => `<p>${md(p)}</p>`).join("");
  return (
    `<article class="about"><div class="about-head">${icon(a.icon)}<p>${esc(a.title)}</p></div>` +
    `<div class="about-body">${intro}${paragraphs}${contactHtml(a.contact)}</div></article>`
  );
}

function hookMatrix() {
  document.querySelectorAll("[data-matrix]").forEach(async (card) => {
    const r = await matrixStatus(card.dataset.matrix);
    if (!card.isConnected) return; // the tab changed while the request was running
    const state = r.ok ? "online" : "offline";
    const dot = document.createElement("div");
    dot.className = `status ${state}`;
    dot.textContent = state;
    card.querySelector(".card-in").appendChild(dot);
    const sub = card.querySelector(".card-sub");
    if (sub && !sub.textContent && r.ver) sub.textContent = "Version " + r.ver;
  });
}

function tabFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  return data.tabs.find((t) => t.id === id) || data.tabs[0]; // unknown hash falls back to home
}

function show(tab, first) {
  currentTab = tab;
  $("main").innerHTML = tab.groups ? groupsHtml(tab.groups) : articleHtml(tab.article);
  document.title = tab === data.tabs[0] ? data.title : `${data.title} | ${tab.name.toLowerCase()}`;
  document.querySelectorAll("#tabs a").forEach((a) => {
    if (a.dataset.id === tab.id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (!first) window.scrollTo(0, 0);
  hookMatrix();
}

function tabLinkHtml(tab, index) {
  const href = index === 0 ? "#" : `#${esc(tab.id)}`; // the first tab is the home page
  return `<a href="${href}" data-id="${esc(tab.id)}">${icon(tab.icon)}${esc(tab.name)}</a>`;
}

function shell() {
  $("brand").setAttribute("aria-label", data.title);
  $("brand").innerHTML = `${icon(data.icon)}<span>${esc(data.title)}</span>`;
  $("tabs").innerHTML = data.tabs.map(tabLinkHtml).join("");
  $("footer").firstElementChild.innerHTML = md(data.footer || "");
}

async function init() {
  const res = await fetch("content.json");
  data = await res.json();
  shell();
  show(tabFromHash(), true);
  window.addEventListener("hashchange", () => {
    const t = tabFromHash();
    if (t !== currentTab) show(t);
  });
}

init();

/* ---------- PWA ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
