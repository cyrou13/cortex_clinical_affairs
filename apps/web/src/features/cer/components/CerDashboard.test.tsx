import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseQuery = vi.fn();
vi.mock('@apollo/client', () => ({ gql: vi.fn((s: TemplateStringsArray) => s[0]) }));
vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { CerDashboard } from './CerDashboard';

const mockCer = {
  id: 'cer-1',
  version: '1.0',
  status: 'DRAFT',
  regulatoryContext: 'CE_MDR',
  upstreamModules: [
    { id: 'sls-1', name: 'SLS Session 1', type: 'SLS', status: 'LOCKED', lockedAt: '2024-01-01' },
    { id: 'soa-1', name: 'Clinical SOA', type: 'SOA', status: 'LOCKED', lockedAt: '2024-02-01' },
  ],
  sections: Array.from({ length: 14 }, (_, i) => ({
    id: `sec-${i + 1}`,
    sectionNumber: i + 1,
    title: `Section ${i + 1}`,
    status: i < 5 ? 'FINALIZED' : i < 8 ? 'REVIEWED' : 'DRAFT',
    wordCount: 500 + i * 100,
  })),
  externalDocuments: [
    { id: 'doc-1', title: 'IFU v2', type: 'IFU', version: '2.0', currentVersion: '2.0' },
    { id: 'doc-2', title: 'Risk Analysis', type: 'RISK', version: '1.0', currentVersion: '1.1' },
  ],
  traceabilityCoverage: 87,
};

describe('CerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<CerDashboard cerId="cer-1" />);
    expect(screen.getByTestId('cer-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: new Error('fail') });
    render(<CerDashboard cerId="cer-1" />);
    expect(screen.getByTestId('cer-error')).toBeInTheDocument();
  });

  it('renders not found state', () => {
    mockUseQuery.mockReturnValue({ data: { cerReport: null }, loading: false, error: null });
    render(<CerDashboard cerId="cer-1" />);
    expect(screen.getByTestId('cer-not-found')).toBeInTheDocument();
  });

  it('renders dashboard with CER version', () => {
    mockUseQuery.mockReturnValue({ data: { cerReport: mockCer }, loading: false, error: null });
    render(<CerDashboard cerId="cer-1" />);
    expect(screen.getByTestId('cer-dashboard')).toBeInTheDocument();
    expect(screen.getByText('CER v1.0')).toBeInTheDocument();
  });

  it('shows upstream modules section', () => {
    mockUseQuery.mockReturnValue({ data: { cerReport: mockCer }, loading: false, error: null });
    render(<CerDashboard cerId="cer-1" />);
    expect(screen.getByTestId('upstream-modules-section')).toBeInTheDocument();
    expect(screen.getByTestId('module-sls-1')).toBeInTheDocument();
    expect(screen.getByTestId('module-soa-1')).toBeInTheDocument();
  });

  it('shows section completion grid with 14 sections', () => {
    mockUseQuery.mockReturnValue({ data: { cerReport: mockCer }, loading: false, error: null });
    render(<CerDashboard cerId="cer-1" />);
    expect(screen.getByTestId('section-completion-grid')).toBeInTheDocument();
    expect(screen.getByTestId('section-cell-1')).toBeInTheDocument();
    expect(screen.getByTestId('section-cell-14')).toBeInTheDocument();
  });

  it('shows traceability coverage percentage', () => {
    mockUseQuery.mockReturnValue({ data: { cerReport: mockCer }, loading: false, error: null });
    render(<CerDashboard cerId="cer-1" />);
    expect(screen.getByTestId('traceability-coverage')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('shows external documents section', () => {
    mockUseQuery.mockReturnValue({ data: { cerReport: mockCer }, loading: false, error: null });
    render(<CerDashboard cerId="cer-1" />);
    expect(screen.getByTestId('external-docs-section')).toBeInTheDocument();
    expect(screen.getByTestId('ext-doc-doc-1')).toBeInTheDocument();
  });

  it('shows version mismatch warning when docs outdated', () => {
    mockUseQuery.mockReturnValue({ data: { cerReport: mockCer }, loading: false, error: null });
    render(<CerDashboard cerId="cer-1" />);
    expect(screen.getByTestId('mismatch-warning')).toBeInTheDocument();
    expect(screen.getByText('1 version mismatch')).toBeInTheDocument();
  });

  it('shows finalized count in section header', () => {
    mockUseQuery.mockReturnValue({ data: { cerReport: mockCer }, loading: false, error: null });
    render(<CerDashboard cerId="cer-1" />);
    expect(screen.getByText('CER Sections (5/14 finalized)')).toBeInTheDocument();
  });

  it('shows status badges on modules', () => {
    mockUseQuery.mockReturnValue({ data: { cerReport: mockCer }, loading: false, error: null });
    render(<CerDashboard cerId="cer-1" />);
    const badges = screen.getAllByTestId('status-badge');
    expect(badges.length).toBeGreaterThan(0);
  });
});
