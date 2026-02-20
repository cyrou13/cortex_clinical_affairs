/**
 * Queue name constants for BullMQ workers.
 * These are used by the API to set task types and by workers to register processors.
 * NOTE: BullMQ is only used in apps/workers. The API server creates DB records
 * and publishes to Redis pub/sub channels.
 */
export const QUEUE_NAMES = {
  // Systematic Literature Search
  'sls.execute-query': 'sls.execute-query',
  'sls.score-articles': 'sls.score-articles',
  'sls.retrieve-pdfs': 'sls.retrieve-pdfs',
  'sls.mine-references': 'sls.mine-references',
  'sls.custom-filter-score': 'sls.custom-filter-score',

  // State of the Art
  'soa.extract-grid-data': 'soa.extract-grid-data',
  'soa.draft-narrative': 'soa.draft-narrative',
  'soa.quality-assessment': 'soa.quality-assessment',
  'soa.import-document': 'soa.import-document',

  // Clinical Evaluation Report
  'cer.draft-section': 'cer.draft-section',
  'cer.generate-docx': 'cer.generate-docx',

  // Validation
  'validation.generate-report': 'validation.generate-report',

  // Post-Market Surveillance
  'pms.generate-pmcf-report': 'pms.generate-pmcf-report',
  'pms.generate-psur': 'pms.generate-psur',

  // Notifications
  'notification.send-email': 'notification.send-email',
} as const;

export type QueueName = keyof typeof QUEUE_NAMES;
