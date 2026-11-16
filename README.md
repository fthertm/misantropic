# misantropic

The misantropic.net home page. Plain HTML/CSS/JS with no build step and no dependencies,
published as a Cloudflare Worker (static assets). `/flap` is a separate worker and is not part of this project.

```
public/
  index.html            small page skeleton
  content.json          ← ALL content lives here (services, about text, menu, footer)
  assets/app.js         code that renders content.json
  assets/app.css        Nord theme (colors and radii are tokens in :root)
  assets/icons.js       inline SVG icons
  sw.js                 service worker (offline shell)
  manifest.webmanifest  PWA manifest
  _headers              security headers, CSP, cache rules
  .well-known/matrix/   Matrix discovery files (leave alone)
check.mjs               content.json validation:  node check.mjs
wrangler.jsonc          Cloudflare configuration
```

## Adding a service

In `public/content.json`, add an entry to the `items` list of the right group in the `home` tab:

```json
{ "name": "Wiki", "subtitle": "Personal notes", "icon": "link", "url": "https://wiki.misantropic.net" }
```

- `url`: `https://…`, `/path` (same site) or `#about` (internal page).
- `icon`: a name from `public/assets/icons.js` (see below).
- For a new group (column), add `{ "name": "…", "icon": "…", "accent": "frost", "items": [ … ] }` to the tab's `groups` list.
- `accent` is optional: `frost` (ice blue), `purple` or `green`. Without it, columns cycle blue → purple → green by position.
  Setting it explicitly keeps a group's color when columns are added or reordered.
- For a Matrix status dot on a card, add `"matrix": "https://matrix.misantropic.net"` to the item.
  If `subtitle` is empty, the card shows the server version ("Version x.y.z").

Then run `node check.mjs` (it catches bad icon names, URLs and accents).

## Adding a tab

Tabs are always visible and follow the order of the `tabs` list (the first tab is the home page). Add an object to the list;
its address becomes `#id`. A tab has either `groups` (service cards) or `article` (a text page):

```json
{
  "id": "notes",
  "name": "Notes",
  "icon": "paste",
  "article": {
    "title": "Notes",
    "icon": "paste",
    "paragraphs": ["First paragraph. **Bold**, `code`, [link](https://example.com)."]
  }
}
```

With many tabs, the tab bar scrolls horizontally on mobile. `node check.mjs` catches duplicate ids and missing icons.

## About / footer text

The `article` field of the `about` tab in `content.json`, and `footer`. Text supports a small markup:

| Written          | Result               |
|------------------|----------------------|
| `**bold**`       | **bold**             |
| `*italic*`       | *italic*             |
| `` `code` ``     | code box             |
| `[text](url)`    | link                 |
| `:heart:`        | icon (icons.js name) |

- `article.intro`: the "dictionary definition" box at the top (the first `*…*` becomes the pronunciation badge).
- `article.paragraphs`: plain paragraphs.
- `article.contact`: contact lines with icons.

## Theme

Colors, shadows, radii and the monospace stack are tokens at the top of `public/assets/app.css`.

- Palette: Nord. The header color `--head` is `--blue` mixed 75/25 with `--nord0` (about 4.5:1 with white text).
  Keep it in sync with `theme-color` in `index.html` and `manifest.webmanifest`.
- Hover has two rules: text links turn yellow; surfaces (cards, tabs) get a frost border or a light tint.
- Corner radii: `--r-s` (6px) for inline pieces, `--r-l` (12px) for surfaces.

## Adding an icon

Icons are Font Awesome Free (CC BY 4.0) SVGs; only the ones in use are included in `icons.js`.
Open the icon on fontawesome.com → **Copy SVG** → take the width/height from the `viewBox` and the path from `d="…"`:

```js
"icon-name": [width, height, "path data"],
```

An unknown name renders the `link` icon; `node check.mjs` warns about it.

## Deploying

```
npx wrangler deploy
```

## PWA / caching

- The service worker serves the shell (HTML, JS, CSS, font, `content.json`, icons) from the cache first
  and refreshes it in the background (stale-while-revalidate). A content change therefore shows up on the **next visit**.
- Never cached: `/flap*`, `/.well-known/*`, other origins (the Matrix status request).
- If you add a new shell file under `public/`, also add it to `SHELL` in `sw.js`; bump the `CACHE` version
  to reset the cache completely.
- The manifest has `scope: "/"`, so when the site is installed as a PWA, `/flap` also opens inside the app window.
