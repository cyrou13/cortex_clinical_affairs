import { ValidationError } from '../../../../shared/errors/index.js';

export const EVENT_TYPES = ['MALFUNCTION', 'INJURY', 'DEATH', 'OTHER'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface VigilanceFindingData {
  id: string;
  searchId: string;
  sourceDatabase: string;
  reportNumber: string;
  eventDate: string;
  deviceName: string;
  eventType: EventType;
  description: string;
  outcome: string;
  linkedSectionIds: string[];
  createdAt: string;
}

export function createVigilanceFinding(
  searchId: string,
  sourceDatabase: string,
  reportNumber: string,
  eventDate: string,
  deviceName: string,
  eventType: string,
  description: string,
  outcome: string,
): VigilanceFindingData {
  if (!reportNumber.trim()) {
    throw new ValidationError('Report number is required');
  }

  if (!deviceName.trim()) {
    throw new ValidationError('Device name is required');
  }

  if (!EVENT_TYPES.includes(eventType as EventType)) {
    throw new ValidationError(`Invalid event type: ${eventType}`);
  }

  if (!description.trim()) {
    throw new ValidationError('Description is required');
  }

  return {
    id: crypto.randomUUID(),
    searchId,
    sourceDatabase,
    reportNumber: reportNumber.trim(),
    eventDate,
    deviceName: deviceName.trim(),
    eventType: eventType as EventType,
    description: description.trim(),
    outcome: outcome.trim(),
    linkedSectionIds: [],
    createdAt: new Date().toISOString(),
  };
}

export function linkToSection(
  finding: VigilanceFindingData,
  sectionId: string,
): VigilanceFindingData {
  if (finding.linkedSectionIds.includes(sectionId)) {
    throw new ValidationError('Finding is already linked to this section');
  }

  return {
    ...finding,
    linkedSectionIds: [...finding.linkedSectionIds, sectionId],
  };
}
