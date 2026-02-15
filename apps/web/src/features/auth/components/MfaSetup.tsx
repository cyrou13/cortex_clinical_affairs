import { useState } from 'react';
import { Smartphone, Key, Copy, Download, CheckCircle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

type MfaMethod = 'totp' | 'passkey';
type SetupStep = 'choose' | 'configure' | 'recovery' | 'done';

interface MfaSetupProps {
  qrCodeUrl?: string;
  manualKey?: string;
  recoveryCodes?: string[];
  onMethodSelect?: (method: MfaMethod) => void;
  onVerifyCode?: (code: string) => void;
  onComplete?: () => void;
}

export function MfaSetup({
  qrCodeUrl,
  manualKey,
  recoveryCodes = [],
  onMethodSelect,
  onVerifyCode,
  onComplete,
}: MfaSetupProps) {
  const [step, setStep] = useState<SetupStep>('choose');
  const [method, setMethod] = useState<MfaMethod | null>(null);
  const [code, setCode] = useState('');
  const [savedCodes, setSavedCodes] = useState(false);

  const handleMethodSelect = (m: MfaMethod) => {
    setMethod(m);
    setStep('configure');
    onMethodSelect?.(m);
  };

  const handleVerify = () => {
    onVerifyCode?.(code);
    setStep('recovery');
  };

  const handleDownloadCodes = () => {
    const text = recoveryCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cortex-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cortex-bg-secondary)]">
      <div className="w-full max-w-lg space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <h2 className="text-center text-xl font-semibold text-[var(--cortex-blue-900)]">
          Set Up Multi-Factor Authentication
        </h2>

        {step === 'choose' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-[var(--cortex-text-secondary)]">
              Choose your preferred authentication method
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleMethodSelect('totp')}
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-[var(--cortex-border)] p-6 transition-colors hover:border-[var(--cortex-blue-500)] hover:bg-[var(--cortex-blue-50)]"
              >
                <Smartphone size={32} className="text-[var(--cortex-blue-500)]" />
                <span className="text-sm font-medium">Authenticator App</span>
                <span className="text-xs text-[var(--cortex-text-muted)]">
                  Google Authenticator, Authy
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleMethodSelect('passkey')}
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-[var(--cortex-border)] p-6 transition-colors hover:border-[var(--cortex-blue-500)] hover:bg-[var(--cortex-blue-50)]"
              >
                <Key size={32} className="text-[var(--cortex-blue-500)]" />
                <span className="text-sm font-medium">Passkey</span>
                <span className="text-xs text-[var(--cortex-text-muted)]">
                  Biometric or security key
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 'configure' && method === 'totp' && (
          <div className="space-y-6">
            <p className="text-center text-sm text-[var(--cortex-text-secondary)]">
              Scan this QR code with your authenticator app
            </p>
            {qrCodeUrl && (
              <div className="flex justify-center">
                <img src={qrCodeUrl} alt="TOTP QR Code" className="h-48 w-48" />
              </div>
            )}
            {manualKey && (
              <div className="rounded-lg bg-[var(--cortex-bg-secondary)] p-3 text-center">
                <p className="text-xs text-[var(--cortex-text-muted)]">Manual entry key:</p>
                <code className="text-sm font-mono font-bold">{manualKey}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(manualKey)}
                  className="ml-2 inline-flex"
                  aria-label="Copy key"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}
            <div>
              <label htmlFor="totp-code" className="block text-sm font-medium mb-1">
                Enter verification code
              </label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="w-full rounded-lg border border-[var(--cortex-border)] px-4 py-3 text-center text-2xl tracking-widest"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCode(val);
                  if (val.length === 6) {
                    onVerifyCode?.(val);
                    setStep('recovery');
                  }
                }}
                placeholder="000000"
              />
            </div>
          </div>
        )}

        {step === 'recovery' && (
          <div className="space-y-6" data-testid="recovery-codes">
            <div className="rounded-lg border border-[var(--cortex-warning)] bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                Save these recovery codes. They will not be shown again.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((rc) => (
                <code
                  key={rc}
                  className="rounded bg-[var(--cortex-bg-secondary)] p-2 text-center text-sm font-mono"
                >
                  {rc}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={handleDownloadCodes}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--cortex-border)] px-4 py-2 text-sm"
            >
              <Download size={16} />
              Download codes
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={savedCodes}
                onChange={(e) => setSavedCodes(e.target.checked)}
              />
              I have saved my recovery codes
            </label>
            <button
              type="button"
              disabled={!savedCodes}
              onClick={() => {
                setStep('done');
                onComplete?.();
              }}
              className={cn(
                'w-full rounded-lg px-4 py-3 text-sm font-medium text-white',
                savedCodes
                  ? 'bg-[var(--cortex-blue-500)] hover:bg-[var(--cortex-blue-600)]'
                  : 'cursor-not-allowed bg-gray-300',
              )}
            >
              Continue
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <CheckCircle size={48} className="mx-auto text-[var(--cortex-success)]" />
            <p className="text-lg font-medium">MFA Setup Complete</p>
            <p className="text-sm text-[var(--cortex-text-muted)]">
              Your account is now protected with multi-factor authentication.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
