# Article template

Copy this skeleton to `src/content/articles/<slug>.mdx`. Delete this intro note. The skeleton fails the quality gate until every placeholder is gone. Read [brand-voice.md](brand-voice.md) before you write a sentence. File shape: [style-guide.md](style-guide.md).

```md
---
title: "REPLACE_ME"
description: "REPLACE_ME in 160 characters or fewer."
slug: replace-me
pillar: ai-basics
tags:
  - beginners
publishDate: YYYY-MM-DD
updatedDate: YYYY-MM-DD
author: Intelligentia Antiqua Research Desk
readingLevel: beginner
featuredImage: "/images/articles/replace-me.svg"
featuredImageAlt: "REPLACE_ME with a sentence that describes the picture for someone who cannot see it."
featuredImageWidth: 800
featuredImageHeight: 450
keyTakeaways:
  - "REPLACE_ME"
  - "REPLACE_ME"
  - "REPLACE_ME"
sources:
  - title: "REPLACE_ME"
    url: "https://example.com/replace-me"
    publisher: "REPLACE_ME"
    accessed: "YYYY-MM-DD"
  - title: "REPLACE_ME"
    url: "https://example.com/replace-me-2"
    publisher: "REPLACE_ME"
    accessed: "YYYY-MM-DD"
  - title: "REPLACE_ME"
    url: "https://example.com/replace-me-3"
    publisher: "REPLACE_ME"
    accessed: "YYYY-MM-DD"
draft: true
---

You are in a specific moment. Name it in one or two lines.

Say why that moment is uncomfortable.

This guide will show one thing. It will not tell you a chatbot is correct. Link the first source here.

## What is the problem, in the reader's words?

Answer that question in this first sentence, with a source link in the section.

A one-line punch is fine.

Put an inline link in this section: [source](https://example.com/replace-me).

## What does guessing cost?

Answer in the first sentence. Use a fact from a standards body, a regulator, or a scientific review. Do not invent a person or a loss amount.

Link it: [source](https://example.com/replace-me-2).

No countdown. No scarcity. If a scammer pressures people, describe that pressure and cite it. Do not add your own.

## What should the reader do?

Answer in the first sentence. Then give the steps.

Add at least two diagrams. Original SVG, with alt text, width, and height. The layout lazy-loads figures that use the Figure component.

<Figure
  src="/diagrams/replace-me.svg"
  width={520}
  height={280}
  alt="REPLACE_ME with a sentence a person can understand without the picture."
  caption="One line on what the picture adds."
/>

Link the third source: [source](https://example.com/replace-me-3).

## What should you read next?

One action, named in the first sentence. The next page on the start-here path.

<p class="next-step"><a href="/start-here/">Next: start here</a></p>

## A note on advice

This page is general education, not professional advice. It is not legal, medical, or financial advice. Read the [full disclaimer](/disclaimer/).
```

Pillar values: `ai-basics`, `using-assistants`, `privacy-and-data`, `scams-and-deepfakes`, `work-and-money`, `safety-debates`.

`readingLevel` is `beginner` or `intermediate`.

Optional frontmatter:

```yaml
reviewedBy: "A real person's name, only if that person actually reviewed the file"
faq:
  - question: "REPLACE_ME"
    answer: "Only restate a fact already cited in the body."
howTo:
  name: "REPLACE_ME"
  description: "REPLACE_ME"
  steps:
    - name: "REPLACE_ME"
      text: "Must match the steps a reader can see."
```

Do not put a banned hype phrase in the file, even to say you are avoiding it. The gate matches the word itself. The list is in [quality-gate.md](quality-gate.md).

There are no affiliate links today. The Family AI Safety Kit is disclosed on its own page. Do not add a checkout button to a guide. A calm mention uses the kit callout, says the guide is the free method, and says the cards are a convenience.
