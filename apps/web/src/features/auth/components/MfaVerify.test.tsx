import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MfaVerify } from './MfaVerify';

describe('MfaVerify', () => {
  it('renders TOTP verification by default', () => {
    render(<MfaVerify />);
    expect(screen.getByText('Verify Your Identity')).toBeInTheDocument();
    expect(screen.getByLabelText('TOTP verification code')).toBeInTheDocument();
  });

  it('auto-submits when 6 digits entered', () => {
    const onVerifyTotp = vi.fn();
    render(<MfaVerify onVerifyTotp={onVerifyTotp} />);
    const input = screen.getByLabelText('TOTP verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    expect(onVerifyTotp).toHaveBeenCalledWith('123456');
  });

  it('can switch to passkey method', () => {
    render(<MfaVerify />);
    fireEvent.click(screen.getByText('Use passkey'));
    expect(screen.getByText('Use Passkey')).toBeInTheDocument();
  });

  it('can switch to recovery code method', () => {
    render(<MfaVerify />);
    fireEvent.click(screen.getByText('Use recovery code'));
    expect(screen.getByLabelText('Recovery code')).toBeInTheDocument();
  });
});
