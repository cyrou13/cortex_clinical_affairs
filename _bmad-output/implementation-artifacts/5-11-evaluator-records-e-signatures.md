# Story 5.11: Evaluator Records & E-Signatures

Status: ready-for-dev

## Story

As an RA Manager,
I want to assign evaluator roles, attach CVs, record COI declarations, and sign documents electronically,
So that the CER meets 21 CFR Part 11 electronic signature requirements.

## Acceptance Criteria

**Given** a CER ready for finalization
**When** evaluator records are configured
**Then** evaluator roles can be assigned per CER section: written_by, verified_by, approved_by (FR58k)
**And** evaluator CVs can be attached to CER metadata (FR58l)
**And** evaluator COI (Conflict of Interest) declarations can be recorded (FR58m)
**And** evaluator metadata and signature trail are displayed (FR58n)
**When** the RA Manager finalizes the CER
**Then** the ESignatureModal requires: password re-entry -> bcrypt verify -> SHA-256 hash of document content -> timestamp + userId logged (S5)
**And** the modal displays: document name, action, legal statement "This signature has the same legal value as a handwritten signature"
**And** successful signature shows a check animation
**And** the signature is immutable and logged in the audit trail

## Tasks / Subtasks

### Backend

- [ ] Extend `Evaluator` model in `cer.prisma` (created in Story 5.1):
  - `id` UUID
  - `cerVersionId` UUID (relation to CerVersion)
  - `userId` UUID (relation to User)
  - `role` enum: WRITTEN_BY, VERIFIED_BY, APPROVED_BY
  - `cerSectionId` UUID (optional - section-level assignment)
  - `cvFileUrl` String (MinIO path to uploaded CV)
  - `cvFileName` String
  - `cvUploadedAt` DateTime
  - `coiDeclaration` Text (conflict of interest statement)
  - `coiDeclaredAt` DateTime
  - `coiHasConflict` Boolean
  - `coiConflictDetails` Text (if hasConflict = true)
  - `signedAt` DateTime
  - `signatureHash` String (SHA-256 hash of document content at signing time)
  - `signatureValid` Boolean
  - `assignedAt` DateTime
  - `assignedById` UUID
- [ ] Create `ESignature` model in `cer.prisma`:
  - `id` UUID
  - `cerVersionId` UUID
  - `userId` UUID
  - `action` String (e.g., "FINALIZE_CER", "APPROVE_SECTION")
  - `documentHash` String (SHA-256 of document content)
  - `timestamp` DateTime
  - `ipAddress` String
  - `userAgent` String
  - `legalStatement` String ("This signature has the same legal value as a handwritten signature")
  - `verified` Boolean (bcrypt password verification result)
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/manage-evaluators.ts`:
  - Assign evaluator roles per CER section or per CER version
  - Validate user exists and has appropriate role
  - One WRITTEN_BY, one VERIFIED_BY, one APPROVED_BY per section
  - APPROVED_BY must not be same person as WRITTEN_BY (separation of duties)
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/upload-evaluator-cv.ts`:
  - Accept file upload (PDF, DOCX)
  - Store in MinIO under `cer/{cerVersionId}/evaluators/{userId}/cv.{ext}`
  - Update Evaluator record with file URL and metadata
  - Validate file size (max 10MB) and type
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/record-coi-declaration.ts`:
  - Accept COI declaration text
  - Record whether evaluator has a conflict of interest
  - If conflict exists, require conflict details
  - Set coiDeclaredAt timestamp
  - COI must be declared before evaluator can sign
- [ ] Create use case `apps/api/src/modules/cer/application/use-cases/e-sign-document.ts` (in auth module):
  - Accept: userId, password, cerVersionId, action
  - Step 1: Verify password via bcrypt comparison against stored hash
  - Step 2: Compute SHA-256 hash of current CER document content (all sections concatenated)
  - Step 3: Create ESignature record with: userId, documentHash, timestamp, ipAddress, userAgent, legalStatement
  - Step 4: Update Evaluator record with signedAt and signatureHash
  - Step 5: Log in audit trail with full details
  - Step 6: Emit domain event `cer.document.signed`
  - Throw `PermissionDeniedError` if password verification fails
  - Throw `ValidationError` if COI not declared
  - Throw `ValidationError` if CV not uploaded
- [ ] Create service `apps/api/src/shared/services/checksum-service.ts` (if not already existing):
  - `computeHash(content: string): string` - SHA-256 hash computation
  - `verifyHash(content: string, hash: string): boolean` - hash verification
- [ ] Create GraphQL types for Evaluator, ESignature
- [ ] Create GraphQL queries:
  - `evaluators(cerVersionId: UUID!)` - list evaluators for CER
  - `evaluatorsBySections(cerVersionId: UUID!)` - evaluators grouped by section
  - `signatureTrail(cerVersionId: UUID!)` - all e-signatures for CER
  - `evaluatorCompleteness(cerVersionId: UUID!)` - check if all evaluators have CV + COI
- [ ] Create GraphQL mutations:
  - `assignEvaluator(input: AssignEvaluatorInput!)` - assign evaluator role
  - `removeEvaluator(evaluatorId: UUID!)` - remove evaluator assignment
  - `uploadEvaluatorCv(evaluatorId: UUID!, file: Upload!)` - upload CV file
  - `recordCoiDeclaration(input: CoiDeclarationInput!)` - record COI
  - `eSignDocument(input: ESignInput!)` - execute e-signature
- [ ] Create file upload handler for CV files:
  - REST endpoint `/api/upload/evaluator-cv` (file upload via REST, not GraphQL)
  - Validate file type and size
  - Store in MinIO
  - Return file URL
- [ ] Write unit tests for e-signature flow (password verify + hash + audit)
- [ ] Write unit tests for evaluator assignment validation (separation of duties)
- [ ] Write unit tests for COI declaration requirements

### Frontend

- [ ] Create `EvaluatorPanel.tsx` component in `apps/web/src/features/cer/components/`:
  - Section-by-section evaluator assignment view
  - For each section: three evaluator slots (Written By, Verified By, Approved By)
  - User selector dropdown for each slot (filtered by role: RA Manager, Admin)
  - CV status indicator: uploaded (green check) / missing (orange warning)
  - COI status indicator: declared (green check) / pending (orange warning)
  - Signature status: signed (green lock) / unsigned (gray)
  - Overall completeness summary at top
- [ ] Create `EvaluatorAssignmentForm.tsx` component:
  - User selector (searchable dropdown from project team members)
  - Role selector: Written By / Verified By / Approved By
  - Section selector: specific section or "All sections"
  - Validation: APPROVED_BY cannot be same as WRITTEN_BY
  - Error message if conflict of interest not yet declared
- [ ] Create `CvUploader.tsx` component:
  - File upload area (drag-and-drop or click to browse)
  - Accepted formats: PDF, DOCX
  - Max size: 10MB
  - Upload progress indicator
  - Preview/download link after upload
  - Replace CV action
- [ ] Create `CoiDeclarationForm.tsx` component:
  - Radio: "I have no conflict of interest" / "I declare the following conflict of interest"
  - If conflict: textarea for conflict details
  - Declaration timestamp shown after submission
  - Immutable after submission (can only be re-declared, not edited)
- [ ] Create `ESignatureModal.tsx` component in `apps/web/src/features/auth/components/` (shared):
  - Full-screen-ish dialog (max-width 480px, centered)
  - Icon: shield + pen in blue-800
  - Title: "Electronic Signature Required"
  - Context: document name, action being performed
  - Legal statement: "This signature has the same legal value as a handwritten signature"
  - Password input field (autocomplete="current-password")
  - Buttons: "Cancel" (secondary) + "Sign and Lock" (success, disabled until password entered)
  - States:
    - Default: password field empty, Sign button disabled
    - Password entered: Sign button enabled
    - Signing: spinner on Sign button, fields disabled
    - Success: check animation (300ms), green success feedback, auto-close after 2s
    - Failed: shake animation, error message "Incorrect password", clear field
  - Focus trap: Tab cycles within modal only
  - Escape to cancel
  - `aria-modal="true"`, `aria-describedby` on legal statement
- [ ] Create `SignatureTrail.tsx` component:
  - Timeline view of all signatures on the CER
  - Each entry: user name, role, action, timestamp, document hash (truncated)
  - Verification status icon (green check = hash matches)
  - Expandable to show full details
  - Used in CER dashboard and evaluator panel
- [ ] Create hooks:
  - `apps/web/src/features/cer/hooks/use-evaluators.ts` - evaluator queries + mutations
  - `apps/web/src/features/cer/hooks/use-e-signature.ts` - e-signature mutation
  - `apps/web/src/features/cer/hooks/use-cv-upload.ts` - file upload (TanStack Query, not Apollo)
- [ ] Add "Evaluators" item to CER module sidebar navigation

## Dev Notes

### Technology Stack

- **Backend**: Fastify 5.7, Apollo Server 4, Prisma 7.2
- **Security**: bcrypt for password verification, SHA-256 (crypto module) for document hashing
- **File Upload**: MinIO (S3-compatible), REST endpoint for file upload, TanStack Query on frontend
- **Frontend**: React 19, Apollo Client 3.x (GraphQL), TanStack Query (file upload REST), shadcn/ui

### Architecture Patterns

- **21 CFR Part 11 Compliance**: Password re-entry + bcrypt verify + SHA-256 document hash + timestamp + userId
- **Separation of Duties**: APPROVED_BY must differ from WRITTEN_BY (enforced server-side)
- **File Upload**: REST endpoint (not GraphQL) for file uploads, stored in MinIO
- **Immutable Signatures**: ESignature records are immutable (no UPDATE or DELETE)
- **Audit Trail**: E-signature action logged automatically via audit middleware

### E-Signature Flow

```
1. User clicks "Sign and Lock"
2. ESignatureModal opens
3. User reads legal statement and enters password
4. Frontend sends: { userId, password, cerVersionId, action }
5. Backend: bcrypt.compare(password, user.passwordHash)
6. Backend: sha256(allSectionsContent.join(''))
7. Backend: CREATE ESignature { userId, documentHash, timestamp, ipAddress }
8. Backend: UPDATE Evaluator { signedAt, signatureHash }
9. Backend: AUDIT LOG { action: 'E_SIGN_DOCUMENT', ... }
10. Backend: EMIT 'cer.document.signed'
11. Frontend: success animation, auto-close modal
```

### UX Design Notes

- **ESignatureModal**: The most solemn interaction in CORTEX. Shield+pen icon, blue-800 color, legal statement prominently displayed.
- **Success Animation**: Check animation (300ms) with subtle confetti (respects `prefers-reduced-motion`)
- **Failed State**: Shake animation on modal, "Incorrect password" error, clear password field
- **Evaluator Panel**: Clean grid showing section -> evaluator assignments with status indicators
- **CV Upload**: Drag-and-drop area, progress bar, green check on completion
- **COI Declaration**: Simple radio + textarea, timestamp immutability conveys seriousness
- **Signature Trail**: Timeline view for audit, professional and confidence-inspiring

### Project Structure Notes

```
apps/api/src/modules/cer/
├── application/use-cases/
│   ├── manage-evaluators.ts              (NEW)
│   ├── upload-evaluator-cv.ts            (NEW)
│   └── record-coi-declaration.ts         (NEW)
└── graphql/
    ├── types.ts                          (UPDATED)
    ├── queries.ts                        (UPDATED)
    └── mutations.ts                      (UPDATED)

apps/api/src/modules/auth/
├── application/use-cases/
│   └── e-sign-document.ts               (NEW)
└── graphql/
    └── mutations.ts                      (UPDATED)

apps/api/src/shared/services/
└── checksum-service.ts                   (NEW or UPDATE)

apps/web/src/features/cer/components/
├── EvaluatorPanel.tsx                    (NEW)
├── EvaluatorAssignmentForm.tsx           (NEW)
├── CvUploader.tsx                        (NEW)
├── CoiDeclarationForm.tsx                (NEW)
└── SignatureTrail.tsx                    (NEW)

apps/web/src/features/auth/components/
└── ESignatureModal.tsx                   (NEW - shared component)

apps/web/src/features/cer/hooks/
├── use-evaluators.ts                     (NEW)
├── use-e-signature.ts                    (NEW)
└── use-cv-upload.ts                      (NEW)

packages/prisma/schema/cer.prisma         (UPDATED)
```

### Dependencies

- Depends on Story 5.1 (Evaluator model, CER creation)
- Depends on Story 1.4 (User authentication, password storage for bcrypt verify)
- Depends on Story 1.6 (RBAC for evaluator role validation)
- Depends on Story 1.7 (audit trail for signature logging)
- FR references: FR58k, FR58l, FR58m, FR58n, S5

### References

- PRD: FR58k (evaluator roles), FR58l (CVs), FR58m (COI), FR58n (signature trail), S5 (21 CFR Part 11)
- Architecture: bcrypt + SHA-256 for e-signatures, MinIO for CV storage, ESignatureModal UX spec
- UX Design Spec: ESignatureModal component spec (section 8), irréversible action patterns
- Epics: Epic 5 Story 5.11

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
