import {
  Brain,
  FileDown,
  FileUp,
  ArrowLeftRight,
  Mail,
  BarChart3,
  Cog,
  type LucideIcon,
} from 'lucide-react';

export interface TaskDisplayConfig {
  icon: LucideIcon;
  name: string;
}

export const TASK_DISPLAY: Record<string, TaskDisplayConfig> = {
  'sls.score-articles': { icon: Brain, name: 'AI Screening' },
  'sls.retrieve-pdfs': { icon: FileDown, name: 'PDF Retrieval' },
  'sls.mine-references': { icon: ArrowLeftRight, name: 'Reference Mining' },
  'soa.extract-grid-data': { icon: Brain, name: 'AI Extraction' },
  'soa.draft-narrative': { icon: Brain, name: 'AI Narrative' },
  'soa.quality-assessment': { icon: BarChart3, name: 'Quality Assessment' },
  'cer.draft-section': { icon: Brain, name: 'CER Section Draft' },
  'cer.generate-docx': { icon: FileDown, name: 'DOCX Export' },
  'validation.generate-report': { icon: FileDown, name: 'Report Generation' },
  'pms.generate-pmcf-report': { icon: FileDown, name: 'PMCF Report' },
  'pms.generate-psur': { icon: FileDown, name: 'PSUR Report' },
  'soa.import-document': { icon: FileUp, name: 'SOA Import' },
  'notification.send-email': { icon: Mail, name: 'Email Notification' },
};

export const DEFAULT_TASK_DISPLAY: TaskDisplayConfig = {
  icon: Cog,
  name: 'Background Task',
};

export function getTaskDisplay(taskType: string): TaskDisplayConfig {
  return TASK_DISPLAY[taskType] ?? DEFAULT_TASK_DISPLAY;
}
