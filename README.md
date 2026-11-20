# Intelligentia Antiqua

Plain-English AI guides for complete beginners. Intelligentia Antiqua is an independent research desk: we explain what standards bodies, regulators, and scientific reviews say, and we link the source on every factual claim.

The name is Latin for “ancient intelligence.” The site is a static [Astro](https://astro.build) project. Articles are Markdown or MDX files in `src/content/articles`, so a new guide can arrive as a pull request.

Intelligentia Antiqua is a 9nth Dimension company.

## Develop

```bash
npm install
npm run dev
```

Other commands:

- `npm run build` writes the site to `dist/`
- `npm run preview` serves that build
- `npm run check:articles` runs the quality gate
- `npm run og` regenerates the flat PNG social images (needs Pillow locally; the PNGs are already committed)

Optional: copy `.env.example` to `.env` and set `PUBLIC_GOOGLE_SITE_VERIFICATION` when you are ready for Search Console. No analytics script is loaded.

## Repository map

- `src/content/articles/` published guides
- `src/pages/` home, hubs, policies, glossary
- `src/components/illustrations/` inline SVG
- `public/diagrams/` explanatory SVG diagrams
- `public/og/` Open Graph images
- `docs/brand-voice.md` the founder’s voice, which every new guide follows
- `docs/style-guide.md` voice, including the guide shape
- `docs/quality-gate.md` automated and human checks
- `docs/publishing.md` how a guide ships
- `docs/article-template.md` the file to copy
- `docs/content-calendar.md` the first two weeks of guides

## Enabling GitHub Pages

The deploy workflow is `.github/workflows/deploy.yml`. It runs on every push to `main`, builds the site, and publishes with GitHub Actions.

1. Open the repository on GitHub.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` (or run the “Deploy to GitHub Pages” workflow by hand). The first successful run creates the Pages site.

`public/CNAME` contains `intelligentiaantiqua.com`, so the custom domain is part of the built site. DNS is already pointed at GitHub Pages. After the first deploy, confirm the domain in **Settings > Pages**. Turn on **Enforce HTTPS** only after GitHub finishes issuing the certificate.

Articles are researched and drafted with automated tools, fact-checked in a second pass against primary sources, and published only after they pass the quality gate. That gate does not claim a person re-reads every merge.

## Custom domain and DNS

These records are already in place. They are listed here so a later change does not guess.

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `rogenie.github.io` |

GitHub’s own steps: [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Search Console, analytics, and email

- Search Console: add the property `https://intelligentiaantiqua.com`, then put the verification token in the GitHub repository variable `PUBLIC_GOOGLE_SITE_VERIFICATION`. The next deploy prints it as a meta tag. The slot is `src/layouts/Base.astro`.
- Analytics: nothing is installed. When you want a tag, add it in `src/components/AnalyticsSlot.astro` and update the privacy policy in the same change, before the script ships.
- Email: the site names `hello@intelligentiaantiqua.com`. Create that mailbox, or change the address in `src/data/site.ts` and the pages that use it.
- About page: Intelligentia Antiqua is published by 9nth Dimension. The company name is `company` in `src/data/site.ts`.
- Newsletter: the placeholder does not collect addresses. Wiring it up is a later project, and it needs a privacy-policy edit first.
- The Family AI Safety Kit pre-order is `/safety-kit/`. Price, the Stripe link, shipping, and the ship window live in `src/data/site.ts`. Refunds are `/refunds/`.

## What you still do by hand

The Pages API already reports **Source: GitHub Actions** (`build_type: workflow`) and the custom domain `intelligentiaantiqua.com`. A certificate for the apex and `www` is approved. **Enforce HTTPS** is still off.

1. In **Settings > Pages**, confirm Source stays **GitHub Actions** after the first deploy. If the screen still says “Deploy from a branch,” switch it.
2. Turn on **Enforce HTTPS** now that the certificate is approved.
3. Verify the site in Search Console and set the repository variable `PUBLIC_GOOGLE_SITE_VERIFICATION`.
4. Create the mailbox `hello@intelligentiaantiqua.com`.
5. Read the three starter guides against their sources before you merge them. CI cannot do that part.
