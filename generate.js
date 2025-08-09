import fs from "node:fs/promises";

// ===== 取得元一覧（slug, タイトル, 取得URL）=====
const SOURCES = [
  {
    slug: "shinsho-sensho",
    title: "ジュンク堂: 新書・選書",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E6%96%B0%E6%9B%B8%E3%83%BB%E9%81%B8%E6%9B%B8&publication_date=2026/08/ALL/before&sort=-daterank"
  },
  {
    slug: "business",
    title: "ジュンク堂: ビジネス",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E3%83%93%E3%82%B8%E3%83%8D%E3%82%B9&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "current-affairs",
    title: "ジュンク堂: 社会時事",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%A4%BE%E4%BC%9A%E6%99%82%E4%BA%8B&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "economy",
    title: "ジュンク堂: 経済",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%B5%8C%E6%B8%88&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "management",
    title: "ジュンク堂: 経営",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%B5%8C%E5%96%B6&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "politics",
    title: "ジュンク堂: 政治",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E6%94%BF%E6%B2%BB&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "computer",
    title: "ジュンク堂: コンピュータ",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E3%82%B3%E3%83%B3%E3%83%94%E3%83%A5%E3%83%BC%E3%82%BF&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "bunko",
    title: "ジュンク堂: 文庫",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E6%96%87%E5%BA%AB&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  }
];

// ===== ユーティリティ =====
const cdata = (s = "") => `<![CDATA[${String(s).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
const pick = (obj, keys, def = "") =>
  keys.map(k => obj?.[k]).find(v => typeof v === "string" && v.trim()) ?? def;
const toRfc822 = (v) => {
  const d = new Date(v);
  return isNaN(d) ? new Date().toUTCString() : d.toUTCString();
};

// descriptionを少しリッチに（著者・出版社・ISBN・価格などがあれば組み立て）
const buildDesc = (it) => {
  const author = pick(it, ["author", "authors", "writer", "creator"]);
  const publisher = pick(it, ["publisher", "label"]);
  const isbn = pick(it, ["isbn13", "isbn", "JAN"]);
  const price = pick(it, ["price", "price_text", "tax_in"]);
  const overview = pick(it, ["description", "overview", "summary", "body"]);
  const parts = [];
  if (author) parts.push(`著者: ${author}`);
  if (publisher) parts.push(`出版社: ${publisher}`);
  if (isbn) parts.push(`ISBN: ${isbn}`);
  if (price) parts.push(`価格: ${price}`);
  if (overview) parts.push(overview);
  return parts.join("\n");
};

// JSON→標準化
const normalizeItems = (data, sourceUrl) => {
  const items = Array.isArray(data?.items) ? data.items
              : Array.isArray(data?.results) ? data.results
              : Array.isArray(data) ? data
              : [];
  return items.map(it => {
    const title = pick(it, ["title","name","book_title","title_name"], "No title");
    const link  = pick(it, ["url","item_url","link","detail_url"], sourceUrl);
    const guid  = pick(it, ["url","item_url","isbn13","isbn","id"], link);
    const date  = pick(it, ["publication_date","published_at","updated_at","date"], new Date().toISOString());
    const desc  = buildDesc(it);
    const img   = pick(it, ["image_url", "thumbnail", "cover", "image"]);
    return { title, link, guid, date, desc, img };
  });
};

const rssXml = (channelTitle, channelLink, items) => {
  const now = new Date().toUTCString();
  const rssItems = items.map(it => `
    <item>
      <title>${cdata(it.title)}</title>
      <link>${it.link}</link>
      <guid isPermaLink="${/^https?:\/\//.test(it.guid) ? "true" : "false"}">${cdata(it.guid)}</guid>
      <pubDate>${toRfc822(it.date)}</pubDate>
      <description>${cdata(it.desc)}</description>
      ${it.img ? `<enclosure url="${it.img}" length="0" type="image/jpeg" />` : ""}
    </item>`).join("");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${cdata(channelTitle)}</title>
  <link>${channelLink}</link>
  <description>${cdata("zetacx APIの検索結果をRSS化")}</description>
  <language>ja</language>
  <lastBuildDate>${now}</lastBuildDate>
  <ttl>240</ttl>
  ${rssItems}
</channel>
</rss>`;
};

(async () => {
  await fs.mkdir("docs", { recursive: true });
  await fs.writeFile("docs/.nojekyll", "");

  const all = [];
  for (const src of SOURCES) {
    try {
      const r = await fetch(src.url, { headers: { "accept": "application/json" }});
      if (!r.ok) { console.error(`fetch failed: ${src.slug}`); continue; }
      const data = await r.json();
      const items = normalizeItems(data, src.url);
      // 個別フィード
      const xml = rssXml(src.title, src.url, items);
      await fs.writeFile(`docs/${src.slug}.xml`, xml, "utf8");
      // まとめ用
      all.push(...items.map(i => ({ ...i, _source: src.title })));
      console.log(`generated: docs/${src.slug}.xml (${items.length} items)`);
    } catch (e) {
      console.error(`error on ${src.slug}:`, e);
    }
  }

  // まとめRSS（最大100件、pubDate降順）
  const sorted = all
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 100);
  const allXml = rssXml("ジュンク堂: まとめ（全カテゴリ）", "https://example.invalid", sorted);
  await fs.writeFile("docs/all.xml", allXml, "utf8");
  console.log("generated: docs/all.xml");
})();
