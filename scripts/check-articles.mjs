import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';

const root = process.cwd();
const siteOrigin = 'https://intelligentiaantiqua.com';
const articlesDir = path.join(root, 'src/content/articles');
const pagesDir = path.join(root, 'src/pages');
const pillarsFile = path.join(root, 'src/data/pillars.ts');
const glossaryFile = path.join(root, 'src/data/glossary.ts');
const checkDist = process.argv.includes('--dist');

const pillars = [...fs.readFileSync(pillarsFile, 'utf8').matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);
const glossaryIds = [...fs.readFileSync(glossaryFile, 'utf8').matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);

const banned = [
  ['guaranteed', /\bguaranteed\b/i],
  ['unhackable', /\bunhackable\b/i],
  ['foolproof', /\bfoolproof\b/i],
  ['get rich', /get rich/i],
  ['risk-free', /risk-free/i],
  ['risk free', /risk free/i],
  ['act now', /\bact now\b/i],
  ['limited time', /limited time/i],
  ['last chance', /last chance/i],
  ["don't miss out", /don'?t miss out/i],
  ["before it's too late", /before it'?s too late/i],
];

const requiredKeys = [
  'title',
  'description',
  'slug',
  'pillar',
  'tags',
  'publishDate',
  'updatedDate',
  'sources',
  'readingLevel',
  'keyTakeaways',
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isRealDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function rawFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : '';
}

function rawDate(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})["']?\\s*$`, 'm'));
  return match ? match[1] : null;
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1);
    return url.toString();
  } catch {
    return value;
  }
}

function hasInlineLink(text) {
  return /\[[^\]]+\]\([^)\s]+\)/.test(text) || /<a\s[^>]*href=/.test(text);
}

function sectionsOf(body) {
  const parts = body.split(/^## /m);
  const sections = [{ heading: '(introduction)', content: parts[0] ?? '' }];
  for (const part of parts.slice(1)) {
    const [headingLine, ...rest] = part.split('\n');
    sections.push({ heading: headingLine.trim(), content: rest.join('\n') });
  }
  return sections;
}

function scanText(label, text, errors) {
  if (typeof text !== 'string') return;
  for (const [name, pattern] of banned) {
    if (pattern.test(text)) errors.push(`${label} contains banned phrase "${name}"`);
  }
  if (/lorem ipsum|REPLACE_ME|\bTODO\b/i.test(text)) {
    errors.push(`${label} still contains a placeholder`);
  }
}

function extractHttpUrls(body) {
  const urls = new Set();
  for (const match of body.matchAll(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) urls.add(match[1]);
  for (const match of body.matchAll(/href\s*=\s*["'](https?:\/\/[^"']+)["']/g)) urls.add(match[1]);
  for (const match of body.matchAll(/<(https?:\/\/[^>\s]+)>/g)) urls.add(match[1]);
  return [...urls];
}

function extractInternal(body) {
  const urls = [];
  for (const match of body.matchAll(/\[[^\]]*\]\((\/[^)\s]+)\)/g)) urls.push(match[1]);
  for (const match of body.matchAll(/(?:href|src)\s*=\s*["'](\/[^"']+)["']/g)) urls.push(match[1]);
  return urls;
}

function answerText(content) {
  const cleaned = content.replace(/import\s+.+from\s+['"].+['"];?/g, '');
  const lines = [];
  for (const line of cleaned.split('\n')) {
    if (!line.trim()) {
      if (lines.length) break;
      continue;
    }
    lines.push(line.trim());
  }
  return lines.join(' ');
}

function figureAlts(body) {
  const alts = [];
  for (const match of body.matchAll(/\balt=["']([^"']+)["']/g)) alts.push(match[1]);
  for (const match of body.matchAll(/!\[([^\]]*)\]\([^)]+\)/g)) alts.push(match[1]);
  return alts;
}

const genericAlt = /^(image|photo|picture|illustration|diagram|graphic|hero)$/i;

function validateArticle(fileName, raw, options = {}) {
  const errors = [];
  let parsed;
  try {
    parsed = matter(raw);
  } catch (error) {
    return [`could not parse frontmatter (${error.message})`];
  }
  const data = parsed.data ?? {};
  const body = parsed.content ?? '';
  const frontmatter = rawFrontmatter(raw);

  for (const key of requiredKeys) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      errors.push(`missing ${key}`);
    }
  }

  if (typeof data.title === 'string') scanText('title', data.title, errors);
  if (typeof data.description === 'string') {
    scanText('description', data.description, errors);
    const length = [...data.description].length;
    if (length > 160) errors.push(`description is ${length} characters (max 160)`);
    if (length === 0) errors.push('description is empty');
  } else if (data.description != null) {
    errors.push('description must be a string');
  }

  const slugFromFile = fileName.replace(/\.mdx?$/, '');
  if (typeof data.slug === 'string') {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) errors.push(`slug "${data.slug}" is not lowercase kebab-case`);
    if (data.slug !== slugFromFile) errors.push(`slug "${data.slug}" does not match filename "${slugFromFile}"`);
  }

  if (data.pillar != null && !pillars.includes(data.pillar)) {
    errors.push(`pillar "${data.pillar}" is not one of: ${pillars.join(', ')}`);
  }

  if (data.tags != null && (!Array.isArray(data.tags) || data.tags.length === 0 || data.tags.some((tag) => typeof tag !== 'string' || !tag.trim()))) {
    errors.push('tags must be a non-empty list of strings');
  }

  if (!['beginner', 'intermediate'].includes(data.readingLevel)) {
    errors.push('readingLevel must be beginner or intermediate');
  }

  if (data.keyTakeaways != null && (!Array.isArray(data.keyTakeaways) || data.keyTakeaways.length === 0)) {
    errors.push('keyTakeaways must be a non-empty list');
  }

  const publish = rawDate(frontmatter, 'publishDate');
  const updated = rawDate(frontmatter, 'updatedDate');
  if (!publish || !isRealDate(publish)) errors.push('publishDate must be a real YYYY-MM-DD date');
  if (!updated || !isRealDate(updated)) errors.push('updatedDate is missing or invalid');
  if (publish && updated && updated < publish) errors.push('updatedDate is earlier than publishDate');
  if (updated && updated > todayIso()) errors.push('updatedDate is in the future');

  if (!Array.isArray(data.sources)) {
    errors.push('sources must be a list');
  } else {
    if (data.sources.length < 3) errors.push(`only ${data.sources.length} source(s); need at least 3`);
    data.sources.forEach((source, index) => {
      const label = `source ${index + 1}`;
      if (!source || typeof source !== 'object') {
        errors.push(`${label} is not an object`);
        return;
      }
      for (const field of ['title', 'url', 'publisher', 'accessed']) {
        if (typeof source[field] !== 'string' || !source[field].trim()) errors.push(`${label} is missing ${field}`);
      }
      if (typeof source.url === 'string') {
        let parsedUrl;
        try {
          parsedUrl = new URL(source.url);
        } catch {
          errors.push(`${label} URL is invalid`);
        }
        if (parsedUrl && parsedUrl.protocol !== 'https:') errors.push(`${label} URL must be https`);
        if (parsedUrl && ['example.com', 'example.org'].includes(parsedUrl.hostname)) {
          errors.push(`${label} still uses a placeholder host`);
        }
        if (typeof source.url === 'string' && !body.includes(source.url) && !body.includes(source.url.replace(/\/$/, ''))) {
          errors.push(`${label} URL is not linked in the article body`);
        }
      }
      if (typeof source.accessed === 'string' && !isRealDate(source.accessed)) {
        errors.push(`${label} accessed date is invalid`);
      }
    });
  }

  const sourceUrls = new Set(
    (Array.isArray(data.sources) ? data.sources : [])
      .map((source) => (typeof source?.url === 'string' ? normalizeUrl(source.url) : null))
      .filter(Boolean),
  );
  for (const url of extractHttpUrls(body)) {
    if (!sourceUrls.has(normalizeUrl(url))) {
      errors.push(`external link is not in the sources list: ${url}`);
    }
  }

  if (!/not professional advice/i.test(body)) {
    errors.push('missing the disclaimer phrase "not professional advice"');
  }

  for (const section of sectionsOf(body)) {
    const meaningful = section.content.replace(/import\s+.+from\s+['"].+['"];?/g, '').trim();
    if (!meaningful && section.heading === '(introduction)') continue;
    if (!meaningful) {
      errors.push(`section "${section.heading}" is empty`);
      continue;
    }
    if (!hasInlineLink(section.content)) {
      errors.push(`section "${section.heading}" has no inline link`);
    }
    const isDisclaimer = /^a note on advice\b/i.test(section.heading);
    if (section.heading !== '(introduction)' && !isDisclaimer) {
      if (!section.heading.trim().endsWith('?')) {
        errors.push(`heading "${section.heading}" must be a question ending in ?`);
      }
      const answer = answerText(section.content);
      if (/^<(Figure|img)\b/i.test(answer)) {
        errors.push(`section "${section.heading}" starts with a diagram; answer the question in a sentence first`);
      } else if ([...answer].length < 40) {
        errors.push(`section "${section.heading}" must answer the question in the opening sentence`);
      }
    }
  }

  const alts = figureAlts(body).filter((alt) => [...alt].length >= 24 && !genericAlt.test(alt.trim()));
  if (alts.length < 2) {
    errors.push(`need at least 2 explanatory diagrams with descriptive alt text (found ${alts.length})`);
  }

  if (typeof data.featuredImage !== 'string' || !/^\/images\/.+\.(svg|webp|avif|png)$/.test(data.featuredImage)) {
    errors.push('featuredImage must be a path like /images/articles/slug.svg');
  } else if (options.checkAssets) {
    const asset = path.join(root, 'public', data.featuredImage.replace(/^\//, ''));
    if (!fs.existsSync(asset)) errors.push(`featured image file is missing: ${data.featuredImage}`);
  }
  if (typeof data.featuredImageAlt !== 'string' || [...data.featuredImageAlt].length < 40 || genericAlt.test(data.featuredImageAlt.trim())) {
    errors.push('featuredImageAlt must be a descriptive sentence of at least 40 characters');
  }
  for (const field of ['featuredImageWidth', 'featuredImageHeight']) {
    if (typeof data[field] !== 'number' || data[field] <= 0) errors.push(`${field} must be a positive number`);
  }

  const prose = [
    body,
    ...(Array.isArray(data.keyTakeaways) ? data.keyTakeaways : []),
    ...(Array.isArray(data.faq) ? data.faq.flatMap((item) => [item?.question, item?.answer]) : []),
    ...(Array.isArray(data.tags) ? data.tags : []),
  ].join('\n');
  scanText('article text', prose, errors);

  if (Array.isArray(data.faq)) {
    data.faq.forEach((item, index) => {
      if (!item?.question || !item?.answer) errors.push(`FAQ ${index + 1} needs a question and answer`);
    });
  }

  if (data.safetyKitCta != null && data.safetyKitCta !== true && data.safetyKitCta !== false) {
    errors.push('safetyKitCta must be true or false');
  }
  const ctaTag = body.search(/<SafetyKitCTA\b/);
  const noteHeading = body.search(/^## A note on advice\s*$/m);
  if (data.safetyKitCta === true) {
    if (ctaTag === -1) errors.push('safetyKitCta is true but the article does not include <SafetyKitCTA />');
    else if (noteHeading === -1 || ctaTag > noteHeading) {
      errors.push('SafetyKitCTA must appear before the "A note on advice" section');
    }
    const ctaPath = path.join(root, 'src/components/SafetyKitCTA.astro');
    const ctaSource = fs.existsSync(ctaPath) ? fs.readFileSync(ctaPath, 'utf8') : '';
    if (!ctaSource.includes('safetyKitDisclosure')) {
      errors.push('SafetyKitCTA must render safetyKitDisclosure');
    }
    errors.push(...disclosureProblems());
  } else if (ctaTag !== -1) {
    errors.push('SafetyKitCTA is included but safetyKitCta is not true');
  }

  return errors;
}

function selfTest() {
  const failures = [];
  const base = `---
title: "A fine title"
description: "Short description."
slug: fine-title
pillar: ai-basics
tags:
  - beginners
publishDate: 2026-11-01
updatedDate: 2026-11-19
readingLevel: beginner
featuredImage: "/images/articles/what-is-ai.svg"
featuredImageAlt: "A descriptive featured image alt text that explains the picture for someone who cannot see it."
featuredImageWidth: 800
featuredImageHeight: 450
keyTakeaways:
  - "One idea."
sources:
  - title: "OECD AI Principles"
    url: "https://oecd.ai/en/ai-principles"
    publisher: "OECD"
    accessed: "2026-11-19"
  - title: "NIST AI RMF"
    url: "https://www.nist.gov/itl/ai-risk-management-framework"
    publisher: "NIST"
    accessed: "2026-11-19"
  - title: "NIST AI 600-1"
    url: "https://doi.org/10.6028/NIST.AI.600-1"
    publisher: "NIST"
    accessed: "2026-11-19"
---

See the [OECD principles](https://oecd.ai/en/ai-principles).

## What does this section explain?

The [NIST framework](https://www.nist.gov/itl/ai-risk-management-framework) is voluntary guidance for managing AI risk. The [Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1) names confabulation.

<img alt="A diagram of an input arrow entering a box labeled model and leaving as a written output." src="/diagrams/ai-input-model-output.svg" width="520" height="280" />
<img alt="A second diagram showing a confident sentence beside a separate source document used to check it." src="/diagrams/ai-confident-versus-checked.svg" width="520" height="300" />

## A note on advice

This page is general education, not professional advice. Read the [disclaimer](/disclaimer/).
`;
  const ok = validateArticle('fine-title.md', base);
  if (ok.length) failures.push(`valid fixture failed: ${ok.join('; ')}`);

  const tooLong = base.replace('Short description.', 'x'.repeat(161));
  if (!validateArticle('fine-title.md', tooLong).some((error) => error.includes('160'))) {
    failures.push('did not catch a long description');
  }
  const hype = base.replace('See the', 'See the guaranteed');
  if (!validateArticle('fine-title.md', hype).some((error) => error.includes('guaranteed'))) {
    failures.push('did not catch hype language');
  }
  const noLink = base.replace(
    '## What does this section explain?\n\nThe [NIST framework](https://www.nist.gov/itl/ai-risk-management-framework) is voluntary guidance for managing AI risk. The [Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1) names confabulation.',
    '## What does this section explain?\n\nNo source in this section at all, just a long enough claim without any link here.',
  );
  if (!validateArticle('fine-title.md', noLink).some((error) => error.includes('no inline link'))) {
    failures.push('did not catch a section without a link');
  }
  const optedIn = base.replace('readingLevel: beginner', 'readingLevel: beginner\nsafetyKitCta: true');
  if (!validateArticle('fine-title.md', optedIn).some((error) => error.includes('<SafetyKitCTA />'))) {
    failures.push('did not catch safetyKitCta without the component');
  }
  const withCta = optedIn.replace('## A note on advice', '<SafetyKitCTA />\n\n## A note on advice');
  const ctaErrors = validateArticle('fine-title.md', withCta);
  if (ctaErrors.some((error) => /SafetyKitCTA must appear|does not include <SafetyKitCTA/.test(error))) {
    failures.push(`valid safety kit fixture failed: ${ctaErrors.join('; ')}`);
  }
  if (failures.length) {
    console.error('Self-test failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('Self-test passed.');
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function pageRoute(file) {
  let rel = path.relative(pagesDir, file).split(path.sep).join('/');
  if (rel === 'rss.xml.ts') return '/rss.xml';
  if (!rel.endsWith('.astro')) return null;
  rel = rel.slice(0, -'.astro'.length);
  if (rel === '404') return null;
  if (rel.includes('[')) return null;
  if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  if (rel === 'index') rel = '';
  if (!rel) return '/';
  return `/${rel}/`;
}

function normalizeRoute(pathname) {
  if (!pathname.startsWith('/')) return null;
  if (pathname === '/') return '/';
  const hasExtension = /\.[a-z0-9]+$/i.test(pathname);
  if (hasExtension) return pathname;
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function idsInFile(file, seen = new Set()) {
  if (!file || seen.has(file) || !fs.existsSync(file)) return [];
  seen.add(file);
  const text = fs.readFileSync(file, 'utf8');
  const ids = [...text.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const match of text.matchAll(/from\s+['"](\.[^'"]+\.astro)['"]/g)) {
    ids.push(...idsInFile(path.resolve(path.dirname(file), match[1]), seen));
  }
  return ids;
}

function headingIds(body) {
  const slugger = new GithubSlugger();
  const ids = [];
  for (const match of body.matchAll(/^(#{1,6})\s+(.+)$/gm)) {
    ids.push(slugger.slug(match[2].trim()));
  }
  return ids;
}

function collectSite() {
  const routes = new Set(['/']);
  const anchors = new Map();
  const add = (route, ids) => {
    routes.add(route);
    const set = anchors.get(route) ?? new Set(['main']);
    for (const id of ids) set.add(id);
    anchors.set(route, set);
  };

  for (const file of walk(path.join(root, 'public'))) {
    const rel = path.relative(path.join(root, 'public'), file).split(path.sep).join('/');
    routes.add(`/${rel}`);
  }

  for (const file of walk(pagesDir)) {
    const route = pageRoute(file);
    if (route) add(route, idsInFile(file));
  }

  const articleLayout = path.join(root, 'src/layouts/Article.astro');
  const articleIds = idsInFile(articleLayout);
  if (fs.existsSync(articlesDir)) {
    for (const file of fs.readdirSync(articlesDir).filter((name) => /\.mdx?$/.test(name))) {
      const raw = fs.readFileSync(path.join(articlesDir, file), 'utf8');
      const parsed = matter(raw);
      if (parsed.data.draft) continue;
      const slug = parsed.data.slug;
      add(`/articles/${slug}/`, [...articleIds, ...headingIds(parsed.content)]);
    }
  }

  const glossaryRoute = '/glossary/';
  const glossaryAnchors = anchors.get(glossaryRoute) ?? new Set(['main']);
  for (const id of glossaryIds) glossaryAnchors.add(id);
  for (const id of glossaryIds) {
    const letter = id[0]?.toLowerCase();
    if (letter) glossaryAnchors.add(`letter-${letter}`);
  }
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach((letter) => glossaryAnchors.add(`letter-${letter}`));
  anchors.set(glossaryRoute, glossaryAnchors);
  routes.add(glossaryRoute);

  return { routes, anchors };
}

function checkInternalLinks() {
  const { routes, anchors } = collectSite();
  const errors = [];
  const files = walk(path.join(root, 'src')).filter((file) => /\.(astro|md|mdx)$/.test(file));

  const consider = (from, raw) => {
    if (!raw || raw.startsWith('http') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('#')) return;
    const hashIndex = raw.indexOf('#');
    const pathPart = hashIndex === -1 ? raw : raw.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : decodeURIComponent(raw.slice(hashIndex + 1));
    const route = normalizeRoute(pathPart.split('?')[0]);
    if (!route) return;
    if (!routes.has(route)) {
      errors.push(`${from} links to missing route ${raw}`);
      return;
    }
    if (hash) {
      const known = anchors.get(route);
      if (known && !known.has(hash)) errors.push(`${from} links to missing anchor ${raw}`);
    }
  };

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(root, file);
    for (const raw of extractInternal(text)) consider(rel, raw);
  }
  return errors;
}

function checkBuiltHtml() {
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(dist)) {
    console.error('dist/ is missing. Run npm run build before --dist.');
    process.exit(1);
  }
  const routes = new Map();
  const walkDist = walk(dist);
  for (const file of walkDist) {
    if (!file.endsWith('.html')) continue;
    let rel = path.relative(dist, file).split(path.sep).join('/');
    if (rel === '404.html') continue;
    let route;
    if (rel === 'index.html') route = '/';
    else if (rel.endsWith('/index.html')) route = `/${rel.slice(0, -'index.html'.length)}`;
    else route = `/${rel}`;
    routes.set(route, file);
  }
  for (const file of walkDist) {
    if (file.endsWith('.html')) continue;
    const rel = `/${path.relative(dist, file).split(path.sep).join('/')}`;
    routes.set(rel, file);
  }

  const errors = [];
  for (const [route, file] of routes) {
    if (!file.endsWith('.html')) continue;
    const html = fs.readFileSync(file, 'utf8');
    const refs = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map((match) => match[1]);
    for (const ref of refs) {
      if (!ref || ref.startsWith('http') || ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('data:')) continue;
      const base = route.endsWith('/') ? `${siteOrigin}${route}` : `${siteOrigin}${route}/`;
      const url = new URL(ref, base);
      if (url.origin !== siteOrigin) continue;
      const target = normalizeRoute(url.pathname) ?? url.pathname;
      const targetFile = routes.get(target) || routes.get(url.pathname);
      if (!targetFile) {
        errors.push(`${route} -> missing ${ref}`);
        continue;
      }
      if (url.hash && targetFile.endsWith('.html')) {
        const targetHtml = fs.readFileSync(targetFile, 'utf8');
        const targetIds = new Set([...targetHtml.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]));
        const id = decodeURIComponent(url.hash.slice(1));
        if (id && !targetIds.has(id)) errors.push(`${route} -> missing anchor ${ref}`);
      }
    }
  }
  return errors;
}

function checkBrandVoice() {
  const errors = [];
  const voicePath = path.join(root, 'docs/brand-voice.md');
  if (!fs.existsSync(voicePath)) {
    errors.push('docs/brand-voice.md is missing. Article automation must follow it.');
    return errors;
  }
  const voice = fs.readFileSync(voicePath, 'utf8');
  for (const bit of [
    'Bold and unapologetic',
    'Exacting',
    'Playful',
    'Warm to the curious',
    'Feminine and freedom-loving',
    'Creator Rogenie',
    'safety',
  ]) {
    if (!voice.includes(bit)) errors.push(`docs/brand-voice.md is missing "${bit}"`);
  }
  for (const rel of [
    'docs/style-guide.md',
    'docs/quality-gate.md',
    'docs/article-template.md',
    'docs/publishing.md',
  ]) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    if (!text.includes('brand-voice.md')) errors.push(`${rel} must reference docs/brand-voice.md`);
  }
  return errors;
}

const disclosureBits = ['financial interest', 'never require buying anything', 'free method', 'convenience'];
const claimPattern = /\b(stops|prevents|guarantees|guaranteed)\b|protection against/i;

function readSiteSource() {
  return fs.readFileSync(path.join(root, 'src/data/site.ts'), 'utf8');
}

function safetyKitDisclosureText() {
  const match = readSiteSource().match(/export const safetyKitDisclosure =\s*'([^']*)'/);
  return match ? match[1] : '';
}

function safetyKitAmazonUrl() {
  const match = readSiteSource().match(/const safetyKitAmazonUrl: string = '([^']*)'/);
  return match ? match[1] : '';
}

function safetyKitPreorderUrl() {
  const match = readSiteSource().match(/const safetyKitPreorderUrl = '([^']*)'/);
  return match ? match[1] : '';
}

function safetyKitPrice() {
  const match = readSiteSource().match(/const safetyKitPrice = (\d+(?:\.\d+)?);/);
  return match ? match[1] : '';
}

function disclosureProblems() {
  const disclosure = safetyKitDisclosureText();
  const problems = [];
  if (!disclosure) problems.push('safetyKitDisclosure must be a single-quoted string in src/data/site.ts');
  for (const bit of disclosureBits) {
    if (!disclosure.toLowerCase().includes(bit.toLowerCase())) {
      problems.push(`safetyKitDisclosure is missing "${bit}"`);
    }
  }
  if (claimPattern.test(disclosure)) {
    problems.push('safetyKitDisclosure must not say the kit stops, prevents, or guarantees protection');
  }
  return problems;
}

function checkSafetyKitPage() {
  const errors = [...disclosureProblems()];
  const pagePath = path.join(root, 'src/pages/safety-kit.astro');
  if (!fs.existsSync(pagePath)) {
    errors.push('src/pages/safety-kit.astro is missing');
    return errors;
  }
  const page = fs.readFileSync(pagePath, 'utf8');
  if (!page.includes('safetyKitDisclosure')) errors.push('safety-kit page must show safetyKitDisclosure');
  if (/aggregateRating|reviewCount|ratingValue/i.test(page)) {
    errors.push('safety-kit page must not include ratings or reviews');
  }
  const preorderUrl = safetyKitPreorderUrl();
  const price = safetyKitPrice();
  const amazonUrl = safetyKitAmazonUrl();
  const listed = amazonUrl.startsWith('https://');
  const preordering = !listed && preorderUrl.startsWith('https://');
  if (preordering) {
    if (!page.includes('Pre-order now:')) errors.push('safety-kit page must include the pre-order button');
    if (!page.includes('preorderUrl')) errors.push('safety-kit page must use safetyKit.preorderUrl');
    if (!page.includes('href="/refunds/"')) errors.push('safety-kit page must link to /refunds/');
    if (!page.includes('safetyKitProduct')) errors.push('safety-kit page must include the product schema while pre-orders are open');
    if (price !== '38.28') errors.push('safetyKit price must be 38.28 USD while the pre-order link is set');
    if (preorderUrl !== 'https://buy.stripe.com/00w3cvbsL2k5390gtw9R602') {
      errors.push('safetyKit pre-order URL must be the Family AI Safety Kit Stripe link');
    }
  } else if (!listed) {
    if (!/not yet for sale/i.test(page)) errors.push('safety-kit page must include a not-yet-for-sale note');
    if (!/coming soon/i.test(page)) errors.push('safety-kit page must include a coming-soon note');
  }
  for (const rel of ['src/pages/safety-kit.astro', 'src/pages/refunds.astro', 'src/components/SafetyKitCTA.astro']) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    if (claimPattern.test(text)) {
      errors.push(`${rel} must not say the kit stops, prevents, or guarantees protection`);
    }
  }
  const cta = fs.readFileSync(path.join(root, 'src/components/SafetyKitCTA.astro'), 'utf8');
  if (!cta.includes('/safety-kit/')) errors.push('SafetyKitCTA must link to /safety-kit/');
  if (!cta.includes('/articles/ai-scams-voice-clones-and-deepfakes/')) {
    errors.push('SafetyKitCTA must link the voice-clone guide as the free method');
  }
  if (!cta.includes('safetyKitDisclosure')) errors.push('SafetyKitCTA must render safetyKitDisclosure');
  if (cta.includes('buy.stripe.com')) errors.push('SafetyKitCTA must link to /safety-kit/, not the Stripe checkout');
  const footer = fs.readFileSync(path.join(root, 'src/components/Footer.astro'), 'utf8');
  const header = fs.readFileSync(path.join(root, 'src/components/Header.astro'), 'utf8');
  if (!footer.includes('/safety-kit/')) errors.push('footer must link to /safety-kit/');
  if (!header.includes('/safety-kit/')) errors.push('header must link to /safety-kit/');
  if (!footer.includes('/refunds/')) errors.push('footer must link to /refunds/');
  if (!fs.existsSync(path.join(root, 'src/pages/refunds.astro'))) errors.push('src/pages/refunds.astro is missing');
  const privacy = fs.readFileSync(path.join(root, 'src/pages/privacy.astro'), 'utf8');
  if (preordering) {
    if (!/stripe/i.test(privacy)) errors.push('privacy page must say payments are processed by Stripe');
    if (!/shipping address/i.test(privacy)) errors.push('privacy page must say we receive the shipping address');
    if (!/name, email/i.test(privacy)) errors.push('privacy page must say we receive the name and email');
  }
  const contact = fs.readFileSync(path.join(root, 'src/pages/contact.astro'), 'utf8');
  if (!contact.includes('Orders and refunds')) errors.push('contact page must include an Orders and refunds section');
  if (!contact.includes('/refunds/')) errors.push('contact page must link to /refunds/');
  if (!contact.includes('hello@intelligentiaantiqua.com') && !contact.includes('site.email')) {
    errors.push('contact page must show hello@intelligentiaantiqua.com');
  }
  for (const rel of ['src/pages/about.astro', 'src/pages/affiliate-disclosure.astro', 'src/pages/editorial-policy.astro']) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    if (!text.includes('Family AI Safety Kit')) errors.push(`${rel} must disclose the Family AI Safety Kit`);
  }
  const voice = fs.readFileSync(path.join(articlesDir, 'ai-scams-voice-clones-and-deepfakes.mdx'), 'utf8');
  if (!/^safetyKitCta:\s*true\s*$/m.test(voice)) {
    errors.push('voice-clone guide must set safetyKitCta: true');
  }
  return errors;
}

function checkSafetyKitDist() {
  const errors = [];
  const disclosure = safetyKitDisclosureText();
  const amazonUrl = safetyKitAmazonUrl();
  const preorderUrl = safetyKitPreorderUrl();
  const listed = amazonUrl.startsWith('https://');
  const preordering = !listed && preorderUrl.startsWith('https://');
  const dist = path.join(root, 'dist');
  const kitFile = path.join(dist, 'safety-kit/index.html');
  if (!fs.existsSync(kitFile)) {
    errors.push('dist/safety-kit/index.html is missing');
  } else {
    const html = fs.readFileSync(kitFile, 'utf8');
    if (disclosure && !html.includes(disclosure)) errors.push('built safety-kit page is missing the product disclosure');
    if (/aggregateRating|reviewCount|ratingValue/i.test(html)) {
      errors.push('built safety-kit page includes a rating or review');
    }
    if (claimPattern.test(html)) {
      errors.push('built safety-kit page must not say the kit stops, prevents, or guarantees protection');
    }
    if (listed) {
      if (!html.includes('View on Amazon')) errors.push('built safety-kit page is missing the Amazon link');
    } else if (preordering) {
      const button = 'Pre-order now: $38.28, free US shipping';
      if (!html.includes(button)) errors.push(`built safety-kit page is missing the button "${button}"`);
      if (!html.includes(`href="${preorderUrl}"`)) errors.push('built pre-order button does not use the Stripe URL');
      if (!html.includes('ships within 4-6 weeks')) errors.push('built safety-kit page is missing the ship window');
      if (!html.includes('Full refund anytime before it ships')) errors.push('built safety-kit page is missing the refund sentence');
      if (!html.includes('href="/contact/"')) errors.push('built safety-kit page must link the contact URL');
      if (!html.includes('Charges appear as 9NTH DIMENSION')) errors.push('built safety-kit page is missing the card-statement line');
      if (!html.includes('sales tax where applicable') || !html.includes('US shipping addresses only') || !html.includes('Quantity 1–5')) {
        errors.push('built safety-kit page is missing tax, US-only, or quantity details');
      }
      if (!html.includes('4 write-in family code-word wallet cards')) errors.push('built safety-kit page is missing the card count');
      if (!html.includes('large-print fridge magnet')) errors.push('built safety-kit page is missing the magnet');
      if (!html.includes('6 sliding webcam covers')) errors.push('built safety-kit page is missing the webcam covers');
      if (!html.includes('QR code')) errors.push('built safety-kit page is missing the setup-card QR code');
      if (html.includes('The waitlist opens soon') || html.includes('<form')) {
        errors.push('built safety-kit page still shows the waitlist while pre-orders are open');
      }
      if (/not yet for sale/i.test(html)) errors.push('built safety-kit page still says the kit is not yet for sale');
      const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (!ldMatch) errors.push('built safety-kit page is missing JSON-LD');
      else {
        const graph = JSON.parse(ldMatch[1])['@graph'] ?? [];
        const product = graph.find((node) => node['@type'] === 'Product');
        const offer = product?.offers;
        if (!product) errors.push('built safety-kit page is missing Product schema');
        if (product?.name !== 'Family AI Safety Kit') errors.push('built Product name must be Family AI Safety Kit');
        if (offer?.['@type'] !== 'Offer') errors.push('built safety-kit page is missing an Offer');
        if (offer?.price !== '38.28' || offer?.priceCurrency !== 'USD') {
          errors.push('built Offer must be price 38.28 USD');
        }
        if (offer?.availability !== 'https://schema.org/PreOrder') {
          errors.push('built Offer availability must be https://schema.org/PreOrder');
        }
        if (offer?.url !== preorderUrl) errors.push('built Offer url must be the Stripe link');
        const rate = offer?.shippingDetails?.shippingRate;
        const country = offer?.shippingDetails?.shippingDestination?.addressCountry;
        if (rate?.value !== '0' || rate?.currency !== 'USD' || country !== 'US') {
          errors.push('built Offer must include free shipping to the US');
        }
        if (product?.brand?.name !== 'Intelligentia Antiqua') errors.push('built Product brand must be Intelligentia Antiqua');
        if (offer?.eligibleQuantity?.minValue !== 1 || offer?.eligibleQuantity?.maxValue !== 5) {
          errors.push('built Offer quantity must be 1 to 5');
        }
      }
    } else {
      if (/"@type"\s*:\s*"Product"/.test(html) || /"@type"\s*:\s*"Offer"/.test(html)) {
        errors.push('built safety-kit page uses Product or Offer schema before a pre-order or Amazon link is set');
      }
      if (!/not yet for sale/i.test(html)) errors.push('built safety-kit page is missing the not-yet-for-sale note');
    }
  }
  if (preordering) {
    const refunds = path.join(dist, 'refunds/index.html');
    if (!fs.existsSync(refunds)) errors.push('dist/refunds/index.html is missing');
    else {
      const refundHtml = fs.readFileSync(refunds, 'utf8');
      if (!refundHtml.includes('Full refund') && !refundHtml.includes('full refund')) {
        errors.push('built refunds page is missing the full-refund statement');
      }
      if (claimPattern.test(refundHtml)) {
        errors.push('built refunds page must not say the kit stops, prevents, or guarantees protection');
      }
    }
  }

  const sitemap = walk(dist)
    .filter((file) => file.endsWith('.xml') && path.basename(file).includes('sitemap'))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  if (!sitemap.includes('https://intelligentiaantiqua.com/safety-kit/')) errors.push('sitemap is missing /safety-kit/');
  if (preordering && !sitemap.includes('https://intelligentiaantiqua.com/refunds/')) {
    errors.push('sitemap is missing /refunds/');
  }

  const llmsPath = path.join(dist, 'llms.txt');
  if (!fs.existsSync(llmsPath) || !fs.readFileSync(llmsPath, 'utf8').includes('https://intelligentiaantiqua.com/safety-kit/')) {
    errors.push('llms.txt is missing the Family AI Safety Kit page');
  }

  for (const file of fs.readdirSync(articlesDir).filter((name) => /\.mdx?$/.test(name))) {
    const parsed = matter(fs.readFileSync(path.join(articlesDir, file), 'utf8'));
    if (parsed.data.safetyKitCta !== true || parsed.data.draft) continue;
    const htmlPath = path.join(dist, 'articles', parsed.data.slug, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      errors.push(`${file} safetyKitCta page was not built`);
      continue;
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    if (!html.includes('safety-kit-cta')) errors.push(`${file} built page is missing the Safety Kit callout`);
    if (disclosure && !html.includes(disclosure)) errors.push(`${file} built page is missing the Safety Kit disclosure`);
    const ctaAt = html.indexOf('class="safety-kit-cta"');
    const noteAt = html.indexOf('id="a-note-on-advice"');
    if (noteAt === -1) errors.push(`${file} built page is missing the advice-note heading`);
    else if (ctaAt === -1 || ctaAt > noteAt) errors.push(`${file} Safety Kit callout renders after the advice note`);
    if (!listed && !html.includes('href="/safety-kit/"')) {
      errors.push(`${file} Safety Kit callout should link to /safety-kit/ while amazonUrl is empty`);
    }
    if (preordering && !/pre-order/i.test(html)) {
      errors.push(`${file} Safety Kit callout should use pre-order wording`);
    }
    if (preordering && html.includes('buy.stripe.com')) {
      errors.push(`${file} Safety Kit callout must not link straight to Stripe`);
    }
    if (claimPattern.test(html.slice(Math.max(ctaAt, 0), ctaAt + 1200))) {
      errors.push(`${file} Safety Kit callout must not say the kit stops, prevents, or guarantees protection`);
    }
  }
  return errors;
}

function checkPublishingStatement() {
  const errors = [];
  const needle = 'must pass an automated quality gate before publishing';
  const siteText = fs.readFileSync(path.join(root, 'src/data/site.ts'), 'utf8');
  if (!siteText.includes(needle)) errors.push('src/data/site.ts is missing the publishing statement');
  for (const rel of ['src/pages/index.astro', 'src/pages/about.astro', 'src/pages/editorial-policy.astro']) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    if (!text.includes(needle) && !text.includes('publishingStatement')) {
      errors.push(`${rel} is missing the publishing statement`);
    }
    if (/human reviews every|reviewed by a human before every/i.test(text)) {
      errors.push(`${rel} must not claim a human reviews every merge`);
    }
  }
  const footer = fs.readFileSync(path.join(root, 'src/components/Footer.astro'), 'utf8');
  if (!footer.includes('9nth Dimension') && !(footer.includes('companyLine') && siteText.includes('9nth Dimension'))) {
    errors.push('footer must say the site is a 9nth Dimension company');
  }
  const about = fs.readFileSync(path.join(root, 'src/pages/about.astro'), 'utf8');
  if (!about.includes('9nth Dimension')) errors.push('about page must name 9nth Dimension');
  return errors;
}

function main() {
  selfTest();
  const files = fs.readdirSync(articlesDir).filter((name) => /\.mdx?$/.test(name));
  const seenTitles = new Map();
  const seenSlugs = new Map();
  const problems = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(articlesDir, file), 'utf8');
    const errors = validateArticle(file, raw, { checkAssets: true });
    const data = matter(raw).data;
    if (typeof data.title === 'string') {
      const key = data.title.trim().toLowerCase();
      if (seenTitles.has(key)) errors.push(`duplicate title also used by ${seenTitles.get(key)}`);
      else seenTitles.set(key, file);
    }
    if (typeof data.slug === 'string') {
      if (seenSlugs.has(data.slug)) errors.push(`duplicate slug also used by ${seenSlugs.get(data.slug)}`);
      else seenSlugs.set(data.slug, file);
    }
    if (errors.length) problems.push({ file, errors });
  }

  const linkErrors = checkInternalLinks();
  if (linkErrors.length) problems.push({ file: 'internal links', errors: linkErrors });

  const statementErrors = checkPublishingStatement();
  if (statementErrors.length) problems.push({ file: 'publishing statement', errors: statementErrors });

  const kitErrors = checkSafetyKitPage();
  if (kitErrors.length) problems.push({ file: 'safety kit', errors: kitErrors });

  const voiceErrors = checkBrandVoice();
  if (voiceErrors.length) problems.push({ file: 'brand voice', errors: voiceErrors });

  if (checkDist) {
    const built = checkBuiltHtml();
    if (built.length) problems.push({ file: 'built HTML', errors: built });
    const home = path.join(root, 'dist/index.html');
    const llms = path.join(root, 'dist/llms.txt');
    const distErrors = [];
    if (!fs.existsSync(home) || !fs.readFileSync(home, 'utf8').includes('9nth Dimension')) {
      distErrors.push('built home page is missing the 9nth Dimension line');
    }
    if (!fs.existsSync(llms) || !fs.readFileSync(llms, 'utf8').includes('automated quality gate before publishing')) {
      distErrors.push('built llms.txt is missing the publishing statement');
    }
    const robots = path.join(root, 'dist/robots.txt');
    if (fs.existsSync(robots)) {
      const robotsText = fs.readFileSync(robots, 'utf8');
      for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
        if (!robotsText.includes(bot)) distErrors.push(`robots.txt does not name ${bot}`);
      }
    } else {
      distErrors.push('dist/robots.txt is missing');
    }
    if (distErrors.length) problems.push({ file: 'built site', errors: distErrors });
    const kitBuilt = checkSafetyKitDist();
    if (kitBuilt.length) problems.push({ file: 'safety kit build', errors: kitBuilt });
  }

  if (problems.length) {
    console.error(`Article quality gate failed (${problems.reduce((sum, item) => sum + item.errors.length, 0)} problems):`);
    for (const problem of problems) {
      console.error(`\n${problem.file}`);
      for (const error of problem.errors) console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log(`Article quality gate passed (${files.length} articles, internal links ok${checkDist ? ', built HTML ok' : ''}).`);
}

main();
