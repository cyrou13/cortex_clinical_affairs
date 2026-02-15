import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { TeamAssignment } from './TeamAssignment';

interface User {
  id: string;
  name: string;
  email: string;
}

interface SelectedUser {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface ProjectFormData {
  name: string;
  deviceName: string;
  deviceClass: string;
  regulatoryContext: string;
  cepScope: string;
  cepObjectives: string;
  cepDeviceClassification: string;
  cepClinicalBackground: string;
}

interface ProjectCreateWizardProps {
  availableUsers: User[];
  onSubmit: (data: ProjectFormData, teamMembers: SelectedUser[]) => void;
  onCancel: () => void;
  onStepChange?: (step: number, data: Partial<ProjectFormData>) => void;
}

const steps = [
  { id: 1, label: 'Device Information' },
  { id: 2, label: 'CEP Configuration' },
  { id: 3, label: 'Team Assignment' },
];

const deviceClasses = ['I', 'IIa', 'IIb', 'III'];
const regulatoryContexts = [
  { value: 'CE_MDR', label: 'CE-MDR (European Medical Device Regulation)' },
  { value: 'FDA_510K', label: 'FDA 510(k) (US Food & Drug Administration)' },
  { value: 'BOTH', label: 'Both (Dual submission)' },
];

export function ProjectCreateWizard({
  availableUsers,
  onSubmit,
  onCancel,
  onStepChange,
}: ProjectCreateWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    deviceName: '',
    deviceClass: '',
    regulatoryContext: '',
    cepScope: '',
    cepObjectives: '',
    cepDeviceClassification: '',
    cepClinicalBackground: '',
  });
  const [teamMembers, setTeamMembers] = useState<SelectedUser[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(
    (field: keyof ProjectFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    }
    if (formData.name.length > 100) {
      newErrors.name = 'Project name must be at most 100 characters';
    }
    if (!formData.deviceName) {
      newErrors.deviceName = 'Device name is required';
    }
    if (!formData.deviceClass) {
      newErrors.deviceClass = 'Device class is required';
    }
    if (!formData.regulatoryContext) {
      newErrors.regulatoryContext = 'Regulatory context is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    onStepChange?.(nextStep, formData);
  };

  const handlePrevious = () => {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    onStepChange?.(prevStep, formData);
  };

  const handleSubmit = () => {
    onSubmit(formData, teamMembers);
  };

  const handleAddTeamMember = (userId: string, role: string) => {
    const user = availableUsers.find((u) => u.id === userId);
    if (user) {
      setTeamMembers((prev) => [
        ...prev,
        { userId: user.id, name: user.name, email: user.email, role },
      ]);
    }
  };

  const handleRemoveTeamMember = (userId: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const handleRoleChange = (userId: string, role: string) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, role } : m)),
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-xl font-semibold text-[var(--cortex-text-primary)]">
        Create New Project
      </h2>

      {/* Stepper */}
      <nav aria-label="Project creation steps" className="mb-8">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <li key={step.id} className="flex items-center">
                {index > 0 && (
                  <div
                    className={`mx-2 h-0.5 w-16 ${
                      isCompleted ? 'bg-[var(--cortex-blue-500)]' : 'bg-gray-200'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      isCompleted
                        ? 'bg-[var(--cortex-blue-500)] text-white'
                        : isCurrent
                          ? 'border-2 border-[var(--cortex-blue-500)] bg-white text-[var(--cortex-blue-500)]'
                          : 'border-2 border-gray-300 bg-white text-gray-400'
                    }`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isCompleted ? <Check size={14} /> : step.id}
                  </div>
                  <span
                    className={`text-xs ${
                      isCurrent
                        ? 'font-medium text-[var(--cortex-blue-500)]'
                        : 'text-[var(--cortex-text-muted)]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Device Information */}
      {currentStep === 1 && (
        <div className="space-y-4" data-testid="step-device-info">
          <div>
            <label htmlFor="project-name" className="mb-1 block text-sm font-medium text-[var(--cortex-text-secondary)]">
              Project Name
            </label>
            <input
              id="project-name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. CINA CSpine Clinical Evaluation"
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.name
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--cortex-border)] focus:border-[var(--cortex-blue-500)]'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="device-name" className="mb-1 block text-sm font-medium text-[var(--cortex-text-secondary)]">
              Device Name
            </label>
            <input
              id="device-name"
              type="text"
              value={formData.deviceName}
              onChange={(e) => updateField('deviceName', e.target.value)}
              placeholder="e.g. CINA CSpine"
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.deviceName
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--cortex-border)] focus:border-[var(--cortex-blue-500)]'
              }`}
            />
            {errors.deviceName && <p className="mt-1 text-xs text-red-500">{errors.deviceName}</p>}
          </div>

          <div>
            <label htmlFor="device-class" className="mb-1 block text-sm font-medium text-[var(--cortex-text-secondary)]">
              Device Class
            </label>
            <select
              id="device-class"
              value={formData.deviceClass}
              onChange={(e) => updateField('deviceClass', e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.deviceClass
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--cortex-border)] focus:border-[var(--cortex-blue-500)]'
              }`}
            >
              <option value="">Select device class</option>
              {deviceClasses.map((dc) => (
                <option key={dc} value={dc}>
                  Class {dc}
                </option>
              ))}
            </select>
            {errors.deviceClass && <p className="mt-1 text-xs text-red-500">{errors.deviceClass}</p>}
          </div>

          <div>
            <label htmlFor="regulatory-context" className="mb-1 block text-sm font-medium text-[var(--cortex-text-secondary)]">
              Regulatory Context
            </label>
            <select
              id="regulatory-context"
              value={formData.regulatoryContext}
              onChange={(e) => updateField('regulatoryContext', e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.regulatoryContext
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--cortex-border)] focus:border-[var(--cortex-blue-500)]'
              }`}
            >
              <option value="">Select regulatory context</option>
              {regulatoryContexts.map((rc) => (
                <option key={rc.value} value={rc.value}>
                  {rc.label}
                </option>
              ))}
            </select>
            {errors.regulatoryContext && (
              <p className="mt-1 text-xs text-red-500">{errors.regulatoryContext}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: CEP Configuration */}
      {currentStep === 2 && (
        <div className="space-y-4" data-testid="step-cep-config">
          <div>
            <label htmlFor="cep-scope" className="mb-1 block text-sm font-medium text-[var(--cortex-text-secondary)]">
              Scope
            </label>
            <textarea
              id="cep-scope"
              value={formData.cepScope}
              onChange={(e) => updateField('cepScope', e.target.value)}
              placeholder="Define the scope of the clinical evaluation..."
              rows={3}
              className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-blue-500)] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cep-objectives" className="mb-1 block text-sm font-medium text-[var(--cortex-text-secondary)]">
              Objectives
            </label>
            <textarea
              id="cep-objectives"
              value={formData.cepObjectives}
              onChange={(e) => updateField('cepObjectives', e.target.value)}
              placeholder="Define the objectives of the clinical evaluation..."
              rows={3}
              className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-blue-500)] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cep-classification" className="mb-1 block text-sm font-medium text-[var(--cortex-text-secondary)]">
              Device Classification
            </label>
            <input
              id="cep-classification"
              type="text"
              value={formData.cepDeviceClassification}
              onChange={(e) => updateField('cepDeviceClassification', e.target.value)}
              placeholder="e.g. Software as a Medical Device (SaMD) Class IIa"
              className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-blue-500)] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cep-background" className="mb-1 block text-sm font-medium text-[var(--cortex-text-secondary)]">
              Clinical Background
            </label>
            <textarea
              id="cep-background"
              value={formData.cepClinicalBackground}
              onChange={(e) => updateField('cepClinicalBackground', e.target.value)}
              placeholder="Describe the clinical background and context..."
              rows={3}
              className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-blue-500)] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Step 3: Team Assignment */}
      {currentStep === 3 && (
        <div data-testid="step-team-assignment">
          <TeamAssignment
            availableUsers={availableUsers}
            selectedUsers={teamMembers}
            onAdd={handleAddTeamMember}
            onRemove={handleRemoveTeamMember}
            onRoleChange={handleRoleChange}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-[var(--cortex-border)] pt-4">
        <div>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevious}
              className="flex items-center gap-1 rounded-md border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-secondary)]"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-secondary)]"
            >
              Cancel
            </button>
          )}
        </div>
        <div>
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-1 rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
            >
              <Check size={16} />
              Create Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
