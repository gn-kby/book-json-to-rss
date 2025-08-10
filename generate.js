// scripts/generate.js
// Node 18+ で実行（GitHub ActionsもOK）

const fs = require("fs");
const path = require("path");

// ---- 設定 ----
const FEEDS = [
  {
    name: "shinsho-sensho",
    title: "ジュンク堂: 新書・選書",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E6%96%B0%E6%9B%B8%E3%83%BB%E9%81%B8%E6%9B%B8&publication_date=2026/08/ALL/before&sort=-daterank",
  },
  {
    name: "business",
    title: "ジュンク堂: ビジネス",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E3%83%93%E3%82%B8%E3%83%8D%E3%82%B9&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank",
  },
  {
    name: "social",
    title: "ジュンク堂: 社会時事",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%A4%BE%E4%BC%9A%E6%99%82%E4%BA%8B&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank",
  },
  {
    name: "economy",
    title: "ジュンク堂: 経済",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%B5%8C%E6%B8%88&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank",
  },
  {
    name: "management",
    title: "ジュンク堂: 経営",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%B5%8C%E5%96%B6&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank",
  },
  {
    name: "politics",
    title: "ジュンク堂: 政治",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E6%94%BF%E6%B2%BB&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank",
  },
  {
    name: "computer",
    title: "ジュンク堂: コンピュータ",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E3%82%B3%E3%83%B3%E3%83%94%E3%83%A5%E3%83%BC%E3%82%BF&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank",
  },
  {
    name: "bunko",
    title: "ジュンク堂: 文庫",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E6%96%87%E5%BA%AB&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank",
  },
];

const SITE_ROOT = "https://gn-kby.github.io/book-json-to-rss/";

// ---- ユーティリティ ----
const xmlEscape = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cdata = (s = "") => `<![CDATA[${s}]]>`;

const toRFC822 = (d) => new Date(d).toUTCString(); // RFC822 互換

// "発売日：YYYY/MM/DD" を Date に
function parseReleaseDate(s) {
  if (!s) return null;
  const m = s.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (!m) return null;
  const [_, y, mo, d] = m;
  // JST 00:00 を UTC にすると前日になる可能性があるので UTC として組む
  return new Date(`${y}-${mo}-${d}T00:00:00Z`);
}

function productToItem(p) {
  const title = p.product_name || p.item_name || p.isbn || "本";
  const isbn = p.isbn || p.product_id || "";
  const link = isbn
    ? `https://www.junkudo.co.jp/search/?isbn=${encodeURIComponent(isbn)}`
    : SITE_ROOT;

  const author = p.author?.author_name || "";
  const publisher = p.publisher?.publisher_name || "";
  const price = p.price?.tax_included_price
    ? `${p.price.tax_included_price}円`
    : "";
  const img = p.image?.image_path || "";

  const descParts = [];
  if (publisher) descParts.push(`出版社: ${publisher}`);
  if (author) descParts.push(`著者: ${author}`);
  if (isbn) descParts.push(`ISBN: ${isbn}`);
  if (price) descParts.push(`価格(税込): ${price}`);

  let html = descParts.join(" / ");
  if (img) {
    html += `<br><img src="${img}" alt="${xmlEscape(title)}" referrerpolicy="no-referrer" loading="lazy">`;
  }

  const pub = parseReleaseDate(p.release?.release_date) || new Date();

  return {
    title,
    link,
    guid: isbn || `${p.product_id || ""}`,
    pubDate: toRFC822(pub),
    description: html,
  };
}

function buildRSS({ title, link, items }) {
  const lastBuildDate = toRFC822(new Date());
  const head = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0">`,
    `<channel>`,
    `<title>${cdata(title)}</title>`,
    `<link>${cdata(link)}</link>`,
    `<description>${cdata("zetacx APIの検索結果をRSS化")}</description>`,
    `<language>ja</language>`,
    `<lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `<ttl>240</ttl>`,
  ].join("");

  const body = items
    .map(
      (it) => `
<item>
  <title>${cdata(it.title)}</title>
  <link>${cdata(it.link)}</link>
  <guid isPermaLink="false">${cdata(it.guid)}</guid>
  <pubDate>${it.pubDate}</pubDate>
  <description>${cdata(it.description)}</description>
</item>`
    )
    .join("");

  const foot = `</channel></rss>`;
  return head + body + foot;
}

// ---- 実行 ----
async function fetchJSON(url) {
  const res = await fetch(url, { headers: { "user-agent": "gn-kby/rss" } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  return res.json();
}

async function buildOne(feed) {
  const json = await fetchJSON(feed.url);
  const list = Array.isArray(json?.product_list) ? json.product_list : [];
  const items = list.map(productToItem);

  const rss = buildRSS({
    title: feed.title,
    link: feed.url,
    items,
  });

  const out = path.join("public", `${feed.name}.xml`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, rss, "utf8");
  console.log(`wrote: ${out} (${items.length} items)`);
  return items;
}

(async () => {
  // 各カテゴリを個別生成
  const allItems = [];
  for (const f of FEEDS) {
    const items = await buildOne(f);
    allItems.push(...items);
  }

  // まとめ(all) — 先頭20件だけ
  const allRss = buildRSS({
    title: "ジュンク堂: まとめ（全カテゴリ）",
    link: SITE_ROOT,
    items: allItems.slice(0, 20),
  });
  fs.writeFileSync(path.join("public", "all.xml"), allRss, "utf8");
  console.log(`wrote: public/all.xml (${Math.min(20, allItems.length)} items)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
