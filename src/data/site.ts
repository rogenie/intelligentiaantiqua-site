export const site = {
  name: 'Intelligentia Antiqua',
  shortName: 'IA',
  company: '9nth Dimension',
  cardStatement: '9NTH DIMENSION',
  url: 'https://intelligentiaantiqua.com',
  tagline: 'Your mind. The source in the margin.',
  founder: 'Goddess Rogenie',
  description:
    'Intelligentia Antiqua explains artificial intelligence in plain English for beginners, with a source on every factual claim.',
  email: 'hello@intelligentiaantiqua.com',
  repo: 'https://github.com/rogenie/intelligentiaantiqua-site',
  author: 'Intelligentia Antiqua Research Desk',
  policiesUpdated: '2026-11-20',
  locale: 'en-US',
  defaultOg: '/og/default.png',
} as const;

export const defaultAuthor = site.author;

export const companyLine = `${site.name}, a ${site.company} company`;
export const publisherLine = `${site.name} is published by ${site.company}`;

export const publishingStatement =
  'Articles are researched and drafted with automated tools, fact-checked in a second pass against primary sources, and must pass an automated quality gate before publishing. Corrections are welcome at https://intelligentiaantiqua.com/contact/.';
