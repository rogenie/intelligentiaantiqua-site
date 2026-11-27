# Quality gate

`npm run check:articles` checks every file in `src/content/articles`. It fails the command, and CI fails the pull request, when any check below fails. `npm run build` then `npm run check:articles -- --dist` also checks links in the built HTML.

The gate is mechanical. It cannot tell whether a sentence fairly represents its source, or whether it sounds like the brand. Those are human jobs, listed at the bottom. Personality is in [brand-voice.md](brand-voice.md). File shape is in [style-guide.md](style-guide.md).

The script also fails if `docs/brand-voice.md` is missing, if that file drops the voice rules (bold, exacting, playful, warm, feminine and freedom-loving, and Creator Rogenie as the founder who sets the voice), or if this page, the style guide, the article template, or the publishing doc stops pointing at it. Future article automation reads that file before it drafts.

## Automated checks

The script fails if an article:

- Is missing required frontmatter: `title`, `description`, `slug`, `pillar`, `tags`, `publishDate`, `updatedDate`, `sources`, `readingLevel`, `keyTakeaways`. `author` may be omitted and defaults to “Intelligentia Antiqua Research Desk.” `draft` defaults to false. `faq`, `howTo`, and `reviewedBy` are optional.
- Has a `description` longer than 160 characters.
- Has a `slug` that is not lowercase kebab-case or does not match the filename.
- Uses a `pillar` outside the six hubs.
- Is missing `featuredImage`, `featuredImageAlt`, `featuredImageWidth`, or `featuredImageHeight`. The image must be a file under `public/images/` (svg, webp, avif, or png). The alt text must be a real description of at least 40 characters, not a word like “image” or “diagram” on its own.
- Has fewer than two inline diagrams or figures with descriptive alt text of at least 24 characters. The answer to a section comes before the picture.
- Has an `##` heading, other than “A note on advice,” that is not a question, or whose opening sentence does not answer that question in plain words.
- Has fewer than 3 sources, or a source missing `title`, `url`, `publisher`, or `accessed`.
- Has a source URL that is not https, is not a real URL, or is not linked in the body.
- Links to an external URL that is not in the sources list.
- Has an introduction or `##` section with no inline link (a markdown link or an HTML link). Diagrams do not count as citations.
- Is missing the phrase “not professional advice.”
- Has a missing, impossible, or future `updatedDate`, or an `updatedDate` before `publishDate`. Dates must be `YYYY-MM-DD`.
- Contains a banned hype phrase, including inside a negation: `guaranteed`, `unhackable`, `foolproof`, `get rich`, `risk-free`, `risk free`.
- Contains fake-urgency language: `act now`, `limited time`, `last chance`, `don't miss out`, `before it's too late`.
- Contains `TODO`, `REPLACE_ME`, or lorem ipsum.
- Reuses another article’s title (case-insensitive) or slug.
- Links to an internal path or anchor that does not exist. Public files such as `/diagrams/*.svg` and `/og/*.png` count as real targets.
- Drops the publishing statement. `src/data/site.ts` must contain “must pass an automated quality gate before publishing.” The home page, About, and the editorial policy must render that statement. The footer and the About page must name 9nth Dimension. The pages must not claim a human reviews every merge.
- Breaks the Family AI Safety Kit facts. While the pre-order link is set, the kit page states the $38.28 price, free US shipping, US addresses only, quantity 1–5, the 4-6 week ship window, a full refund before it ships, and the 9NTH DIMENSION card statement. Product JSON-LD uses PreOrder availability and includes no ratings. The privacy page names Stripe. The footer and the header link the kit, and the footer links refunds. Copy must not say the kit stops, prevents, or guarantees protection against a scam. A guide that sets `safetyKitCta: true` includes the calm callout before the advice note, and that callout links to `/safety-kit/` rather than Stripe. The voice-clone guide keeps that callout.

Drafts in `src/content/articles` are checked too. A draft is “ready but unpublished,” not a scratch file. Keep scraps outside that folder.

Source titles are not scanned for banned words, because a source’s own title may use them. Do not paste those words into our sentences.

## What CI runs

On every pull request, and on every push to `main`:

1. `npm ci`
2. `npm run check:articles`
3. `npm run build`
4. `npm run check:articles -- --dist`
5. `npm run check:redirects` confirms each published article has a noindex short URL at `/<slug>/` pointing at `/articles/<slug>/`, and that those stubs are absent from the sitemap and from `llms.txt`. A slug that matches an existing top-level route fails this check and is not given a redirect.

The deploy workflow on `main` repeats these checks and then publishes `dist` to GitHub Pages.

The build also rewrites `llms.txt` and `llms-full.txt`, and confirms `robots.txt` names GPTBot, ClaudeBot, PerplexityBot, and Google-Extended.

## Human checks

An editor does these before merging. The script cannot.

- **Accuracy against the sources.** Open each link. The sentence should be a fair reading, not a stretch. Numbers should match the cited report and name the year.
- **Original value.** The page should explain, sequence, or translate. A stack of quotes with no beginner framing is not enough.
- **Useful to a beginner.** A newcomer should know what to do next, including when the answer is to stop and call a known number.
- **Not scaled thin content.** Do not publish a page that only rewords a source or exists to catch a search query.
- **Voice.** Hook, short lines, one next step on the start-here path. No invented victim. See [style-guide.md](style-guide.md).
- **Diagrams.** Each picture should teach the same fact as the prose. Alt text should make sense with the image turned off.
- **Answer first.** A question heading’s first sentence should be the answer, not a warm-up. Key takeaways stay near the top.
- **AI search files.** `robots.txt` allows the named search and answer-engine crawlers. `llms.txt` and `llms-full.txt` are regenerated at build time from the article files.
- **Links still resolve.** Click the external sources. The gate only checks internal links, because outside sites fail open and closed for reasons that are not our bug.

## Fixing a failure

The script prints the file and the rule. Edit the article, run `npm run check:articles` again, and push. Do not weaken the script to make a draft pass.
