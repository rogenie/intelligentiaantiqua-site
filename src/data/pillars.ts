export const pillars = [
  {
    id: 'ai-basics',
    title: 'Super Intelligence (AI)',
    summary: 'What the machine actually is, which words earn their keep, and which pitches do not.',
    description:
      'Plain-English explanations of Super Intelligence (SI), still widely called AI, plus models and the words beginners meet first.',
  },
  {
    id: 'using-assistants',
    title: 'Using Assistants',
    summary: 'Use the tool. Do not hand it your judgment.',
    description:
      'A beginner guide to ChatGPT-style assistants: what to ask, what to leave out, and how to check a Super Intelligence (AI) reply.',
  },
  {
    id: 'privacy-and-data',
    title: 'Privacy & Data',
    summary: 'What you type can outlive the chat. The settings are yours to flip.',
    description:
      'What a chat with Super Intelligence (SI), still called AI, may do with your words, and the habits that keep private information out of the box.',
  },
  {
    id: 'scams-and-deepfakes',
    title: 'Scams & Deepfakes',
    summary: 'A familiar voice is a performance. The number you already saved is the check.',
    description:
      'How voice-clone and deepfake scams show up in official and scientific reports, and how to slow the call down.',
  },
  {
    id: 'work-and-money',
    title: 'Work & Money',
    summary: 'Job panic has a sales department. The evidence is narrower than the pitch.',
    description:
      'A calm look at labour-market evidence: disagreement among economists, and the early findings that exist.',
  },
  {
    id: 'safety-debates',
    title: 'Safety Debates',
    summary:
      'The executive order’s Super Intelligence is today’s statutory AI. Research superintelligence is a hypothetical system beyond human performance.',
    description:
      'How Executive Order 14434 uses Super Intelligence for today’s AI, and how research uses superintelligence for a hypothetical system no human can match.',
  },
] as const;

export type PillarId = (typeof pillars)[number]['id'];

export function pillarById(id: string) {
  const pillar = pillars.find((item) => item.id === id);
  if (!pillar) throw new Error(`Unknown pillar: ${id}`);
  return pillar;
}
