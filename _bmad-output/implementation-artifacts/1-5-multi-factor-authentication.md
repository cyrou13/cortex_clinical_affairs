# Story 1.5: Multi-Factor Authentication

Status: ready-for-dev

## Story

As an admin,
I want all users to set up MFA (TOTP or Passkeys) after first login,
So that the system meets S3 security requirements and 21 CFR Part 11 compliance.

## Acceptance Criteria

**Given** a user who has completed Google OAuth login
**When** MFA is not yet configured for this user
**Then** the system redirects to MFA setup page
**And** the user can set up TOTP via QR code (compatible with Google Authenticator, Authy)
**And** alternatively, the user can register a WebAuthn/Passkey device
**And** the system requires MFA verification on every new session
**And** recovery codes are generated and shown once (user must save them)
**And** MFA device management is available in user settings (add, remove devices)
**And** the MfaSetup component follows UX spec styling (Cortex Blue, professional layout)

## Tasks / Subtasks

### Phase 1: Backend — TOTP Implementation

- [ ] **T1.1** Install TOTP dependencies in `apps/api`
  - `speakeasy` (or `otpauth`) — TOTP generation and verification
  - `qrcode` — QR code generation for authenticator apps
- [ ] **T1.2** Create `apps/api/src/modules/auth/infrastructure/services/totp-service.ts`
  - `generateSecret()` — generates TOTP secret, returns { secret, otpauthUrl, qrCodeDataUrl }
  - `verifyToken(secret, token)` — verifies a 6-digit TOTP code, returns boolean
  - `generateRecoveryCodes(count: 10)` — generates 10 single-use recovery codes
  - QR code label: "CORTEX Clinical Affairs ({userEmail})"
  - Compatible with Google Authenticator, Authy, 1Password
  - AC: TOTP via QR code compatible with Google Authenticator, Authy
- [ ] **T1.3** Create `apps/api/src/modules/auth/application/use-cases/setup-totp.ts`
  - Generate TOTP secret
  - Return QR code data URL and recovery codes
  - Do NOT save the secret yet — save only after user verifies a code
- [ ] **T1.4** Create `apps/api/src/modules/auth/application/use-cases/verify-totp-setup.ts`
  - User enters a TOTP code from their authenticator app
  - Verify the code against the pending secret
  - If valid: save MfaDevice record (type: TOTP), encrypt secret with AES-256, store encrypted
  - Mark `user.mfaEnabled = true`
  - Return the recovery codes (shown once only)
  - AC: recovery codes generated and shown once

### Phase 2: Backend — WebAuthn/Passkey Implementation

- [ ] **T2.1** Install WebAuthn dependencies
  - `@simplewebauthn/server` 13.2.x
- [ ] **T2.2** Create `apps/api/src/modules/auth/infrastructure/services/webauthn-service.ts`
  - `generateRegistrationOptions(user)` — creates WebAuthn registration challenge
  - `verifyRegistration(response)` — verifies registration response, returns credential data
  - `generateAuthenticationOptions(user)` — creates WebAuthn authentication challenge
  - `verifyAuthentication(response)` — verifies authentication response
  - Relying Party ID: configured via env (e.g., "cortex.yourdomain.com")
  - AC: user can register a WebAuthn/Passkey device
- [ ] **T2.3** Create `apps/api/src/modules/auth/application/use-cases/register-webauthn.ts`
  - Generate registration options
  - Verify registration response
  - Save MfaDevice record (type: WEBAUTHN) with credentialId, publicKey, counter
- [ ] **T2.4** Create `apps/api/src/modules/auth/application/use-cases/authenticate-webauthn.ts`
  - Generate authentication options
  - Verify authentication response
  - Increment counter (replay prevention)

### Phase 3: Backend — MFA Verification Flow

- [ ] **T3.1** Create `apps/api/src/modules/auth/application/use-cases/verify-mfa.ts`
  - Accept TOTP code OR WebAuthn response OR recovery code
  - For TOTP: verify against stored encrypted secret
  - For WebAuthn: verify authentication response
  - For recovery code: verify and mark as used (single-use)
  - On success: issue full session tokens (access + refresh)
  - AC: system requires MFA verification on every new session
- [ ] **T3.2** Update login flow to require MFA
  - After Google OAuth success, if `user.mfaEnabled`: return `{ requiresMfa: true, mfaSessionToken }` (temporary token for MFA step only)
  - MFA session token is short-lived (5 minutes) and scoped to MFA verification only
  - Full access/refresh tokens issued only after MFA verification
- [ ] **T3.3** Create GraphQL mutations for MFA
  - `setupTotp()` — returns QR code and pending secret
  - `verifyTotpSetup(code)` — confirms TOTP setup
  - `registerWebauthn()` — returns registration options
  - `verifyWebauthnRegistration(response)` — confirms WebAuthn registration
  - `verifyMfa(input: { totpCode?, webauthnResponse?, recoveryCode? })` — verifies MFA on login
  - `removeMfaDevice(deviceId)` — removes an MFA device (admin or self)

### Phase 4: Backend — MFA Device Management

- [ ] **T4.1** Create `apps/api/src/modules/auth/application/use-cases/manage-mfa-devices.ts`
  - List user's MFA devices
  - Remove MFA device (must keep at least one active device if MFA is enabled)
  - Regenerate recovery codes (invalidates old ones)
  - AC: MFA device management available in user settings

### Phase 5: Frontend — MFA Setup Flow

- [ ] **T5.1** Create MFA redirect logic in `apps/web/src/routes/_authenticated.tsx`
  - After login, if `user.mfaEnabled === false`: redirect to `/mfa-setup`
  - After login, if `requiresMfa === true`: redirect to `/mfa-verify`
  - AC: system redirects to MFA setup page when not configured
- [ ] **T5.2** Create `apps/web/src/features/auth/components/MfaSetup.tsx`
  - Step 1: Choose method — TOTP or Passkey
  - Step 2 (TOTP):
    - Display QR code (large, centered, scannable)
    - "Scan this code with your authenticator app" instructions
    - Manual entry key fallback (for users who can't scan)
    - 6-digit code input field for verification
  - Step 2 (Passkey):
    - "Register your device" button
    - Browser WebAuthn prompt
    - Success confirmation
  - Step 3: Recovery codes displayed
    - Grid of 10 codes
    - "Download codes" button (text file)
    - "I have saved my codes" checkbox — must be checked to continue
    - Warning: "These codes will not be shown again"
  - Styling: Cortex Blue palette, centered card layout, professional appearance
  - AC: MfaSetup follows UX spec styling
- [ ] **T5.3** Create `apps/web/src/features/auth/components/MfaVerify.tsx`
  - TOTP verification: 6-digit code input, auto-submit when 6 digits entered
  - Passkey verification: "Use your passkey" button triggering browser prompt
  - Recovery code fallback: "Use recovery code" link
  - "Remember this device for 30 days" checkbox (optional, stored as trusted device)
- [ ] **T5.4** Create MFA routes
  - `apps/web/src/routes/mfa-setup.tsx`
  - `apps/web/src/routes/mfa-verify.tsx`

### Phase 6: Frontend — User Settings MFA Management

- [ ] **T6.1** Create MFA section in user settings page
  - List registered MFA devices (type, name, created date)
  - Add new device (TOTP or Passkey)
  - Remove device (confirmation dialog)
  - Regenerate recovery codes
  - AC: MFA device management in user settings

### Phase 7: Testing

- [ ] **T7.1** Unit tests for TOTP service (generate, verify)
- [ ] **T7.2** Unit tests for WebAuthn service (registration, authentication)
- [ ] **T7.3** Unit tests for MFA verification use case (TOTP, WebAuthn, recovery code)
- [ ] **T7.4** Integration test: full MFA setup flow (Google login -> MFA setup -> MFA verify -> authenticated)
- [ ] **T7.5** Frontend tests: MfaSetup component renders correctly
- [ ] **T7.6** Frontend tests: MfaVerify component handles all methods

## Dev Notes

### Tech Stack & Versions

| Technology              | Version | Package                              |
| ----------------------- | ------- | ------------------------------------ |
| speakeasy               | latest  | `speakeasy`                          |
| qrcode                  | latest  | `qrcode`                             |
| @simplewebauthn/server  | 13.2.x  | `@simplewebauthn/server`             |
| @simplewebauthn/browser | latest  | `@simplewebauthn/browser` (frontend) |

### MFA Authentication Flow

```
Login Flow (MFA enabled):
1. User completes Google OAuth -> loginWithGoogle mutation
2. Backend returns { requiresMfa: true, mfaSessionToken }
3. Frontend redirects to /mfa-verify
4. User enters TOTP code / uses Passkey / enters recovery code
5. Frontend calls verifyMfa(mfaSessionToken, { totpCode })
6. Backend verifies MFA, issues full access + refresh tokens
7. Frontend stores tokens, redirects to app

First-Time Setup Flow:
1. User completes Google OAuth (mfaEnabled: false)
2. Frontend redirects to /mfa-setup
3. User chooses TOTP or Passkey
4. User completes setup + saves recovery codes
5. mfaEnabled set to true
6. Redirected to app
```

### Security Considerations

- **TOTP secrets**: encrypted with AES-256 before storage in `MfaDevice.secret`
- **Recovery codes**: hashed with bcrypt before storage, shown plain-text only once during setup
- **WebAuthn counter**: incremented on each authentication (replay prevention)
- **MFA session token**: short-lived (5 min), scoped to MFA verification only, NOT usable for API access
- **At least one device**: cannot remove last MFA device if MFA is enabled
- **21 CFR Part 11**: MFA requirement satisfies the "verified identity" component of electronic signatures

### Recovery Codes Format

- 10 codes, each 8 characters, alphanumeric (uppercase)
- Format: `XXXX-XXXX` (e.g., `A4B2-C8D1`)
- Each code is single-use (marked as used after successful verification)
- Regenerating codes invalidates all previous codes

### Anti-Patterns to Avoid

- Do NOT store TOTP secrets in plain text — must be encrypted
- Do NOT show recovery codes after initial setup — they are shown ONCE only
- Do NOT allow MFA bypass in production — MFA is mandatory (S3)
- Do NOT cache MFA secrets in client — all verification happens server-side
- Do NOT use SMS-based MFA — not supported, TOTP and Passkeys only

### Project Structure Notes

```
apps/api/src/modules/auth/
├── application/use-cases/
│   ├── google-oauth.ts              # Updated — MFA check
│   ├── setup-totp.ts                # NEW
│   ├── verify-totp-setup.ts         # NEW
│   ├── register-webauthn.ts         # NEW
│   ├── authenticate-webauthn.ts     # NEW
│   ├── verify-mfa.ts               # NEW
│   └── manage-mfa-devices.ts       # NEW
├── infrastructure/services/
│   ├── jwt-service.ts               # Existing
│   ├── totp-service.ts              # NEW
│   └── webauthn-service.ts          # NEW
└── graphql/
    └── mutations.ts                 # Updated — MFA mutations

apps/web/src/
├── routes/
│   ├── mfa-setup.tsx                # NEW
│   ├── mfa-verify.tsx               # NEW
│   └── _authenticated.tsx           # Updated — MFA redirect
└── features/auth/
    └── components/
        ├── MfaSetup.tsx             # NEW
        ├── MfaVerify.tsx            # NEW
        └── LoginForm.tsx            # Existing
```

### References

- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (Authentication & Security — MFA: TOTP + WebAuthn/Passkeys)
- Epics: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 1.5)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
