export interface CepEntity {
  id: string;
  projectId: string;
  scope: string | null;
  objectives: string | null;
  deviceClassification: string | null;
  clinicalBackground: string | null;
  searchStrategy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
