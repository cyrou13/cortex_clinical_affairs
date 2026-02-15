import { useState } from 'react';
import { Shield, Key } from 'lucide-react';

type VerifyMethod = 'totp' | 'passkey' | 'recovery';

interface MfaVerifyProps {
  onVerifyTotp?: (code: string) => void;
  onVerifyPasskey?: () => void;
  onVerifyRecovery?: (code: string) => void;
}

export function MfaVerify({ onVerifyTotp, onVerifyPasskey, onVerifyRecovery }: MfaVerifyProps) {
  const [method, setMethod] = useState<VerifyMethod>('totp');
  const [code, setCode] = useState('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cortex-bg-secondary)]">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <Shield size={32} className="mx-auto text-[var(--cortex-blue-500)]" />
          <h2 className="mt-3 text-xl font-semibold text-[var(--cortex-blue-900)]">
            Verify Your Identity
          </h2>
        </div>

        {method === 'totp' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-[var(--cortex-text-secondary)]">
              Enter the 6-digit code from your authenticator app
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-lg border border-[var(--cortex-border)] px-4 py-3 text-center text-2xl tracking-widest"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setCode(val);
                if (val.length === 6) onVerifyTotp?.(val);
              }}
              placeholder="000000"
              autoFocus
              aria-label="TOTP verification code"
            />
          </div>
        )}

        {method === 'passkey' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Use your passkey to verify your identity
            </p>
            <button
              type="button"
              onClick={onVerifyPasskey}
              className="mx-auto flex items-center gap-2 rounded-lg bg-[var(--cortex-blue-500)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
            >
              <Key size={16} />
              Use Passkey
            </button>
          </div>
        )}

        {method === 'recovery' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-[var(--cortex-text-secondary)]">
              Enter one of your recovery codes
            </p>
            <input
              type="text"
              className="w-full rounded-lg border border-[var(--cortex-border)] px-4 py-3 text-center font-mono text-lg tracking-wider"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              aria-label="Recovery code"
            />
            <button
              type="button"
              onClick={() => onVerifyRecovery?.(code)}
              disabled={code.length < 9}
              className="w-full rounded-lg bg-[var(--cortex-blue-500)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Verify
            </button>
          </div>
        )}

        <div className="flex justify-center gap-4 border-t border-[var(--cortex-border)] pt-4 text-xs">
          {method !== 'totp' && (
            <button type="button" onClick={() => { setMethod('totp'); setCode(''); }} className="text-[var(--cortex-blue-500)] hover:underline">
              Use authenticator app
            </button>
          )}
          {method !== 'passkey' && (
            <button type="button" onClick={() => { setMethod('passkey'); setCode(''); }} className="text-[var(--cortex-blue-500)] hover:underline">
              Use passkey
            </button>
          )}
          {method !== 'recovery' && (
            <button type="button" onClick={() => { setMethod('recovery'); setCode(''); }} className="text-[var(--cortex-blue-500)] hover:underline">
              Use recovery code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
