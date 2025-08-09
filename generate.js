import fs from "node:fs/promises";

// ===== 取得元一覧（slug, タイトル, 取得URL）=====
const SOURCES = [
  {
    slug: "shinsho-sensho",
    title: "ジュンク堂: 新書・選書",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA%2AmT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E6%96%B0%E6%9B%B8%E3%83%BB%E9%81%B8%E6%9B%B8&publication_date=2026/08/ALL/before&sort=-daterank"
  },
  {
    slug: "business",
    title: "ジュンク堂: ビジネス",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA%2AmT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E3%83%93%E3%82%B8%E3%83%8D%E3%82%B9&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "current-affairs",
    title: "ジュンク堂: 社会時事",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA%2AmT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%A4%BE%E4%BC%9A%E6%99%82%E4%BA%8B&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "economy",
    title: "ジュンク堂: 経済",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA%2AmT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%B5%8C%E6%B8%88&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "management",
    title: "ジュンク堂: 経営",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA%2AmT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%B5%8C%E5%96%B6&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "politics",
    title: "ジュンク堂: 政治",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA%2AmT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E6%94%BF%E6%B2%BB&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "computer",
    title: "ジュンク堂: コンピュータ",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA%2AmT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E3%82%B3%E3%83%B3%E3%83%94%E3%83%A5%E3%83%BC%E3%82%BF&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "bunko",
    title: "ジュンク堂: 文庫",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA%2AmT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E6%96%87%E5%BA%AB&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  }
];

// ===== ユーティリティ =====
const cdata = (s = "") => `<![CDATA[${String(s).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
const escAttr = (s = "") =>
  String(s)
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");

const pick = (obj, keys, def = "") =>
  keys.map(k => obj?.[k]).find(v => typeof v === "string" && v.trim()) ?? def;

const toRfc822 = (v) => {
  const d = new Date(v);
  return isNaN(d) ? new Date().toUTCString() : d.toUTCString();
};

// descriptionを少しリッチに（著者・出版社・ISBN・価格などがあれば組み立て）
const buildDesc = (it) => {
  const author = pick(it, ["author", "authors", "writer", "creator", "author_name"]);
  const publisher = pick(it, ["publisher", "label", "publisher_name"]);
  const isbn = pick(it, ["isbn13", "isbn", "JAN"]);
  const price = pick(it, ["price", "price_text", "tax_in", "price_with_tax"]);
  const overview = pick(it, ["description", "overview", "summary", "body", "item_caption"]);
  const parts = [];
  if (author) parts.push(`著者: ${author}`);
  if (publisher) parts.push(`出版社: ${publisher}`);
  if (isbn) parts.push(`ISBN: ${isbn}`);
  if (price) parts.push(`価格: ${price}`);
  if (overview) parts.push(overview);
  return parts.join("\n");
};

// JSON→標準化（多層 & 自動探索対応）
const extractArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  // オブジェクト内の最初の配列を拾う
  for (const v of Object.values(data)) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      const inner = extractArray(v);
      if (inner.length) return inner;
    }
  }
  return [];
};

const normalizeItems = (data, sourceUrl) => {
  const items = extractArray(data);
  return items.map(it => {
    const title = pick(it, ["title","name","book_title","title_name","item_name"], "No title");
    const link  = pick(it, ["url","item_url","link","detail_url","product_url"], sourceUrl);
    const guid  = pick(it, ["url","item_url","isbn13","isbn","id","item_id"], link);
    const date  = pick(it, ["publication_date","published_at","updated_at","date","release_date"], new Date().toISOString());
    const desc  = buildDesc(it);
    const img   = pick(it, ["image_url", "thumbnail", "cover", "image", "imageLink"]);
    return { title, link, guid, date, desc, img };
  });
};

const rssXml = (channelTitle, channelLink, items) => {
  const now = new Date().toUTCString();
  const rssItems = items.map(it => `
    <item>
      <title>${cdata(it.title)}</title>
      <link>${cdata(it.link)}</link>
      <guid isPermaLink="${/^https?:\/\//.test(it.guid) ? "true" : "false"}">${cdata(it.guid)}</guid>
      <pubDate>${toRfc822(it.date)}</pubDate>
      <description>${cdata(it.desc)}</description>
      ${it.img ? `<enclosure url="${escAttr(it.img)}" length="0" type="image/jpeg" />` : ""}
    </item>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${cdata(channelTitle)}</title>
  <link>${cdata(channelLink)}</link>
  <description>${cdata("zetacx APIの検索結果をRSS化")}</description>
  <language>ja</language>
  <lastBuildDate>${now}</lastBuildDate>
  <ttl>240</ttl>
  ${rssItems}
</channel>
</rss>`;
};

// fetchを堅牢化（UA/Referer/Accept、リトライ）
const fetchJson = async (url, tries = 3) => {
  const headers = {
    "accept": "application/json, text/plain, */*",
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "referer": "https://www.junkudo.co.jp/"
  };
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status} ${r.statusText} ${txt.slice(0,200)}`);
      }
      return await r.json();
    } catch (e) {
      lastErr = e;
      await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }
  }
  throw lastErr;
};

(async () => {
  await fs.mkdir("docs", { recursive: true });
  await fs.writeFile("docs/.nojekyll", "");

  const all = [];
  for (const src of SOURCES) {
    try {
      const data = await fetchJson(src.url);
      const items = normalizeItems(data, src.url);
      const xml = rssXml(src.title, src.url, items);
      await fs.writeFile(`docs/${src.slug}.xml`, xml, "utf8");
      all.push(...items.map(i => ({ ...i, _source: src.title })));
      console.log(`generated: docs/${src.slug}.xml (${items.length} items)`);
    } catch (e) {
      console.error(`fetch failed: ${src.slug}:`, e?.message || e);
      // 空でも壊れないRSSを出す
      const xml = rssXml(`${src.title}（取得失敗）`, src.url, []);
      await fs.writeFile(`docs/${src.slug}.xml`, xml, "utf8");
    }
  }

  // まとめRSS（最大100件、pubDate降順）
  const sorted = all
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 100);
  const allXml = rssXml("ジュンク堂: まとめ（全カテゴリ）", "https://gn-kby.github.io/book-json-to-rss/", sorted);
  await fs.writeFile("docs/all.xml", allXml, "utf8");
  console.log(`generated: docs/all.xml (${sorted.length} items)`);
})();
