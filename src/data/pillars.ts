export const pillars = [
  {
    id: 'ai-basics',
    title: 'AI Basics',
    summary: 'What the machine actually is, which words earn their keep, and which pitches do not.',
    description:
      'Plain-English explanations of artificial intelligence, models, and the words beginners meet first.',
  },
  {
    id: 'using-assistants',
    title: 'Using Assistants',
    summary: 'Use the tool. Do not hand it your judgment.',
    description:
      'A beginner guide to ChatGPT-style assistants: what to ask, what to leave out, and how to check a reply.',
  },
  {
    id: 'privacy-and-data',
    title: 'Privacy & Data',
    summary: 'What you type can outlive the chat. The settings are yours to flip.',
    description:
      'What consumer AI apps may do with chats, and the habits that keep private information out of the box.',
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
    summary: 'The loud word is superintelligence. The careful report uses tighter ones, and experts still disagree.',
    description:
      'A fair account of advanced-AI debates, using the terms in the International AI Safety Report.',
  },
] as const;

export type PillarId = (typeof pillars)[number]['id'];

export function pillarById(id: string) {
  const pillar = pillars.find((item) => item.id === id);
  if (!pillar) throw new Error(`Unknown pillar: ${id}`);
  return pillar;
}
