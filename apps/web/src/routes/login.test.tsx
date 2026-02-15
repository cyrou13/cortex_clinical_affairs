import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginPage } from './login';

describe('LoginPage', () => {
  it('renders CORTEX branding', () => {
    render(<LoginPage />);
    expect(screen.getByText('CORTEX')).toBeInTheDocument();
    expect(screen.getByText('Clinical Affairs')).toBeInTheDocument();
    expect(screen.getByText('Regulatory Compliance, Simplified')).toBeInTheDocument();
  });

  it('renders Google sign-in button', () => {
    render(<LoginPage />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('renders security footer', () => {
    render(<LoginPage />);
    expect(
      screen.getByText(/encrypted at rest and in transit/i),
    ).toBeInTheDocument();
  });
});
