import fs from 'node:fs';
import path from 'node:path';
import { collisionMessage, planRedirects, redirectHtml } from './redirects.mjs';

const dist = path.join(process.cwd(), 'dist');
if (!fs.existsSync(dist)) {
  console.error('dist/ is missing. Run the site build before generating short URL redirects.');
  process.exit(1);
}

const { ok, collisions } = planRedirects();
for (const article of ok) {
  const html = redirectHtml(article.slug);
  const dir = path.join(dist, article.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dist, `${article.slug}.html`), html);
}

if (collisions.length) {
  console.error(collisionMessage(collisions));
  process.exit(1);
}

console.log(`Wrote ${ok.length} short URL redirect${ok.length === 1 ? '' : 's'}.`);
