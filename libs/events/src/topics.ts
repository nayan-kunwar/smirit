export const TOPICS = {
  memoryCreated: 'memory-created',
  memoryUpdated: 'memory-updated',
  memoryDeleted: 'memory-deleted',
  embeddingGenerated: 'embedding-generated',
  memoryScored: 'memory-scored',
  summaryGenerated: 'summary-generated',
  profileGenerated: 'profile-generated',
  memoryConsolidated: 'memory-consolidated',
  scheduleSummarize: 'schedule-summarize',
  scheduleConsolidate: 'schedule-consolidate',
  scheduleProfile: 'schedule-profile',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

export function retryTopic(topic: string): string {
  return `${topic}.retry`;
}

export function dlqTopic(topic: string): string {
  return `${topic}.dlq`;
}
