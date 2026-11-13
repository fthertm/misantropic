set -e
cd public

# 1) PWA: sw.js self-destroying olsun, gerisi silinsin
cat > sw.js <<'EOF'
// Kendini kaldıran service worker: eski ziyaretçilerdeki SW ve cache'i temizler.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
EOF
rm -f workbox-84c915bb.js registerSW.js assets/manifest.json

# 2) index.html
cat > index.html <<'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="assets/icons/favicon.ico" />
    <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png" sizes="180x180">
    <meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
    <meta name="description" content="A quiet, invite-only corner of the internet.">
    <meta name="theme-color" content="#2e3440">
    <meta name="color-scheme" content="dark">
    <title>misantropic | fewer letters, fewer people.</title>
    <script type="module" crossorigin src="./resources/index-C32yDzkE.js"></script>
    <link rel="stylesheet" crossorigin href="./resources/index-CyPCBeHl.css">
    <link rel="stylesheet" href="assets/custom.css">
  </head>
  <body>
    <div id="app-mount"></div>
  </body>
</html>
EOF

# 3) config.yml: light = dark (alias)
sed -i 's/^  dark:$/  dark: \&nord/' assets/config.yml
sed -i '/^    link-hover:/a\  light: *nord' assets/config.yml

# 4) about.yml
cat > assets/about.yml <<'EOF'
services: []

message:
  style: "is-dark"
  title: "Hi, I’m faith"
  content: >-
    <p><strong>misantropic</strong> <em>/ˌmɪs.ənˈtrɒp.ɪk/</em> — <em>adj.</em> misanthropic, minus the "h", no regrets.</p>
    <p>I self-host a quiet corner of the internet for myself and a few friends: a pastebin, a file sealer, webmail, a <a href="https://continuwuity.org" target="_blank" rel="noopener">Continuwuity</a> Matrix homeserver, and UNO (because someone has to).</p>
    <p><strong>Zero telemetry. Zero tracking.</strong></p>
    <p>The Matrix server is invite-only. Ping <code>@fatih:misantropic.net</code> if you think you belong here. Email works too (<code>skynet [at] misantropic.net</code>), though I’d genuinely prefer you didn’t.</p>
EOF

# 5) custom.css: eski about hack'ini sil, yenilerini ekle
perl -0pi -e 's{\n/\* Hide services at about page \*/.*\z}{\n}s' assets/custom.css
cat >> assets/custom.css <<'EOF'

/* no flash of white, native dark controls */
html, body { background: #2e3440; color-scheme: dark; }

/* keyboard focus */
body #app a:focus-visible,
body #app button:focus-visible {
  outline: 2px solid #88c0d0;
  outline-offset: 2px;
}

/* reduced motion */
@media (prefers-reduced-motion: reduce) {
  body #app .card { transition: none; }
  body #app .card:hover { transform: none; }
}
EOF

# 6) Matrix well-known
printf '%s\n' '{"m.homeserver":{"base_url":"https://matrix.misantropic.net"}}' > .well-known/matrix/client
printf '%s\n' '{"m.server":"matrix.misantropic.net:443"}' > .well-known/matrix/server

# 7) Konsol yazısını bundle'dan kaldır
sed -i 's/,console\.info(`Homer v26\.08\.3`)//' resources/index-C32yDzkE.js
echo "Kalan 'Homer v' sayısı (0 olmalı):" $(grep -c "Homer v26" resources/index-C32yDzkE.js || true)

# 8) _headers
cat > _headers <<'EOF'
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://matrix.misantropic.net; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'

/resources/*
  Cache-Control: public, max-age=31536000, immutable

/resources/index-C32yDzkE.js
  ! Cache-Control
  Cache-Control: no-cache

/sw.js
  Cache-Control: no-cache

/.well-known/matrix/*
  Access-Control-Allow-Origin: *
  Content-Type: application/json
EOF

# 9) .assetsignore
cat > .assetsignore <<'EOF'
assets/icons/README.md
*.dist
*.sample
EOF

cd ..
git status --short