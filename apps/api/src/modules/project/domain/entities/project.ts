export interface ProjectEntity {
  id: string;
  name: string;
  deviceName: string;
  deviceClass: string;
  regulatoryContext: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
