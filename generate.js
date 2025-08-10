// generate.mjs
import { writeFile } from "node:fs/promises";

const ACCESS_KEY = "ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C";
const BASE = "https://junkudo.search.zetacx.net/api/search/item";

// ここに欲しいカテゴリを全部列挙
const CATEGORIES = [
  { name: "shinsho-sensho", title: "ジュンク堂: 新書・選書", genre: "新書・選書" },
  { name: "bunko",          title: "ジュンク堂: 文庫",       genre: "文庫" },
  { name: "computer",       title: "ジュンク堂: コンピュータ", genre: "コンピュータ" },
  { name: "seiji",          title: "ジュンク堂: 政治",       genre: "政治" },
  { name: "keiei",          title: "ジュンク堂: 経営",       genre: "経営" },
  { name: "keizai",         title: "ジュンク堂: 経済",       genre: "経済" },
  { name: "business",       title: "ジュンク堂: ビジネス",   genre: "ビジネス" },
  { name: "shakai-jiji",    title: "ジュンク堂: 社会・時事", genre: "社会時事" },
];

const COMMON_QS = {
  access_key: ACCESS_KEY,
  adult_flg: 2,
  sort: "-daterank",
  page: 1,
  count: 30,
  // 「未来日より前」を拾うための上限。必要なら変えてOK（YYYY/MM/ALL/before）
  publication_date: "2026/08/ALL/before",
};

const toQS = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

const buildItem = (p) => {
  const isbn = p.isbn ?? "";
  const title = p.product_name ?? "本";
  const author = p.author?.author_name ?? "";
  const publisher = p.publisher?.publisher_name ?? "";
  const priceTaxIn = p.price?.tax_included_price != null ? `${p.price.tax_included_price}円` : "";
  const rel = (p.release?.release_date || "").replace(/^発売日：/, "");
  const link = `https://www.junkudo.co.jp/search/?isbn=${encodeURIComponent(isbn)}`;

  const desc = [
    author && `著者: ${author}`,
    publisher && `出版社: ${publisher}`,
    isbn && `ISBN: ${isbn}`,
    rel && `発売日: ${rel}`,
    priceTaxIn && `価格(税込): ${priceTaxIn}`,
  ]
    .filter(Boolean)
    .join(" / ");

  // pubDate はパースに失敗しづらいよう現在時刻に統一（必要なら rel を Date にしてもOK）
  const pubDate = new Date().toUTCString();

  return `
<item>
<title><![CDATA[ ${title} ]]></title>
<link><![CDATA[ ${link} ]]></link>
<guid isPermaLink="false"><![CDATA[ ${isbn || p.product_id} ]]></guid>
<pubDate>${pubDate}</pubDate>
<description><![CDATA[ ${desc} ]]></description>
</item>`.trim();
};

const buildRSS = (channelTitle, channelLink, itemsXML) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title><![CDATA[ ${channelTitle} ]]></title>
<link><![CDATA[ ${channelLink} ]]></link>
<description><![CDATA[ zetacx APIの検索結果をRSS化 ]]></description>
<language>ja</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<ttl>240</ttl>
${itemsXML.join("\n")}
</channel>
</rss>
`;

async function fetchCategory(genreName) {
  const url = `${BASE}?${toQS({
    ...COMMON_QS,
    genre_name: genreName,
  })}`;
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return {
    url,
    products: Array.isArray(json.product_list) ? json.product_list : [],
  };
}

async function main() {
  const allItems = [];

  for (const cat of CATEGORIES) {
    const { url, products } = await fetchCategory(cat.genre);
    const itemsXML = products.map(buildItem);
    const rss = buildRSS(cat.title, url, itemsXML);
    await writeFile(`${cat.name}.xml`, rss, "utf8");
    allItems.push(...itemsXML);
    console.log(`wrote: ${cat.name}.xml (${products.length} items)`);
  }

  // まとめ（全カテゴリ）: 最新順の見栄えを保つため直近 200 件までに制限
  const allRss = buildRSS(
    "ジュンク堂: まとめ（全カテゴリ）",
    "https://gn-kby.github.io/book-json-to-rss/",
    allItems.slice(0, 200)
  );
  await writeFile(`all.xml`, allRss, "utf8");
  console.log(`wrote: all.xml (${Math.min(allItems.length, 200)} items)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
