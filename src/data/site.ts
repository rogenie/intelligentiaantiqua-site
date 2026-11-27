export const site = {
  name: 'Intelligentia Antiqua',
  shortName: 'IA',
  company: '9nth Dimension',
  cardStatement: '9NTH DIMENSION',
  url: 'https://intelligentiaantiqua.com',
  tagline: 'Your mind. The source in the margin.',
  founder: 'Creator Rogenie',
  description:
    'Intelligentia Antiqua explains Super Intelligence (SI), still widely called AI, in plain English for beginners, with a source on every factual claim.',
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
export const cardStatementNote = `Charges appear as ${site.cardStatement} (${site.name} is a ${site.company} company).`;

export const publishingStatement =
  'Articles are researched and drafted with automated tools, fact-checked in a second pass against primary sources, and must pass an automated quality gate before publishing. Corrections are welcome at https://intelligentiaantiqua.com/contact/.';

/**
 * Amazon product URL for the Family AI Safety Kit.
 * Leave this empty until the listing exists. An https URL sets status to
 * "amazon" and wins over the pre-order link.
 */
const safetyKitAmazonUrl: string = '';

/** Stripe Payment Link for Family AI Safety Kit pre-orders. An https Amazon URL wins over this. */
const safetyKitPreorderUrl = 'https://buy.stripe.com/00w3cvbsL2k5390gtw9R602';

const safetyKitPrice = 38.28;

function safetyKitStatus(amazonUrl: string, preorderUrl: string): 'amazon' | 'preorder' | 'waitlist' {
  if (amazonUrl.startsWith('https://')) return 'amazon';
  if (preorderUrl.startsWith('https://')) return 'preorder';
  return 'waitlist';
}

export const safetyKit: {
  amazonUrl: string;
  preorderUrl: string;
  price: number;
  currency: 'USD';
  status: 'amazon' | 'preorder' | 'waitlist';
} = {
  amazonUrl: safetyKitAmazonUrl,
  preorderUrl: safetyKitPreorderUrl,
  price: safetyKitPrice,
  currency: 'USD',
  status: safetyKitStatus(safetyKitAmazonUrl, safetyKitPreorderUrl),
};

export const safetyKitDisclosure =
  'Intelligentia Antiqua makes and sells this kit, so we have a financial interest. Guides stay educational and never require buying anything. The voice-clone guide is the free method. The cards are a convenience.';
