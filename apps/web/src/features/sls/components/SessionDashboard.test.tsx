import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_SLS_SESSION, GET_SLS_QUERIES, GET_ARTICLE_COUNT_BY_STATUS } from '../graphql/queries';

import { SessionDashboard } from './SessionDashboard';

const mockSession = {
  id: 'sess-1',
  name: 'CSpine Clinical Review',
  type: 'SOA_CLINICAL',
  status: 'DRAFT',
  scopeFields: {
    indication: 'Cervical spine degeneration',
    population: 'Adults with chronic neck pain',
    intervention: 'Anterior cervical discectomy',
    comparator: 'Conservative treatment',
    outcomes: 'Pain reduction, functional improvement',
  },
  createdById: 'user-1',
  createdAt: '2026-02-14T10:00:00Z',
  updatedAt: '2026-02-14T10:00:00Z',
};

function makeSessionMock(session: typeof mockSession): MockedResponse {
  return {
    request: {
      query: GET_SLS_SESSION,
      variables: { id: session.id },
    },
    result: {
      data: { slsSession: session },
    },
  };
}

function makeSessionLoadingMock(): MockedResponse {
  return {
    request: {
      query: GET_SLS_SESSION,
      variables: { id: 'sess-1' },
    },
    result: {
      data: { slsSession: mockSession },
    },
    delay: 100000,
  };
}

function makeSessionErrorMock(): MockedResponse {
  return {
    request: {
      query: GET_SLS_SESSION,
      variables: { id: 'sess-1' },
    },
    error: new Error('Network error'),
  };
}

function makeArticleCountMock(sessionId: string): MockedResponse {
  return {
    request: {
      query: GET_ARTICLE_COUNT_BY_STATUS,
      variables: { sessionId },
    },
    result: {
      data: { articleCountByStatus: [] },
    },
  };
}

function makeQueriesMock(sessionId: string): MockedResponse {
  return {
    request: {
      query: GET_SLS_QUERIES,
      variables: { sessionId },
    },
    result: {
      data: { slsQueries: [] },
    },
  };
}

function makeDefaultMocks(session: typeof mockSession = mockSession): MockedResponse[] {
  return [
    makeSessionMock(session),
    makeArticleCountMock(session.id),
    makeQueriesMock(session.id),
    // The QueriesTab (rendered by default) also queries GET_SLS_QUERIES with sessionId
    // Provide a second one for the child component
    makeQueriesMock(session.id),
  ];
}

describe('SessionDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows session name and type', async () => {
    renderWithApollo(
      <SessionDashboard sessionId="sess-1" projectId="proj-1" />,
      makeDefaultMocks(),
    );

    expect(await screen.findByText('CSpine Clinical Review')).toBeInTheDocument();
    expect(screen.getByText(/SOA Clinical/)).toBeInTheDocument();
  });

  it('shows status badge', async () => {
    renderWithApollo(
      <SessionDashboard sessionId="sess-1" projectId="proj-1" />,
      makeDefaultMocks(),
    );

    await screen.findByText('CSpine Clinical Review');

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-variant', 'draft');
  });

  it('shows metrics cards', async () => {
    renderWithApollo(
      <SessionDashboard sessionId="sess-1" projectId="proj-1" />,
      makeDefaultMocks(),
    );

    await screen.findByText('CSpine Clinical Review');

    expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
    expect(screen.getByTestId('metric-articles')).toBeInTheDocument();
    expect(screen.getByTestId('metric-screening-progress')).toBeInTheDocument();
    expect(screen.getByTestId('metric-queries')).toBeInTheDocument();
  });

  it('shows scope fields', async () => {
    renderWithApollo(
      <SessionDashboard sessionId="sess-1" projectId="proj-1" />,
      makeDefaultMocks(),
    );

    await screen.findByText('CSpine Clinical Review');

    expect(screen.getByTestId('scope-fields-card')).toBeInTheDocument();
    expect(screen.getByText('Indication')).toBeInTheDocument();
    expect(screen.getByText('Cervical spine degeneration')).toBeInTheDocument();
    expect(screen.getByText('Population')).toBeInTheDocument();
    expect(screen.getByText('Adults with chronic neck pain')).toBeInTheDocument();
    expect(screen.getByText('Intervention')).toBeInTheDocument();
    expect(screen.getByText('Anterior cervical discectomy')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithApollo(<SessionDashboard sessionId="sess-1" projectId="proj-1" />, [
      makeSessionLoadingMock(),
      makeArticleCountMock('sess-1'),
      makeQueriesMock('sess-1'),
    ]);

    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
  });

  it('shows error state', async () => {
    renderWithApollo(<SessionDashboard sessionId="sess-1" projectId="proj-1" />, [
      makeSessionErrorMock(),
      makeArticleCountMock('sess-1'),
      makeQueriesMock('sess-1'),
    ]);

    expect(await screen.findByText(/failed to load session/i)).toBeInTheDocument();
  });

  it('does not show scope fields card when scopeFields is null', async () => {
    const sessionNoScope = { ...mockSession, scopeFields: null };

    renderWithApollo(
      <SessionDashboard sessionId="sess-1" projectId="proj-1" />,
      makeDefaultMocks(sessionNoScope),
    );

    await screen.findByText('CSpine Clinical Review');

    expect(screen.queryByTestId('scope-fields-card')).not.toBeInTheDocument();
  });

  it('shows session type label', async () => {
    renderWithApollo(
      <SessionDashboard sessionId="sess-1" projectId="proj-1" />,
      makeDefaultMocks(),
    );

    await screen.findByText('CSpine Clinical Review');

    expect(screen.getByText(/SOA Clinical/i)).toBeInTheDocument();
  });
});
