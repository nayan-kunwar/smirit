import type { UserProfile } from '@smriti/shared-types';

/**
 * Derive a structured profile from a user's memory contents. Deterministic and
 * pure; a richer LLM-based extractor can replace it behind this signature.
 */
const SKILL_KEYWORDS = [
  'node.js',
  'nodejs',
  'typescript',
  'javascript',
  'postgres',
  'postgresql',
  'redis',
  'kafka',
  'python',
  'go',
  'rust',
  'docker',
  'kubernetes',
  'elasticsearch',
];

const INTEREST_KEYWORDS = [
  'distributed systems',
  'ai',
  'machine learning',
  'ai engineering',
  'backend',
  'observability',
  'databases',
];

export function deriveProfile(contents: string[], summary?: string): UserProfile {
  const haystack = contents.join('\n').toLowerCase();

  const skills = dedupeMatches(SKILL_KEYWORDS, haystack).map(prettifySkill);
  const interests = dedupeMatches(INTEREST_KEYWORDS, haystack).map(titleCase);

  return { skills, interests, ...(summary ? { summary } : {}) };
}

function dedupeMatches(keywords: string[], haystack: string): string[] {
  const found = new Set<string>();
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) found.add(keyword);
  }
  return [...found];
}

function prettifySkill(value: string): string {
  const map: Record<string, string> = {
    nodejs: 'Node.js',
    'node.js': 'Node.js',
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    postgres: 'PostgreSQL',
    postgresql: 'PostgreSQL',
    kafka: 'Kafka',
    redis: 'Redis',
  };
  return map[value] ?? titleCase(value);
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
