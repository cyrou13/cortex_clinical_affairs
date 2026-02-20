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

const mockSoa = {
  id: 'soa-1',
  name: 'Clinical Evaluation 2024',
  type: 'CLINICAL',
  status: 'IN_PROGRESS',
  description: 'Clinical SOA',
};

const mockSections = [
  {
    id: 's1',
    sectionKey: 'CLINICAL_1',
    title: 'Scope & Objectives',
    status: 'FINALIZED',
    orderIndex: 0,
    narrativeContent: '',
  },
  {
    id: 's2',
    sectionKey: 'CLINICAL_2',
    title: 'Clinical Background',
    status: 'IN_PROGRESS',
    orderIndex: 1,
    narrativeContent: '',
  },
  {
    id: 's3',
    sectionKey: 'CLINICAL_3',
    title: 'Literature Data',
    status: 'DRAFT',
    orderIndex: 2,
    narrativeContent: '',
  },
  {
    id: 's4',
    sectionKey: 'CLINICAL_4',
    title: 'Post-Market Data',
    status: 'DRAFT',
    orderIndex: 3,
    narrativeContent: '',
  },
  {
    id: 's5',
    sectionKey: 'CLINICAL_5',
    title: 'Analysis & Synthesis',
    status: 'DRAFT',
    orderIndex: 4,
    narrativeContent: '',
  },
  {
    id: 's6',
    sectionKey: 'CLINICAL_6',
    title: 'Conclusions',
    status: 'DRAFT',
    orderIndex: 5,
    narrativeContent: '',
  },
];

const mockLinkedSessions = [{ id: 'link-1', slsSessionId: 'sess-1' }];

function setupDefaultMocks(): void {
  let callCount = 0;
  mockUseQuery.mockImplementation(() => {
    callCount++;
    if (callCount % 3 === 1) return { data: { soaAnalysis: mockSoa }, loading: false, error: null };
    if (callCount % 3 === 2) return { data: { soaSections: mockSections }, loading: false };
    return { data: { soaLinkedSessions: mockLinkedSessions }, loading: false };
  });
}

describe('SoaDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
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
    let callCount = 0;
    mockUseQuery.mockImplementation(() => {
      callCount++;
      if (callCount % 3 === 1) return { data: { soaAnalysis: null }, loading: false, error: null };
      if (callCount % 3 === 2) return { data: { soaSections: [] }, loading: false };
      return { data: { soaLinkedSessions: [] }, loading: false };
    });
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('soa-not-found')).toBeInTheDocument();
  });

  it('renders dashboard with SOA name', () => {
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('soa-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('soa-name')).toHaveTextContent('Clinical Evaluation 2024');
  });

  it('shows 6 sections for CLINICAL type', () => {
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('section-CLINICAL_1')).toBeInTheDocument();
    expect(screen.getByTestId('section-CLINICAL_2')).toBeInTheDocument();
    expect(screen.getByTestId('section-CLINICAL_3')).toBeInTheDocument();
    expect(screen.getByTestId('section-CLINICAL_4')).toBeInTheDocument();
    expect(screen.getByTestId('section-CLINICAL_5')).toBeInTheDocument();
    expect(screen.getByTestId('section-CLINICAL_6')).toBeInTheDocument();
  });

  it('shows progress summary', () => {
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('progress-summary')).toHaveTextContent('1/6 sections finalized');
  });

  it('shows linked sessions', () => {
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('linked-session-link-1')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    render(<SoaDashboard soaId="soa-1" />);
    const badges = screen.getAllByTestId('status-badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows section list', () => {
    render(<SoaDashboard soaId="soa-1" />);
    expect(screen.getByTestId('section-list')).toBeInTheDocument();
  });
});
