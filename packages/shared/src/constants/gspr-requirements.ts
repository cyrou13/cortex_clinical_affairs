export interface GsprRequirement {
  id: string;
  chapter: 'I' | 'II' | 'III';
  section: string;
  title: string;
  description: string;
  applicableToClass: ('I' | 'IIa' | 'IIb' | 'III')[];
}

/**
 * MDR Annex I — General Safety and Performance Requirements (GSPR)
 * 23 requirements across 3 chapters.
 */
export const GSPR_REQUIREMENTS: GsprRequirement[] = [
  // Chapter I: General Requirements
  {
    id: 'GSPR-1',
    chapter: 'I',
    section: '1',
    title: 'Safety and performance in normal conditions of use',
    description:
      'Devices shall achieve the performance intended by their manufacturer and shall be designed and manufactured in such a way that, during normal conditions of use, they are suitable for their intended purpose.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-2',
    chapter: 'I',
    section: '2',
    title: 'Risk management',
    description:
      'The requirement in this Section to reduce risks as far as possible means the reduction of risks as far as possible without adversely affecting the benefit-risk ratio.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-3',
    chapter: 'I',
    section: '3',
    title: 'Design and manufacturing principles',
    description:
      'Devices shall be designed and manufactured in such a way as to ensure that the characteristics and performance requirements referred to in Chapter I are fulfilled.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-4',
    chapter: 'I',
    section: '4',
    title: 'Transport and storage',
    description:
      'Devices shall be designed and manufactured in such a way as to ensure that their characteristics and performance are not adversely affected during transport and storage.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-5',
    chapter: 'I',
    section: '5',
    title: 'Benefit-risk determination and residual risk acceptability',
    description:
      'Devices shall be designed and manufactured in such a way as to reduce as far as possible the risks posed by substances or particles that may be released from the device.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-6',
    chapter: 'I',
    section: '6',
    title: 'Product lifetime performance',
    description:
      'Devices shall be designed and manufactured so as to perform as intended throughout their lifetime with no deterioration in safety or performance.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-7',
    chapter: 'I',
    section: '7',
    title: 'Usability and ergonomics',
    description:
      'Devices shall be designed and manufactured taking into account the principles of integration of design, ergonomic features and the foreseeable environment of use.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-8',
    chapter: 'I',
    section: '8',
    title: 'Devices incorporating software and IT environment',
    description:
      'Devices that incorporate electronic programmable systems, including software, or software that are devices in themselves, shall be designed to ensure repeatability, reliability and performance.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-9',
    chapter: 'I',
    section: '9',
    title: 'General requirements regarding devices with a diagnostic or measuring function',
    description:
      'Devices with a measuring function shall be designed and manufactured to provide sufficient accuracy, precision and stability for their intended purpose.',
    applicableToClass: ['IIa', 'IIb', 'III'],
  },
  // Chapter II: Design and Manufacture Requirements
  {
    id: 'GSPR-10',
    chapter: 'II',
    section: '10',
    title: 'Chemical, physical and biological properties',
    description:
      'Devices shall be designed and manufactured in such a way as to ensure that the characteristics and performance requirements referred to in Chapter I are fulfilled, with particular regard to chemical, physical and biological properties.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-11',
    chapter: 'II',
    section: '11',
    title: 'Infection and microbial contamination',
    description:
      'Devices and their manufacturing processes shall be designed in such a way as to eliminate or to reduce as far as possible the risk of infection to patients, users and third persons.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-12',
    chapter: 'II',
    section: '12',
    title: 'Devices incorporating substances considered to be medicinal products or composed of biological materials',
    description:
      'Where a device incorporates, as an integral part, a substance which, if used separately, may be considered to be a medicinal product, the safety, quality and usefulness of the substance shall be verified.',
    applicableToClass: ['IIb', 'III'],
  },
  {
    id: 'GSPR-13',
    chapter: 'II',
    section: '13',
    title: 'Devices incorporating materials of biological origin',
    description:
      'For devices manufactured utilising tissues or cells of animal origin, or their derivatives, which are rendered non-viable or are utilised as non-viable, appropriate sourcing, collection, processing, preservation, testing and handling procedures shall be applied.',
    applicableToClass: ['IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-14',
    chapter: 'II',
    section: '14',
    title: 'Construction of devices and interaction with their environment',
    description:
      'Devices shall be designed and manufactured in such a way as to reduce as far as possible the risks linked to their physical features, including the volume/pressure ratio, dimensional and ergonomic features.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-15',
    chapter: 'II',
    section: '15',
    title: 'Devices with a diagnostic or measuring function',
    description:
      'Devices with a diagnostic or measuring function shall be designed and manufactured in such a way as to provide sufficient accuracy, precision and stability.',
    applicableToClass: ['IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-16',
    chapter: 'II',
    section: '16',
    title: 'Protection against radiation',
    description:
      'Devices shall be designed and manufactured in such a way that exposure of patients, users and other persons to radiation shall be reduced as far as possible.',
    applicableToClass: ['IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-17',
    chapter: 'II',
    section: '17',
    title: 'Electronic programmable systems — software containing devices',
    description:
      'Devices that incorporate electronic programmable systems, including software, shall be designed to ensure repeatability, reliability and performance in line with their intended use.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-18',
    chapter: 'II',
    section: '18',
    title: 'Active devices and devices connected to them',
    description:
      'For active devices and devices connected to active devices, appropriate measures shall be taken to ensure the safety and essential performance of the devices.',
    applicableToClass: ['IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-19',
    chapter: 'II',
    section: '19',
    title: 'Particular requirements for active implantable devices',
    description:
      'Active implantable devices shall be designed and manufactured in such a way as to remove or minimize as far as possible risks connected with the use of a specific energy source.',
    applicableToClass: ['III'],
  },
  // Chapter III: Information Supplied with the Device
  {
    id: 'GSPR-20',
    chapter: 'III',
    section: '20',
    title: 'General requirements for information supplied by the manufacturer',
    description:
      'Each device shall be accompanied by the information needed to identify the device and its manufacturer, and by any safety and performance information relevant to the user or any other person.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-21',
    chapter: 'III',
    section: '21',
    title: 'Label and instructions for use — general requirements',
    description:
      'The information supplied by the manufacturer shall be provided on the device itself or on the packaging for each unit or where appropriate on the sales packaging.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-22',
    chapter: 'III',
    section: '22',
    title: 'Label',
    description:
      'The label shall bear all information items required for the safe and proper use of the device, the identification of the device, and the identification of the manufacturer.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
  {
    id: 'GSPR-23',
    chapter: 'III',
    section: '23',
    title: 'Instructions for use',
    description:
      'Each device shall be accompanied by instructions for use providing the user with the information needed to use the device safely and to identify the manufacturer.',
    applicableToClass: ['I', 'IIa', 'IIb', 'III'],
  },
];

export function getGsprById(id: string): GsprRequirement | undefined {
  return GSPR_REQUIREMENTS.find((r) => r.id === id);
}

export function getGsprByChapter(chapter: 'I' | 'II' | 'III'): GsprRequirement[] {
  return GSPR_REQUIREMENTS.filter((r) => r.chapter === chapter);
}

export function getGsprForDeviceClass(
  deviceClass: 'I' | 'IIa' | 'IIb' | 'III',
): GsprRequirement[] {
  return GSPR_REQUIREMENTS.filter((r) => r.applicableToClass.includes(deviceClass));
}
