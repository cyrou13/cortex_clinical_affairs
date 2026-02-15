import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ProjectCreateWizard } from './ProjectCreateWizard';

const mockUsers = [
  { id: 'u-1', name: 'Alice Martin', email: 'alice@corp.com' },
  { id: 'u-2', name: 'Bob Wilson', email: 'bob@corp.com' },
];

describe('ProjectCreateWizard', () => {
  const defaultProps = {
    availableUsers: mockUsers,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders step 1 (Device Information) by default', () => {
    render(<ProjectCreateWizard {...defaultProps} />);

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
    expect(screen.getByTestId('step-device-info')).toBeInTheDocument();
    expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Device Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Device Class')).toBeInTheDocument();
    expect(screen.getByLabelText('Regulatory Context')).toBeInTheDocument();
  });

  it('shows validation errors when advancing with empty fields', async () => {
    render(<ProjectCreateWizard {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    expect(screen.getByText('Project name must be at least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Device name is required')).toBeInTheDocument();
    expect(screen.getByText('Device class is required')).toBeInTheDocument();
    expect(screen.getByText('Regulatory context is required')).toBeInTheDocument();
  });

  it('advances to step 2 (CEP Configuration) when step 1 is valid', async () => {
    render(<ProjectCreateWizard {...defaultProps} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Project Name'), {
        target: { value: 'CSpine Eval' },
      });
      fireEvent.change(screen.getByLabelText('Device Name'), {
        target: { value: 'CINA CSpine' },
      });
      fireEvent.change(screen.getByLabelText('Device Class'), {
        target: { value: 'IIa' },
      });
      fireEvent.change(screen.getByLabelText('Regulatory Context'), {
        target: { value: 'CE_MDR' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    expect(screen.getByTestId('step-cep-config')).toBeInTheDocument();
    expect(screen.getByLabelText('Scope')).toBeInTheDocument();
    expect(screen.getByLabelText('Objectives')).toBeInTheDocument();
  });

  it('advances to step 3 (Team Assignment) from step 2', async () => {
    render(<ProjectCreateWizard {...defaultProps} />);

    // Fill step 1
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Project Name'), {
        target: { value: 'CSpine Eval' },
      });
      fireEvent.change(screen.getByLabelText('Device Name'), {
        target: { value: 'CINA CSpine' },
      });
      fireEvent.change(screen.getByLabelText('Device Class'), {
        target: { value: 'IIa' },
      });
      fireEvent.change(screen.getByLabelText('Regulatory Context'), {
        target: { value: 'CE_MDR' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    // Step 2 - skip CEP fields, advance
    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    expect(screen.getByTestId('step-team-assignment')).toBeInTheDocument();
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  it('navigates back from step 2 to step 1', async () => {
    render(<ProjectCreateWizard {...defaultProps} />);

    // Advance to step 2
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Project Name'), {
        target: { value: 'CSpine Eval' },
      });
      fireEvent.change(screen.getByLabelText('Device Name'), {
        target: { value: 'CINA CSpine' },
      });
      fireEvent.change(screen.getByLabelText('Device Class'), {
        target: { value: 'IIa' },
      });
      fireEvent.change(screen.getByLabelText('Regulatory Context'), {
        target: { value: 'CE_MDR' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    expect(screen.getByTestId('step-cep-config')).toBeInTheDocument();

    // Go back
    await act(async () => {
      fireEvent.click(screen.getByText('Previous'));
    });

    expect(screen.getByTestId('step-device-info')).toBeInTheDocument();
  });

  it('calls onSubmit with form data when Create Project is clicked', async () => {
    const onSubmit = vi.fn();
    render(<ProjectCreateWizard {...defaultProps} onSubmit={onSubmit} />);

    // Step 1
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Project Name'), {
        target: { value: 'CSpine Eval' },
      });
      fireEvent.change(screen.getByLabelText('Device Name'), {
        target: { value: 'CINA CSpine' },
      });
      fireEvent.change(screen.getByLabelText('Device Class'), {
        target: { value: 'IIa' },
      });
      fireEvent.change(screen.getByLabelText('Regulatory Context'), {
        target: { value: 'CE_MDR' },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    // Step 2
    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    // Step 3 - submit
    await act(async () => {
      fireEvent.click(screen.getByText('Create Project'));
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'CSpine Eval',
        deviceName: 'CINA CSpine',
        deviceClass: 'IIa',
        regulatoryContext: 'CE_MDR',
      }),
      expect.any(Array),
    );
  });

  it('calls onCancel when Cancel is clicked on step 1', () => {
    render(<ProjectCreateWizard {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('renders stepper with 3 steps', () => {
    render(<ProjectCreateWizard {...defaultProps} />);

    expect(screen.getByText('Device Information')).toBeInTheDocument();
    expect(screen.getByText('CEP Configuration')).toBeInTheDocument();
    expect(screen.getByText('Team Assignment')).toBeInTheDocument();
  });
});
