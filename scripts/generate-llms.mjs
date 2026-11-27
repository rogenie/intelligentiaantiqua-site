import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const root = process.cwd();
const site = 'https://intelligentiaantiqua.com';
const dir = path.join(root, 'src/content/articles');
const articles = fs
  .readdirSync(dir)
  .filter((name) => /\.mdx?$/.test(name))
  .map((name) => matter(fs.readFileSync(path.join(dir, name), 'utf8')).data)
  .filter((data) => !data.draft)
  .sort((a, b) => String(a.publishDate).localeCompare(String(b.publishDate)));

const publishing =
  'Articles are researched and drafted with automated tools, fact-checked in a second pass against primary sources, and must pass an automated quality gate before publishing. Corrections are welcome at https://intelligentiaantiqua.com/contact/.';

const siteSource = fs.readFileSync(path.join(root, 'src/data/site.ts'), 'utf8');
const founder = siteSource.match(/founder:\s*'([^']+)'/)?.[1] ?? 'Creator Rogenie';

const pages = [
  ['Start here', '/start-here/', 'The beginner path, in order.'],
  ['Guides', '/articles/', 'Every finished guide.'],
  ['Glossary', '/glossary/', 'Short definitions with the source for each word.'],
  ['Editorial policy', '/editorial-policy/', 'What a guide is allowed to say.'],
  ['Sourcing', '/sourcing/', 'Which documents we trust first.'],
  ['Corrections', '/corrections/', 'How to challenge a sentence, and the public log.'],
  ['Disclaimer', '/disclaimer/', 'Education, not professional advice.'],
  ['About', '/about/', 'Intelligentia Antiqua is a 9nth Dimension company.'],
  [
    'Family AI Safety Kit',
    '/safety-kit/',
    'Four write-in code-word cards, a call-back magnet, six webcam covers, and a setup card. Pre-order, $38.28, free US shipping. The voice-clone guide is the free method. The cards are a convenience.',
  ],
  ['Refunds', '/refunds/', 'A Family AI Safety Kit pre-order can be refunded in full anytime before it ships.'],
];

const llms = [
  '# Intelligentia Antiqua',
  '',
  '> Plain-English Super Intelligence (SI) guides for beginners, still widely called AI, in a direct voice. Every factual claim links to a standards body, a regulator, an official product document, or a scientific review. A polished pitch is not a source. This is education, not professional advice. Your time, your choices, and your mind stay yours.',
  '',
  `${founder} founded 9nth Dimension, which publishes this desk. Intelligentia Antiqua is Latin for “ancient intelligence.” ${publishing}`,
  '',
  '## Guides',
  '',
  ...articles.map(
    (article) => `- [${article.title}](${site}/articles/${article.slug}/): ${article.description}`,
  ),
  '',
  '## Site',
  '',
  ...pages.map(([title, href, text]) => `- [${title}](${site}${href}): ${text}`),
  '',
  '## Optional',
  '',
  `- [Full text summaries](${site}/llms-full.txt): key takeaways and sources for each guide.`,
  '',
];

const full = [
  '# Intelligentia Antiqua, full guide summaries',
  '',
  `> Use these summaries with the linked pages. The pages, not this file, are the source of truth. ${founder} is the founder. Updated dates are on each page. ${publishing}`,
  '',
  ...articles.flatMap((article) => {
    const takeaways = Array.isArray(article.keyTakeaways)
      ? article.keyTakeaways.map((item) => `- ${item}`).join('\n')
      : '';
    const sources = Array.isArray(article.sources)
      ? article.sources.map((source) => `- ${source.title} (${source.publisher}): ${source.url}`).join('\n')
      : '';
    return [
      `## ${article.title}`,
      '',
      `${site}/articles/${article.slug}/`,
      '',
      article.description,
      '',
      'Key takeaways:',
      '',
      takeaways,
      '',
      'Sources:',
      '',
      sources,
      '',
    ];
  }),
];

fs.writeFileSync(path.join(root, 'public/llms.txt'), `${llms.join('\n')}\n`);
fs.writeFileSync(path.join(root, 'public/llms-full.txt'), `${full.join('\n')}\n`);
console.log(`Wrote llms.txt and llms-full.txt for ${articles.length} guides.`);
