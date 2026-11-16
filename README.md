# misantropic

misantropic.net ana sayfası. Build adımı ve bağımlılığı olmayan, saf HTML/CSS/JS bir sayfa;
Cloudflare Worker (static assets) olarak yayınlanır. `/flap` ayrı bir worker'dır ve bu projeye dahil değildir.

```
public/
  index.html            küçük sayfa iskeleti
  content.json          ← TÜM içerik burada (servisler, hakkında metni, menü, alt bilgi)
  assets/app.js         content.json'u çizen kod
  assets/app.css        Nord teması (renkler :root içinde)
  assets/icons.js       satır içi SVG ikonlar
  sw.js                 service worker (çevrimdışı kabuk)
  manifest.webmanifest  PWA bildirimi
  _headers              güvenlik başlıkları, CSP, önbellek kuralları
  .well-known/matrix/   Matrix keşif dosyaları (dokunma)
check.mjs               content.json doğrulaması:  node check.mjs
wrangler.jsonc          Cloudflare yapılandırması
```

## Yeni servis eklemek

`public/content.json` → `tabs` → `home` sekmesindeki ilgili grubun `items` listesine bir satır ekle:

```json
{ "name": "Wiki", "subtitle": "Kişisel notlar", "icon": "link", "url": "https://wiki.misantropic.net" }
```

- `url`: `https://…`, `/yol` (aynı site) veya `#about` (iç sayfa) olabilir.
- `icon`: `public/assets/icons.js` içindeki bir ad (aşağıya bak).
- Yeni grup (sütun) için sekmenin `groups` listesine `{ "name": "…", "icon": "…", "items": [ … ] }` ekle.
  Sütunların vurgu renkleri sırayla mavi → mor → yeşil olarak döner.
- Matrix durum noktası isteyen bir kart için öğeye `"matrix": "https://matrix.misantropic.net"` ekle.
  `subtitle` boşsa kartta sunucu sürümü ("Version x.y.z") gösterilir.

Sonra `node check.mjs` ile kontrol et (ikon adı ve url hatalarını yakalar).

## Yeni sekme eklemek

Sekmeler her zaman görünür ve `tabs` listesindeki sıraya göre dizilir (ilk sekme ana sayfadır). Listeye bir nesne eklemek yeter;
adres `#id` olur. Bir sekme ya `groups` (servis kartları) ya da `article` (metin sayfası) içerir:

```json
{
  "id": "notes",
  "name": "Notes",
  "icon": "paste",
  "article": {
    "title": "Notes",
    "icon": "paste",
    "paragraphs": ["İlk paragraf. **Kalın**, `kod`, [bağlantı](https://example.com)."]
  }
}
```

Çok sekme olursa mobilde sekme çubuğu yatay kaydırılır. `node check.mjs` id tekrarını ve eksik ikonları yakalar.

## Hakkında / alt bilgi metni

`content.json` → `about` sekmesinin `article` alanı ve `footer`. Metinlerde küçük bir işaretleme kullanılır:

| Yazım            | Sonuç                |
|------------------|----------------------|
| `**kalın**`      | **kalın**            |
| `*italik*`       | *italik*             |
| `` `kod` ``      | kod kutusu           |
| `[metin](url)`   | bağlantı             |
| `:heart:`        | ikon (icons.js adı)  |

- `article.intro`: üstteki "sözlük tanımı" kutusu (ilk `*…*` telaffuz rozeti olur).
- `article.paragraphs`: düz paragraflar.
- `article.contact`: ikonlu iletişim satırları.

## Yeni ikon eklemek

İkonlar Font Awesome Free (CC BY 4.0) SVG'leridir; yalnızca kullanılanlar `icons.js` içindedir.
fontawesome.com'da ikonu aç → **Copy SVG** → `viewBox` değerinden genişlik/yüksekliği ve `d="…"` yolunu al:

```js
"ikon-adi": [genişlik, yükseklik, "path verisi"],
```

Bilinmeyen bir ad yazılırsa `link` ikonu görünür; `node check.mjs` ise uyarır.

## Yayınlama

```
npx wrangler deploy
```

## PWA / önbellek

- Service worker kabuğu (HTML, JS, CSS, yazı tipi, `content.json`, ikonlar) önce önbellekten verir,
  arkada yeniler (stale-while-revalidate). Yani içerik değişikliği, siteyi **bir sonraki açışta** görünür.
- Asla önbelleğe alınmayanlar: `/flap*`, `/.well-known/*`, başka origin'ler (Matrix durum isteği).
- `public/` altına yeni bir kabuk dosyası eklersen `sw.js` içindeki `SHELL` listesine de ekle; önbelleği
  tamamen sıfırlamak için `CACHE` sürümünü artır.
- Manifest `scope: "/"` olduğu için PWA olarak kurulduğunda `/flap` de uygulama penceresinde açılır.
