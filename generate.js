const fs = require("fs");
const fetch = require("node-fetch");

const feeds = [
  {
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E6%96%B0%E6%9B%B8%E3%83%BB%E9%81%B8%E6%9B%B8&publication_date=2026/08/ALL/before&sort=-daterank",
    file: "shinsho-sensho.xml",
    title: "ジュンク堂: 新書・選書"
  },
  {
    url: "https://junkudo.search.zetacx.net/api/search/item?access_key=ty7VA*mT4ovvZhTsQPtMxo2G2QoKLx-C&count=20&page=1&adult_flg=2&publication_date=2026/08/ALL/before&genre_name=%E3%83%93%E3%82%B8%E3%83%8D%E3%82%B9&publication_date=2027%2FALL%2FALL%2Fbefore&sort=-daterank",
    file: "business.xml",
    title: "ジュンク堂: ビジネス"
  },
  // 他のURLもここに追加
];

async function fetchAndGenerate() {
  for (const feed of feeds) {
    console.log(`Fetching ${feed.title} ...`);
    const res = await fetch(feed.url);
    const json = await res.json();

    const items = (json?.items || [])
      .map(item => {
        const title = escapeXml(item.title);
        const link = escapeXml(item.url);
        const pubDate = new Date(item.pubdate).toUTCString();
        const description = `
出版社: ${item.publisher} / 著者: ${item.author} / ISBN: ${item.isbn} / 価格(税込): ${item.price}
<img src="${item.image}" alt="${escapeXml(item.title)}" referrerpolicy="no-referrer" />
`;

        return `
<item>
  <title><![CDATA[${title}]]></title>
  <link><![CDATA[${link}]]></link>
  <pubDate>${pubDate}</pubDate>
  <description><![CDATA[${description}]]></description>
</item>`;
      })
      .join("\n");

    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
<title><![CDATA[${feed.title}]]></title>
<link><![CDATA[${feed.url}]]></link>
<description><![CDATA[zetacx APIの検索結果をRSS化]]></description>
<language>ja</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<ttl>240</ttl>
${items}
</channel>
</rss>`;

    fs.writeFileSync(feed.file, rss, "utf8");
  }
}

function escapeXml(unsafe) {
  return unsafe ? unsafe.replace(/[<>&'"]/g, c => {
    return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c];
  }) : "";
}

fetchAndGenerate().catch(e => {
  console.error(e);
  process.exit(1);
});
