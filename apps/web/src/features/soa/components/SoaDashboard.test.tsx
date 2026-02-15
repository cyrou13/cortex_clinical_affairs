import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { SoaDashboard } from './SoaDashboard';

const mockClinicalSoa = {
  id: 'soa-1',
  name: 'Clinical Evaluation 2024',
  type: 'CLINICAL',
  status: 'IN_PROGRESS',
  description: 'Clinical SOA',
  linkedSessions: [
    { id: 'sess-1', name: 'PubMed Search 2024', lockedAt: '2024-01-01' },
  ],
  sections: [
    { id: 's1', sectionKey: 'CLINICAL_1', title: 'Scope & Objectives', status: 'FINALIZED', orderIndex: 0 },
    { id: 's2', sectionKey: 'CLINICAL_2', title: 'Clinical Background', status: 'IN_PROGRESS', orderIndex: 1 },
    { id: 's3', sectionKey: 'CLINICAL_3', title: 'Literature Data', status: 'DRAFT', orderIndex: 2 },
    { id: 's4', sectionKey: 'CLINICAL_4', title: 'Post-Market Data', status: 'DRAFT', orderIndex: 3 },
    { id: 's5', sectionKey: 'CLINICAL_5', title: 'Analysis & Synthesis', status: 'DRAFT', orderIndex: 4 },
    { id: 's6', sectionKey: 'CLINICAL_6', title: 'Conclusions', status: 'DRAFT', orderIndex: 5 },
  ],
};

const mockDeviceSoa = {
  id: 'soa-2',
  name: 'Device SOA',
  type: 'SIMILAR_DEVICE',
  status: 'DRAFT',
  description: null,
  linkedSessions: [],
  sections: [
    { id: 'd1', sectionKey: 'DEVICE_1', title: 'Device Description', status: 'DRAFT', orderIndex: 0 },
    { id: 'd2', sectionKey: 'DEVICE_2', title: 'Similar Device ID', status: 'DRAFT', orderIndex: 1 },
    { id: 'd3', sectionKey: 'DEVICE_3', title: 'Benchmarks', status: 'DRAFT', orderIndex: 2 },
    { id: 'd4', sectionKey: 'DEVICE_4', title: 'Comparison', status: 'DRAFT', orderIndex: 3 },
    { id: 'd5', sectionKey: 'DEVICE_5', title: 'Conclusions', status: 'DRAFT', orderIndex: 4 },
  ],
};

describe('SoaDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('soa-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: new Error('fail') });
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('soa-error')).toBeInTheDocument();
  });

  it('renders not found state', () => {
    mockUseQuery.mockReturnValue({ data: { soaAnalysis: null }, loading: false, error: null });
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('soa-not-found')).toBeInTheDocument();
  });

  it('renders dashboard with SOA name', () => {
    mockUseQuery.mockReturnValue({ data: { soaAnalysis: mockClinicalSoa }, loading: false, error: null });
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('soa-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('soa-name')).toHaveTextContent('Clinical Evaluation 2024');
  });

  it('shows 6 sections for CLINICAL type', () => {
    mockUseQuery.mockReturnValue({ data: { soaAnalysis: mockClinicalSoa }, loading: false, error: null });
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('section-CLINICAL_1')).toBeInTheDocument();
    expect(screen.getByTestId('section-CLINICAL_6')).toBeInTheDocument();
  });

  it('shows 5 sections for SIMILAR_DEVICE type', () => {
    mockUseQuery.mockReturnValue({ data: { soaAnalysis: mockDeviceSoa }, loading: false, error: null });
    render(<SoaDashboard soaId="soa-2" />);
    expect(screen.getByTestId('section-DEVICE_1')).toBeInTheDocument();
    expect(screen.getByTestId('section-DEVICE_5')).toBeInTheDocument();
  });

  it('shows progress summary', () => {
    mockUseQuery.mockReturnValue({ data: { soaAnalysis: mockClinicalSoa }, loading: false, error: null });
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('progress-summary')).toHaveTextContent('1/6 sections finalized');
  });

  it('shows linked sessions', () => {
    mockUseQuery.mockReturnValue({ data: { soaAnalysis: mockClinicalSoa }, loading: false, error: null });
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('linked-session-sess-1')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    mockUseQuery.mockReturnValue({ data: { soaAnalysis: mockClinicalSoa }, loading: false, error: null });
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    mockUseQuery.mockReturnValue({ data: { soaAnalysis: mockClinicalSoa }, loading: false, error: null });
    render(<SoaDashboard soaId="soa-1" />);
    const badges = screen.getAllByTestId('status-badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows section list', () => {
    mockUseQuery.mockReturnValue({ data: { soaAnalysis: mockClinicalSoa }, loading: false, error: null });
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('section-list')).toBeInTheDocument();
  });
});
