import fs from "node:fs/promises";
import crypto from "node:crypto";

const BASE_URL = "https://gn-kby.github.io/book-json-to-rss/";

const sources = [
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
    slug: "shakai-jiji",
    title: "ジュンク堂: 社会時事",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%A4%BE%E4%BC%9A%E6%99%82%E4%BA%8B&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "keizai",
    title: "ジュンク堂: 経済",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%B5%8C%E6%B8%88&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "keiei",
    title: "ジュンク堂: 経営",
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E7%B5%8C%E5%96%B6&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank"
  },
  {
    slug: "seiji",
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

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "accept": "application/json"
    }
  });
  if (!res.ok) {
    throw new Error(`fetch failed ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function itemsFromZetacx(json) {
  if (!json || !Array.isArray(json.product_list)) return [];
  return json.product_list.map((it) => {
    const title = it.product_name || it.item_name || "タイトル不明";
    const author = it.author?.author_name || "";
    const publisher = it.publisher?.publisher_name || "";
    const isbn = it.isbn || it.product_id || "";
    const image = it.image?.image_path || "";
    let pubDate = new Date();
    const m = it.release?.release_date?.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      pubDate = new Date(Date.UTC(y, mo, d, 0, 0, 0));
    }
    const genres = Array.isArray(it.genre_list)
      ? it.genre_list.map((g) => g.genre_name).filter(Boolean)
      : [];

    return {
      title: author ? `${title}（${author}）` : title,
      link: isbn
        ? `https://www.junkudo.co.jp/search/?isbn=${encodeURIComponent(isbn)}`
        : "https://www.junkudo.co.jp/",
      guid: isbn || it.product_id || crypto.randomUUID(),
      pubDate,
      categories: genres,
      description: [
        publisher && `出版社: ${publisher}`,
        author && `著者: ${author}`,
        isbn && `ISBN: ${isbn}`,
        it.price?.tax_included_price && `価格(税込): ${it.price.tax_included_price}円`,
        image && `<img src="${image}" alt="${escapeHtml(title)}" referrerpolicy="no-referrer" />`
      ]
        .filter(Boolean)
        .join(" / ")
    };
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function cdata(s) {
  // CDATAの中に "]]>" が入ると壊れるため分割
  return `<![CDATA[${String(s).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

function rfc822(d) {
  return d instanceof Date ? d.toUTCString() : new Date(d).toUTCString();
}

function rssXml({ title, link, description, items, language = "ja" }) {
  const lastBuildDate = rfc822(new Date());
  const itemXml = items
    .map((it) => {
      const cats = (it.categories || [])
        .map((c) => `<category>${cdata(c)}</category>`)
        .join("");
      return [
        "<item>",
        `<title>${cdata(it.title)}</title>`,
        `<link>${cdata(it.link)}</link>`,
        `<guid isPermaLink="false">${cdata(it.guid)}</guid>`,
        `<pubDate>${rfc822(it.pubDate)}</pubDate>`,
        cats,
        `<description>${cdata(it.description)}</description>`,
        "</item>"
      ].join("");
    })
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0">`,
    `<channel>`,
    `<title>${cdata(title)}</title>`,
    `<link>${cdata(link)}</link>`,
    `<description>${cdata(description)}</description>`,
    `<language>${language}</language>`,
    `<lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `<ttl>240</ttl>`,
    itemXml,
    `</channel>`,
    `</rss>`
  ].join("\n");
}

async function writeRss(path, opts) {
  const xml = rssXml(opts);
  await fs.writeFile(path, xml, "utf8");
}

async function main() {
  await ensureDir("docs");

  const allItems = [];

  for (const src of sources) {
    const data = await fetchJson(src.url);
    const items = itemsFromZetacx(data);

    // 個別フィード
    const xmlPath = `docs/${src.slug}.xml`;
    await writeRss(xmlPath, {
      title: src.title,
      link: BASE_URL,
      description: "zetacx APIの検索結果をRSS化",
      items
    });

    // all 用に蓄積
    for (const it of items) {
      allItems.push({ ...it, _source: src.title });
    }
  }

  // 重複ISBN(guid)を除去し、pubDate降順で最大200件
  const deDup = new Map();
  for (const it of allItems) {
    if (!deDup.has(it.guid)) deDup.set(it.guid, it);
  }
  const merged = Array.from(deDup.values()).sort(
    (a, b) => b.pubDate - a.pubDate
  ).slice(0, 200);

  await writeRss("docs/all.xml", {
    title: "ジュンク堂: まとめ（全カテゴリ）",
    link: BASE_URL,
    description: "zetacx APIの検索結果をRSS化",
    items: merged
  });

  // index（簡易）
  const indexHtml = `<!doctype html>
<html lang="ja"><meta charset="utf-8">
<title>book-json-to-rss</title>
<body>
<h1>book-json-to-rss</h1>
<ul>
  ${sources
    .map(
      (s) => `<li><a href="./${s.slug}.xml">${escapeHtml(s.title)}</a></li>`
    )
    .join("")}
  <li><a href="./all.xml">まとめ（all）</a></li>
</ul>
</body></html>`;
  await fs.writeFile("docs/index.html", indexHtml, "utf8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
