# Story 1.4: User Authentication & Session Management

Status: done

## Story

As a user,
I want to log in securely via Google OAuth with JWT session management,
So that my identity is verified and my session persists across browser tabs.

## Acceptance Criteria

**Given** a user with a valid Google Workspace account
**When** the user clicks "Sign in with Google"
**Then** the system redirects to Google OAuth 2.0 consent screen
**And** upon successful authentication, a JWT access token (15min TTL) and refresh token (7 days, Redis-stored) are issued
**And** the User record is created in the database if first login (with default role)
**And** the session times out after 30 minutes of inactivity (S8)
**And** the refresh token is rotated on each use (prevent replay)
**And** all authentication data is encrypted at rest (AES-256) and in transit (TLS 1.3) (S1)
**And** the login page displays the CORTEX branding with Cortex Blue palette
**And** failed login attempts are logged in the audit trail

## Tasks / Subtasks

### Phase 1: Backend — Google OAuth Integration

- [ ] **T1.1** Install auth dependencies in `apps/api`
  - `google-auth-library` — Google OAuth verification
  - `jsonwebtoken` — JWT generation/verification
  - `@types/jsonwebtoken` — TypeScript types
  - `ioredis` — Redis client for session storage
- [ ] **T1.2** Create `apps/api/src/modules/auth/infrastructure/services/jwt-service.ts`
  - `generateAccessToken(userId, role)` — JWT, 15min TTL, includes userId and role
  - `generateRefreshToken()` — random secure token, stored in Redis with 7-day TTL
  - `verifyAccessToken(token)` — returns decoded payload or throws
  - `rotateRefreshToken(oldToken)` — invalidate old, issue new (prevent replay)
  - AC: JWT access token (15min TTL), refresh token (7 days, Redis-stored)
- [ ] **T1.3** Create `apps/api/src/modules/auth/application/use-cases/google-oauth.ts`
  - Verify Google OAuth token using `google-auth-library`
  - Extract email, name, Google ID, avatar from token
  - Check if User exists by googleId — if not, create with default role (CLINICAL_SPECIALIST)
  - Generate access + refresh tokens
  - Create Session record in database
  - Log login event to audit trail
  - AC: User record created if first login with default role
- [ ] **T1.4** Create `apps/api/src/modules/auth/graphql/mutations.ts`
  - `loginWithGoogle(googleToken)` — calls google-oauth use case, returns `{ accessToken, refreshToken, user }`
  - `refreshToken(refreshToken)` — validates refresh token, rotates it, returns new access + refresh tokens
  - `logout(refreshToken)` — invalidates refresh token in Redis and deletes Session record
  - AC: refresh token rotated on each use
- [ ] **T1.5** Create `apps/api/src/modules/auth/graphql/queries.ts`
  - `me` — returns current authenticated user from context

### Phase 2: Backend — Auth Middleware

- [ ] **T2.1** Create `apps/api/src/shared/middleware/auth-middleware.ts`
  - Fastify preHandler hook that extracts Bearer token from Authorization header
  - Verifies JWT access token
  - Attaches user (id, role) to request context
  - For unauthenticated requests: sets user to null (some routes may allow)
  - AC: auth middleware validates tokens
- [ ] **T2.2** Integrate auth middleware with GraphQL context
  - Pass authenticated user to `GraphQLContext` (from Story 1.2)
  - All resolvers can access `ctx.user`
- [ ] **T2.3** Implement session inactivity timeout
  - On each authenticated request, update `Session.lastActivityAt` in Redis
  - Check `lastActivityAt` — if > 30 minutes since last activity, invalidate session
  - Return specific error code `SESSION_EXPIRED` for frontend to handle
  - AC: session times out after 30 minutes of inactivity

### Phase 3: Backend — Redis Session Store

- [ ] **T3.1** Create `apps/api/src/config/redis.ts` — Redis connection (update placeholder from 1.2)
  - Connect to Redis using `ioredis`
  - Expose `redis` client instance
- [ ] **T3.2** Implement refresh token storage in Redis
  - Key pattern: `session:{userId}:{refreshTokenHash}`
  - Value: `{ userId, createdAt, lastActivityAt, ipAddress, userAgent }`
  - TTL: 7 days
  - On rotation: delete old key, create new key
  - AC: refresh tokens stored in Redis

### Phase 4: Backend — Audit Logging for Auth

- [ ] **T4.1** Log successful login events
  - AuditLog entry: `{ action: 'auth.login.success', targetType: 'User', targetId: userId }`
- [ ] **T4.2** Log failed login attempts
  - AuditLog entry: `{ action: 'auth.login.failed', targetType: 'User', metadata: { reason, email } }`
  - AC: failed login attempts logged in audit trail
- [ ] **T4.3** Log token refresh events
- [ ] **T4.4** Log logout events

### Phase 5: Frontend — Login Page

- [ ] **T5.1** Create `apps/web/src/routes/login.tsx` — Login page
  - CORTEX branding: logo area, Cortex Blue palette, "Regulatory Compliance, Simplified" tagline
  - "Sign in with Google" button (Google branding guidelines compliant)
  - Background: #F8F9FA with centered card (white, shadow-sm)
  - Professional layout matching UX spec design direction
  - AC: login page displays CORTEX branding with Cortex Blue palette
- [ ] **T5.2** Implement Google OAuth flow on frontend
  - Use `@react-oauth/google` or direct OAuth redirect
  - On success: call `loginWithGoogle` GraphQL mutation
  - Store access token in memory (not localStorage for security)
  - Store refresh token in httpOnly cookie or secure storage
- [ ] **T5.3** Configure Apollo Client auth link
  - Inject Bearer token into every GraphQL request header
  - On 401/token expired: automatically call refresh mutation
  - On refresh failure: redirect to login page

### Phase 6: Frontend — Session Management

- [ ] **T6.1** Create `apps/web/src/shared/hooks/use-current-user.ts`
  - Apollo query for `me` — returns current user data
  - Caches user data in Apollo normalized cache
- [ ] **T6.2** Create `apps/web/src/features/auth/hooks/use-auth.ts`
  - `login(googleToken)` — calls mutation, stores tokens
  - `logout()` — calls mutation, clears tokens, redirects to login
  - `refreshSession()` — calls refresh mutation
  - `isAuthenticated` — boolean based on token presence
- [ ] **T6.3** Implement automatic token refresh
  - Set up interval to refresh token before access token expires (at ~12 minutes)
  - Handle refresh failure gracefully (redirect to login)
- [ ] **T6.4** Implement inactivity detection on frontend
  - Track user activity (mouse move, key press, scroll)
  - Show warning dialog 5 minutes before session timeout
  - Auto-logout at 30 minutes of inactivity
  - AC: session timeout at 30 minutes of inactivity

### Phase 7: Frontend — Auth Route Guard

- [ ] **T7.1** Update `apps/web/src/routes/_authenticated.tsx`
  - Check authentication status before rendering child routes
  - Redirect to `/login` if not authenticated
  - Show loading state while checking auth
  - After login, redirect to originally requested URL

### Phase 8: Testing

- [ ] **T8.1** Unit tests for JWT service (generate, verify, rotate)
- [ ] **T8.2** Unit tests for Google OAuth use case (user creation, existing user login)
- [ ] **T8.3** Integration test: full login flow (Google token -> JWT -> authenticated query)
- [ ] **T8.4** Integration test: refresh token rotation
- [ ] **T8.5** Integration test: session timeout
- [ ] **T8.6** Frontend test: login page renders correctly
- [ ] **T8.7** Frontend test: auth redirect works

## Dev Notes

### Tech Stack & Versions

| Technology          | Version | Package                                                 |
| ------------------- | ------- | ------------------------------------------------------- |
| google-auth-library | latest  | `google-auth-library`                                   |
| jsonwebtoken        | latest  | `jsonwebtoken`                                          |
| ioredis             | latest  | `ioredis`                                               |
| @react-oauth/google | latest  | `@react-oauth/google` (optional — or use redirect flow) |

### Authentication Flow

```
1. User clicks "Sign in with Google"
2. Browser redirects to Google OAuth consent screen
3. Google returns authorization code/token to callback
4. Frontend sends Google token to backend: mutation loginWithGoogle(googleToken)
5. Backend verifies Google token via google-auth-library
6. Backend creates/finds User record
7. Backend generates JWT access token (15min) + refresh token (7 days)
8. Backend stores refresh token in Redis, creates Session in DB
9. Backend returns { accessToken, refreshToken, user }
10. Frontend stores accessToken in memory, refreshToken in httpOnly cookie
11. Frontend injects accessToken in Authorization header for all GraphQL requests
12. At ~12 minutes: frontend auto-refreshes token
13. At 30 minutes of inactivity: session expires
```

### JWT Token Structure

```typescript
// Access Token payload
{
  sub: string; // User ID
  role: UserRole; // User role
  iat: number; // Issued at
  exp: number; // Expires at (15 min)
}

// Refresh Token
// Random 256-bit token, SHA-256 hashed for storage
// Stored in Redis with key: session:{userId}:{hash}
```

### Environment Variables Required

```
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/callback
JWT_SECRET=<32-byte-random-secret>
JWT_REFRESH_SECRET=<32-byte-random-secret>
REDIS_URL=redis://localhost:6379
SESSION_TIMEOUT_MINUTES=30
```

### Security Requirements (from NFRs)

- **S1**: All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- **S8**: Session timeout after 30 minutes of inactivity
- Refresh token rotation prevents replay attacks
- Access tokens are short-lived (15 minutes)
- Failed login attempts are logged for security monitoring

### Anti-Patterns to Avoid

- Do NOT store access tokens in localStorage — use in-memory only (XSS protection)
- Do NOT send tokens in URL query parameters
- Do NOT log full tokens in audit trail — log token hash or session ID only
- Do NOT skip token rotation on refresh — always invalidate old token
- Do NOT bypass auth middleware — every mutation/query except login must be authenticated
- Do NOT store plain refresh tokens — hash with SHA-256 before Redis storage

### Project Structure Notes

```
apps/api/src/
├── modules/auth/
│   ├── application/
│   │   └── use-cases/
│   │       └── google-oauth.ts          # NEW
│   ├── infrastructure/
│   │   ├── repositories/
│   │   │   └── user-repository.ts       # NEW
│   │   └── services/
│   │       └── jwt-service.ts           # NEW
│   └── graphql/
│       ├── types.ts                     # Updated — Auth types
│       ├── queries.ts                   # Updated — me query
│       └── mutations.ts                 # NEW — login, refresh, logout
├── shared/
│   └── middleware/
│       └── auth-middleware.ts           # NEW
└── config/
    └── redis.ts                         # Updated from placeholder

apps/web/src/
├── routes/
│   ├── login.tsx                        # NEW
│   └── _authenticated.tsx               # Updated with auth guard
├── features/auth/
│   ├── components/
│   │   └── LoginForm.tsx                # NEW
│   └── hooks/
│       └── use-auth.ts                  # NEW
└── shared/hooks/
    └── use-current-user.ts              # Updated from placeholder
```

### References

- Architecture: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/architecture.md` (Authentication & Security section)
- UX Spec: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/ux-design-specification.md` (Login page branding)
- Epics: `/Users/cyril/Documents/dev/cortex-clinical-affairs/_bmad-output/planning-artifacts/epics.md` (Story 1.4)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
