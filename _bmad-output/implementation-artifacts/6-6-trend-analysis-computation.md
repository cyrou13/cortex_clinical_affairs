# Story 6.6: Trend Analysis Computation

Status: ready-for-dev

## Story

As an RA Manager,
I want the system to compute trend analysis from complaints, incidents, and installed base data,
So that I can identify emerging safety signals.

## Acceptance Criteria

**Given** complaint data, incident data, and installed base metrics
**When** trend analysis is computed
**Then** the system calculates trends over time for: complaint rates, incident rates, device performance metrics (FR62b)
**And** trends are visualized in charts (line charts for rates over time)
**And** statistically significant changes are highlighted
**And** trend data feeds into the PSUR and CER Update Decision

## Tasks / Subtasks

### Backend

- [ ] Verify `TrendAnalysis` model in `packages/prisma/schema/pms.prisma`:
  - id (UUID v7), pmsCycleId, analysisDate (DateTime), createdBy
  - installedBase (Json - `{ totalUnits: number, activeDevices: number, regions: { name, count }[], period: { from, to } }`)
  - complaintTrends (Json - `{ periods: [{ date, complaintCount, complaintRate, incidentCount, incidentRate }] }`)
  - severityDistribution (Json - `{ LOW: number, MEDIUM: number, HIGH: number, CRITICAL: number }`)
  - classificationDistribution (Json - `{ [imdrfCode: string]: number }`)
  - significantChanges (Json - `[{ metric, previousValue, currentValue, changePercent, isSignificant, description }]`)
  - conclusions (Text)
  - status (DRAFT/FINALIZED)
  - createdAt, updatedAt
- [ ] Add `InstalledBaseEntry` model to `pms.prisma`:
  - id, pmsCycleId, periodStart (DateTime), periodEnd (DateTime)
  - totalUnitsShipped (Int), activeDevices (Int), regionBreakdown (Json)
  - source (MANUAL/IMPORTED)
  - createdAt
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/compute-trends.ts`:
  - Accept: pmsCycleId
  - Gather data:
    - Fetch all complaints for the cycle (from complaint-repository)
    - Fetch installed base entries for the cycle
    - Fetch complaints from previous cycles (for comparison)
  - Compute metrics:
    - **Complaint rate:** complaints per installed base unit per period (e.g., per 1000 devices per quarter)
    - **Incident rate:** incidents per installed base per period
    - **Severity distribution:** count by severity level
    - **Classification distribution:** count by IMDRF top-level category
    - **Time series:** complaint/incident counts per month/quarter
  - Detect significant changes:
    - Compare current period rates to previous period(s)
    - Flag as significant if change exceeds configurable threshold (e.g., >20% increase, or p-value < 0.05 for chi-squared test)
    - Generate description: "Complaint rate increased 35% compared to previous period"
  - Store results in TrendAnalysis record
  - Emit domain event `pms.trend-analysis.computed`
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/manage-installed-base.ts`:
  - CRUD operations for InstalledBaseEntry
  - Validate: periodEnd > periodStart, totalUnitsShipped > 0
  - Accept manual entry or future import integration
- [ ] Create use case `apps/api/src/modules/pms/application/use-cases/finalize-trend-analysis.ts`:
  - Add conclusions text (mandatory)
  - Transition DRAFT -> FINALIZED
  - Finalized trend analysis feeds into PSUR and CER Update Decision
- [ ] Create statistical computation service `apps/api/src/modules/pms/infrastructure/services/trend-computation-service.ts`:
  - Method: `calculateComplaintRate(complaintCount, installedBase, periodMonths)` -> rate per 1000 devices per year
  - Method: `calculateTimeSeries(complaints, granularity)` -> array of `{ period, count, rate }`
  - Method: `detectSignificantChanges(currentPeriod, previousPeriods, threshold)` -> significant changes array
  - Method: `calculateSeverityDistribution(complaints)` -> severity counts
  - Method: `calculateClassificationDistribution(complaints)` -> IMDRF code counts
  - Optional: simple statistical test (chi-squared or z-test for rate comparison)
- [ ] Create DTOs:
  - `compute-trends.dto.ts`
  - `create-installed-base.dto.ts`
  - `finalize-trend-analysis.dto.ts`
- [ ] Create repository `apps/api/src/modules/pms/infrastructure/repositories/trend-analysis-repository.ts`:
  - `findTrendAnalysesByCycle(cycleId)`
  - `findLatestTrendAnalysis(cycleId)`
  - `createTrendAnalysis(data)`
  - `updateTrendAnalysis(id, data)`
  - `findTrendAnalysesForProject(projectId)` — across all cycles for historical comparison
- [ ] Create repository `apps/api/src/modules/pms/infrastructure/repositories/installed-base-repository.ts`:
  - `findInstalledBaseEntries(cycleId)`
  - `createInstalledBaseEntry(data)`
  - `updateInstalledBaseEntry(id, data)`
- [ ] Add GraphQL types:
  - TrendAnalysis type
  - InstalledBaseEntry type
  - TrendDataPoint type (period, count, rate)
  - SignificantChange type (metric, previousValue, currentValue, changePercent, isSignificant, description)
  - SeverityDistribution type
  - ClassificationDistribution type
  - TrendAnalysisStatus enum (DRAFT, FINALIZED)
- [ ] Add GraphQL queries:
  - `trendAnalysis(id: UUID!)` — single analysis
  - `trendAnalyses(cycleId: UUID!)` — all analyses for cycle
  - `latestTrendAnalysis(cycleId: UUID!)` — most recent
  - `installedBaseEntries(cycleId: UUID!)` — installed base data
  - `trendComparisonData(projectId: UUID!)` — cross-cycle comparison data
- [ ] Add GraphQL mutations:
  - `computeTrendAnalysis(cycleId: UUID!)` — trigger computation
  - `finalizeTrendAnalysis(id: UUID!, conclusions: String!)` — finalize with conclusions
  - `createInstalledBaseEntry(cycleId: UUID!, input: InstalledBaseInput!)`
  - `updateInstalledBaseEntry(id: UUID!, input: InstalledBaseInput!)`
  - `deleteInstalledBaseEntry(id: UUID!)`
- [ ] Write unit tests for trend-computation-service (rate calculation, significance detection)
- [ ] Write unit tests for compute-trends use case

### Frontend

- [ ] Create `apps/web/src/features/pms/components/TrendChart.tsx`:
  - Line chart visualization for complaint/incident rates over time
  - Use a lightweight chart library (Recharts or similar, compatible with React 19)
  - X-axis: time periods (months/quarters)
  - Y-axis: rates (complaints per 1000 devices)
  - Multiple series: complaint rate, incident rate
  - Highlight significant changes with markers/annotations
  - Tooltip on hover: period, count, rate, change %
  - CORTEX theming: Cortex Blue for primary series, warning color for incidents
- [ ] Create `TrendAnalysisDashboard.tsx`:
  - Summary cards at top (Stripe-style big numbers):
    - Total complaints this cycle
    - Complaint rate (per 1000 devices)
    - Incident count
    - Significant changes count (orange if > 0)
  - Main chart area: TrendChart component
  - Severity distribution: horizontal bar chart or donut chart
  - IMDRF classification distribution: bar chart (top 10 categories)
  - Significant changes list: cards with alert styling (orange border)
  - Conclusions editor (textarea, editable when DRAFT)
  - Action buttons:
    - "Compute Trends" (Primary, triggers computation)
    - "Finalize Analysis" (Success, when conclusions added)
- [ ] Create `InstalledBaseEditor.tsx`:
  - Table/form for entering installed base data per period
  - Fields: period start, period end, total units shipped, active devices
  - Region breakdown (expandable section): add rows for each region
  - ag-Grid for multiple entries
  - Add/Edit/Remove functionality
  - Validation: non-negative numbers, valid date ranges
- [ ] Create `SignificantChangesPanel.tsx`:
  - List of significant changes as alert cards
  - Each card: metric name, previous value, current value, change percentage (with up/down arrow)
  - Color coding: green for decrease (improvement), orange/red for increase (deterioration)
  - Description text explaining the significance
- [ ] Create `SeverityDistributionChart.tsx`:
  - Horizontal bar chart or donut chart
  - Color-coded by severity: green (LOW), orange (MEDIUM), red (HIGH), dark-red (CRITICAL)
  - Shows both count and percentage
- [ ] Add "Trend Analysis" section to PMS sidebar navigation
- [ ] Add "Installed Base" section to PMS sidebar navigation
- [ ] Connect trend computation to AsyncTaskPanel if it becomes long-running
- [ ] Write component tests for chart rendering with mock data
- [ ] Write component tests for InstalledBaseEditor validation

## Dev Notes

### Technology Stack & Versions

- **Backend:** Fastify 5.7, Apollo Server 4, Pothos v4, Prisma 7.2
- **Frontend:** React 19, Apollo Client 3.x, Recharts (or similar chart lib), ag-Grid 33, shadcn/ui + Tailwind CSS 4
- **Database:** PostgreSQL 16, JSON fields for flexible trend data storage

### Chart Library Selection

- Primary recommendation: **Recharts** (React-native, composable, good for line/bar charts)
- Alternative: **Chart.js with react-chartjs-2** (more chart types, heavier)
- The chart library must be compatible with React 19
- Style charts with CORTEX design tokens (Cortex Blue palette, Inter font)
- Charts should be responsive within the work area (flex-1)

### Statistical Computation

- Complaint rate formula: `(complaintCount / installedBase) * 1000 * (12 / periodMonths)` (annualized per 1000 devices)
- Significance detection options:
  - Simple threshold: >20% change from previous period (configurable)
  - Statistical: chi-squared test for rate comparison (optional, more rigorous)
- For MVP, use simple threshold-based detection
- More advanced statistical methods can be added later

### JSON Data Schema for Trends

- Use JSON fields in PostgreSQL for flexible data storage
- Validate JSON structure with Zod schemas at the application layer
- Key JSON schemas:
  - `InstalledBaseData`: `{ totalUnits, activeDevices, regions: [{ name, count }] }`
  - `ComplaintTrendPoint`: `{ period, complaintCount, complaintRate, incidentCount, incidentRate }`
  - `SignificantChange`: `{ metric, previousValue, currentValue, changePercent, isSignificant, description }`

### Cross-Cycle Comparison

- Trend analysis should compare current cycle data with previous cycles
- Query previous cycle complaint data for historical context
- Display comparison in the chart (multiple lines/series)

### Feed into Downstream

- Finalized trend analysis data is consumed by:
  - Story 6.8 (PSUR Generation): trend analysis section
  - Story 6.9 (CER Update Decision): benefit-risk re-assessment
- These stories will query the TrendAnalysis repository to get finalized data

### Naming Conventions

- Domain event: `pms.trend-analysis.computed`
- GraphQL: `computeTrendAnalysis`, `finalizeTrendAnalysis`
- Files: `compute-trends.ts`, `trend-computation-service.ts`, `TrendChart.tsx`
- Service: `trend-computation-service.ts` (in infrastructure/services)

### UX Patterns

- Stripe-style big numbers for summary metrics
- Line charts with CORTEX theming
- Significant changes highlighted with orange alert cards
- Conclusions editor with auto-save
- "Pas de cul-de-sac": after finalizing trend analysis, suggest generating PSUR

### Anti-Patterns to Avoid

- Do NOT compute trends synchronously in the GraphQL resolver if data is large — consider async via BullMQ
- Do NOT store chart images — generate charts on the frontend from data
- Do NOT hardcode significance thresholds — make them configurable per PMS Plan
- Do NOT skip installed base data — trend rates without denominators are meaningless

### Project Structure Notes

```
apps/api/src/modules/pms/
  application/use-cases/
    compute-trends.ts             # NEW
    manage-installed-base.ts      # NEW
    finalize-trend-analysis.ts    # NEW
  application/dtos/
    compute-trends.dto.ts         # NEW
    create-installed-base.dto.ts  # NEW
    finalize-trend-analysis.dto.ts # NEW
  infrastructure/
    repositories/
      trend-analysis-repository.ts   # NEW
      installed-base-repository.ts   # NEW
    services/
      trend-computation-service.ts   # NEW

apps/web/src/features/pms/
  components/
    TrendChart.tsx                 # NEW
    TrendAnalysisDashboard.tsx     # NEW
    InstalledBaseEditor.tsx         # NEW
    SignificantChangesPanel.tsx     # NEW
    SeverityDistributionChart.tsx   # NEW
```

### References

- **PRD FRs:** FR62b
- **Architecture:** JSON fields in PostgreSQL, Prisma JSONB, domain events via RabbitMQ
- **UX Spec:** Stripe-style big number cards, chart visualization, orange alerts for significant changes, progressive disclosure
- **Dependencies:** Story 6.5 (Complaints data), Story 6.3 (PMS Cycle), PMS Plan configuration (Story 6.1)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
