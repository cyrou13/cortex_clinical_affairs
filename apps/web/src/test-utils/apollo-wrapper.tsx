import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import { render, type RenderOptions } from '@testing-library/react';

export type MockedResponse = MockLink.MockedResponse;

export function renderWithApollo(
  ui: ReactNode,
  mocks: readonly MockedResponse[] = [],
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
