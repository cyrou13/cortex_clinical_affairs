# Handoff: Frontend Wiring — Components → Routes

## Situation

The Cortex frontend has **104 components** built and unit-tested across 5 modules, but only **3 are routed** into actual pages. The backend (GraphQL resolvers, use-cases, workers) is complete. GraphQL query/mutation files exist in each module's `graphql/` folder. The task is purely **frontend wiring**: compose existing components into route pages and register them in the router.

## Architecture Reference

- **Router**: `apps/web/src/router.tsx` — pattern-based, lazy-loaded
- **Layout**: `apps/web/src/shared/layouts/AppLayout.tsx` — sidebar + main content
- **Navigation**: `import { navigate } from '../../router'` for SPA transitions
- **Routes location**: `apps/web/src/routes/_authenticated/projects/$projectId/`
- **Components location**: `apps/web/src/features/{module}/components/`
- **GraphQL location**: `apps/web/src/features/{module}/graphql/{queries,mutations}.ts`
- **Design tokens**: `--cortex-*` CSS variables, Tailwind CSS 4
- **Icons**: `lucide-react`

### Key Patterns

- Default export for route pages: `export default function PageName()`
- Extract URL params from `window.location.pathname.split('/')`
- Use `useQuery`/`useMutation` from `@apollo/client/react`, `gql` from `@apollo/client`
- GraphQL mutations use **flat args** (not wrapped in `input`), e.g. `createSlsSession(name: $name, type: $type, projectId: $projectId)`
- Check existing mutation files for exact variable names before wiring

### Router Pattern

```typescript
// In apps/web/src/router.tsx
{
  pattern: /^\/projects\/([^/]+)\/module-name\/?$/,
  component: () => import('./routes/_authenticated/projects/$projectId/module-name/index'),
},
```

---

## Module 1: SLS (Systematic Literature Search)

### Already Wired

- `SlsSidebar` — session list + "New Session" button → ✅ routed
- `SessionCreateForm` — create session modal → ✅ routed
- `SessionDashboard` — session info (static metrics) → ✅ routed but incomplete

### Components to Wire (in workflow order)

#### Phase 1: Query Management (compose into SessionDashboard or sub-page)

| Component                | Props to investigate | Purpose                    |
| ------------------------ | -------------------- | -------------------------- |
| `QueryBuilder`           | sessionId            | PubMed query text editor   |
| `QueryList`              | sessionId            | List queries for session   |
| `QueryVersionHistory`    | queryId              | Version history of a query |
| `ExecuteQueryButton`     | queryId, databases   | Trigger query execution    |
| `QueryExecutionProgress` | executionId          | Real-time progress         |
| `QueryExecutionHistory`  | queryId              | Past execution results     |

#### Phase 2: Article Pool

| Component              | Props to investigate | Purpose                          |
| ---------------------- | -------------------- | -------------------------------- |
| `ArticlePoolDashboard` | sessionId            | Overview of imported articles    |
| `ArticleTable`         | sessionId            | Sortable/filterable article list |
| `ArticleDetailPanel`   | articleId            | Single article detail view       |
| `DeduplicationSummary` | sessionId            | Duplicate detection results      |

#### Phase 3: AI Scoring

| Component                  | Props to investigate | Purpose                      |
| -------------------------- | -------------------- | ---------------------------- |
| `LaunchAiScreeningButton`  | sessionId            | Start AI scoring             |
| `AiScoringProgress`        | taskId               | Real-time scoring progress   |
| `AiAcceptanceRate`         | sessionId            | Score distribution chart     |
| `AiReasoningBox`           | articleId            | AI reasoning for one article |
| `RelevanceThresholdConfig` | sessionId            | Configure score thresholds   |
| `CustomAiFilterEditor`     | sessionId            | Custom AI filter CRUD        |

#### Phase 4: Screening

| Component                  | Props to investigate | Purpose                   |
| -------------------------- | -------------------- | ------------------------- |
| `ScreeningPanel`           | sessionId            | Main screening workspace  |
| `ScreeningFilterTabs`      | sessionId            | Filter by status/category |
| `ScreeningDecisionDialog`  | articleId            | Include/exclude decision  |
| `BulkActionsToolbar`       | sessionId            | Bulk screening actions    |
| `ScreeningProgressMetrics` | sessionId            | Progress stats            |
| `ExclusionCodeManager`     | sessionId            | Manage exclusion codes    |
| `ExclusionCodeSelector`    | sessionId            | Pick exclusion code       |
| `AcceptanceRateWidget`     | sessionId            | Acceptance rate display   |
| `ScreeningAuditPanel`      | sessionId            | Screening decision log    |

#### Phase 5: Spot Check & Lock

| Component                | Props to investigate | Purpose                    |
| ------------------------ | -------------------- | -------------------------- |
| `SpotCheckView`          | sessionId            | Spot-check random articles |
| `ReviewGateStatus`       | sessionId            | Gate criteria check        |
| `LockDatasetButton`      | sessionId            | Lock the dataset           |
| `LockConfirmationDialog` | sessionId            | Confirmation modal         |
| `PrismaFlowChart`        | sessionId            | PRISMA flow diagram        |

#### Phase 6: PDF & References

| Component              | Props to investigate | Purpose                 |
| ---------------------- | -------------------- | ----------------------- |
| `PdfRetrievalPanel`    | sessionId            | PDF download management |
| `ManualPdfUpload`      | articleId            | Upload PDF manually     |
| `PdfMismatchReview`    | sessionId            | Review PDF mismatches   |
| `MinedReferenceReview` | sessionId            | Review mined references |
| `ManualArticleAddForm` | sessionId            | Add article manually    |

### Recommended Route Structure

```
/projects/:projectId/sls-sessions/:sessionId          → SessionDashboard (enhance with tabs)
  Tab "Queries"     → QueryList + QueryBuilder + ExecuteQueryButton + QueryExecutionProgress
  Tab "Articles"    → ArticlePoolDashboard + ArticleTable + ArticleDetailPanel
  Tab "AI Scoring"  → LaunchAiScreeningButton + AiScoringProgress + RelevanceThresholdConfig + CustomAiFilterEditor
  Tab "Screening"   → ScreeningPanel + ScreeningFilterTabs + BulkActionsToolbar + ExclusionCodeManager
  Tab "Review"      → SpotCheckView + ReviewGateStatus + LockDatasetButton + PrismaFlowChart
  Tab "PDFs"        → PdfRetrievalPanel + PdfMismatchReview + MinedReferenceReview
```

---

## Module 2: SOA (State of the Art)

### Already Wired

- Nothing — `/soa` shows a placeholder message

### Components to Wire

| Component                 | Purpose                        |
| ------------------------- | ------------------------------ |
| `SoaDashboard`            | Main SOA overview per project  |
| `CreateSoaDialog`         | Create new SOA analysis        |
| `ExtractionGridPage`      | Data extraction spreadsheet    |
| `GridConfigurator`        | Define grid columns            |
| `CellValidationOverlay`   | Cell-level validation          |
| `ExtractionProgressPanel` | Extraction progress            |
| `QualityAssessmentForm`   | QUADAS-2 / ROBINS-I assessment |
| `NarrativeDraftPanel`     | AI-drafted narrative           |
| `ThematicSectionEditor`   | Edit narrative sections        |
| `LockSoaButton`           | Lock SOA analysis              |
| `DeviceRegistryPanel`     | Device comparison registry     |
| `SimilarDeviceRegistry`   | Similar device database        |
| `ComparisonTable`         | Side-by-side comparison        |
| `ClaimsManagement`        | Manage clinical claims         |

### Recommended Route Structure

```
/projects/:projectId/soa              → SoaDashboard + CreateSoaDialog
/projects/:projectId/soa/:soaId       → Tabbed view:
  Tab "Grid"        → ExtractionGridPage + GridConfigurator + CellValidationOverlay
  Tab "Quality"     → QualityAssessmentForm
  Tab "Narrative"   → NarrativeDraftPanel + ThematicSectionEditor
  Tab "Devices"     → DeviceRegistryPanel + SimilarDeviceRegistry + ComparisonTable
  Tab "Claims"      → ClaimsManagement
  Lock action       → LockSoaButton
```

### GraphQL

- `apps/web/src/features/soa/graphql/queries.ts`
- `apps/web/src/features/soa/graphql/mutations.ts`

---

## Module 3: CER (Clinical Evaluation Report)

### Already Wired

- Nothing — `/cer` shows a placeholder message

### Components to Wire

| Component                 | Purpose                                |
| ------------------------- | -------------------------------------- |
| `CerDashboard`            | Main CER overview per project          |
| `CerCreationForm`         | Create CER (3-step wizard)             |
| `CerAssembler`            | Assemble CER sections                  |
| `AssemblyProgressOverlay` | Progress during assembly               |
| `SectionEditor`           | Edit individual CER sections           |
| `SectionNavigator`        | Navigate between sections              |
| `CerTableOfContents`      | CER TOC                                |
| `SectionStatusControl`    | Section status (draft/review/approved) |
| `CompletionDashboard`     | Overall completion metrics             |
| `ExternalDocumentManager` | Manage external docs                   |
| `ExternalDocumentList`    | List external documents                |
| `VersionMismatchAlert`    | Alert on upstream changes              |
| `ImpactedSectionsList`    | Sections affected by changes           |
| `UnresolvedClaimsList`    | Claims needing resolution              |
| `UpstreamModuleSelector`  | Select SLS/SOA data sources            |
| `NamedDeviceSearchPanel`  | Search device databases                |
| `SearchProgressIndicator` | Search progress                        |
| `TraceabilityDrillDown`   | Evidence traceability                  |
| `VigilanceFindingsTable`  | Vigilance data table                   |
| `VigilanceFindingDetail`  | Single vigilance finding               |

### Recommended Route Structure

```
/projects/:projectId/cer              → CerDashboard + CerCreationForm
/projects/:projectId/cer/:cerId       → Tabbed view:
  Tab "Assembly"    → CerAssembler + AssemblyProgressOverlay + UpstreamModuleSelector
  Tab "Sections"    → SectionNavigator + SectionEditor + SectionStatusControl + CerTableOfContents
  Tab "Completion"  → CompletionDashboard + UnresolvedClaimsList + ImpactedSectionsList
  Tab "Documents"   → ExternalDocumentManager + ExternalDocumentList + VersionMismatchAlert
  Tab "Devices"     → NamedDeviceSearchPanel + SearchProgressIndicator
  Tab "Vigilance"   → VigilanceFindingsTable + VigilanceFindingDetail
  Tab "Traceability"→ TraceabilityDrillDown
```

### GraphQL

- `apps/web/src/features/cer/graphql/queries.ts`
- `apps/web/src/features/cer/graphql/mutations.ts`

---

## Module 4: Validation

### Already Wired

- Nothing — `/validation` shows a placeholder message

### Components to Wire

| Component                  | Purpose                     |
| -------------------------- | --------------------------- |
| `ValidationDashboard`      | Main validation overview    |
| `ValidationStudyForm`      | Create/edit study           |
| `StudyConfigurator`        | Configure study parameters  |
| `ProtocolEditor`           | Edit study protocol         |
| `ProtocolAmendmentHistory` | Protocol change history     |
| `XlsImporter`              | Import Excel data           |
| `ImportVersionList`        | List import versions        |
| `ImportVersionDiff`        | Diff between versions       |
| `PatchStudySelector`       | Select studies for patching |
| `ResultsMappingTable`      | Map results to endpoints    |
| `GsprMappingTable`         | Map to GSPR requirements    |
| `ReportGenerator`          | Generate validation reports |
| `ReportViewer`             | View generated reports      |
| `ValidationLockSection`    | Lock validation data        |

### Recommended Route Structure

```
/projects/:projectId/validation                → ValidationDashboard + ValidationStudyForm
/projects/:projectId/validation/:studyId       → Tabbed view:
  Tab "Config"      → StudyConfigurator + ProtocolEditor + ProtocolAmendmentHistory
  Tab "Data"        → XlsImporter + ImportVersionList + ImportVersionDiff + PatchStudySelector
  Tab "Results"     → ResultsMappingTable + GsprMappingTable
  Tab "Reports"     → ReportGenerator + ReportViewer
  Lock action       → ValidationLockSection
```

### GraphQL

- `apps/web/src/features/validation/graphql/queries.ts`
- `apps/web/src/features/validation/graphql/mutations.ts`

---

## Module 5: PMS (Post-Market Surveillance)

### Already Wired

- Nothing — `/pms` shows a placeholder message

### Components to Wire

| Component                | Purpose                 |
| ------------------------ | ----------------------- |
| `PmsDashboard`           | Main PMS overview       |
| `PmsPlanForm`            | Create/edit PMS plan    |
| `PmsPlanDetail`          | Plan detail view        |
| `CycleManager`           | Manage PMS cycles       |
| `CycleTimeline`          | Timeline visualization  |
| `PmsCycleDetail`         | Single cycle detail     |
| `ReportGeneration`       | Generate PSUR/PMCF      |
| `CerUpdateDecisionPanel` | Decision on CER updates |
| `ComplaintsDashboard`    | Complaints overview     |
| `ActivityTracker`        | Activity monitoring     |
| `TrendAnalysisPanel`     | Trend analysis          |
| `GapRegistry`            | Evidence gaps           |
| `StatusBadge`            | PMS-specific status     |

### Recommended Route Structure

```
/projects/:projectId/pms              → PmsDashboard + PmsPlanForm
/projects/:projectId/pms/:planId      → PmsPlanDetail + CycleManager + CycleTimeline
/projects/:projectId/pms/:planId/:cycleId → Tabbed view:
  Tab "Overview"    → PmsCycleDetail + StatusBadge
  Tab "Reports"     → ReportGeneration + CerUpdateDecisionPanel
  Tab "Monitoring"  → ComplaintsDashboard + ActivityTracker + TrendAnalysisPanel
  Tab "Gaps"        → GapRegistry
```

### GraphQL

- `apps/web/src/features/pms/graphql/queries.ts`
- `apps/web/src/features/pms/graphql/mutations.ts`

---

## Implementation Rules

1. **Read each component's props interface** before composing — the test files show usage patterns
2. **Check GraphQL mutation signatures** in the backend (`apps/api/src/modules/{module}/graphql/mutations.ts`) — use **flat args** not `input` wrappers
3. **Compare frontend GQL strings** with backend Pothos definitions to catch mismatches (like the `createSlsSession` bug we fixed)
4. **Add routes to `apps/web/src/router.tsx`** with lazy-loaded imports
5. **Use `navigate()` from `../../router`** for SPA navigation (not `window.location.href`)
6. **Extract URL params** from `window.location.pathname.split('/')`
7. **Use existing design tokens**: `--cortex-*` CSS variables, Tailwind utilities
8. **Tab component**: If none exists, use a simple state-based tab with `useState<string>` and conditional rendering
9. **Update sidebar navigation** in `AppLayout.tsx` if module routes change from placeholders to real pages
10. **Run `npx tsc --noEmit -p apps/web/tsconfig.json`** to verify compilation after changes
