---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - specs/CORTEX — Systematic Literature Search Module.pdf
  - specs/CORTEX — State Of the Art Module.pdf
  - specs/CORTEX — Clinical Validation Module.pdf
  - specs/CORTEX — Clinical Evaluation Report Module.pdf
  - specs/CORTEX — Post-Market Surveillance Module.pdf
date: 2026-02-13
author: Cyril
projectName: cortex-clinical-affairs
---

# Product Brief: CORTEX Clinical Affairs Suite

## Executive Summary

CORTEX is an integrated Clinical Affairs suite that transforms how medical device manufacturers manage regulatory compliance. By orchestrating the entire clinical evidence lifecycle—from systematic literature search through post-market surveillance—CORTEX eliminates the fragmentation, manual processes, and traceability gaps that plague traditional clinical affairs workflows.

The suite comprises five interconnected modules (SLS, SOA, Validation, CER, PMS) that enforce regulatory-grade traceability, automate AI-assisted workflows, and maintain continuous compliance for both MDR and FDA submissions. Every claim is traceable to its source, every dependency is enforced, and the post-market loop ensures documentation stays current throughout the device lifecycle.

CORTEX's unfair advantage lies in its full-lifecycle integration: unlike point solutions that address isolated tasks, CORTEX manages the complete regulatory narrative as a living, versioned, auditable system.

---

## Core Vision

### Problem Statement

Medical device manufacturers face a fragmented, consultant-heavy regulatory landscape for clinical affairs compliance. They must manage systematic literature searches, clinical evidence analysis, validation studies, Clinical Evaluation Reports (CER), and post-market surveillance using disconnected tools, manual processes, and external consultants—creating compliance risk and operational inefficiency.

### Problem Impact

**Financial Impact:**

- High consultant fees for literature screening, SOA writing, and CER compilation
- Extended timelines increasing time-to-market and delaying revenue

**Quality & Compliance Risk:**

- Traceability gaps between literature sources and CER claims
- Manual processes prone to error and inconsistency
- Difficulty maintaining up-to-date documentation as evidence evolves
- Risk of Notified Body audit failures due to insufficient justification trails

**Operational Challenges:**

- Disconnected systems requiring manual data transfer
- Version control nightmares across multiple document types
- No enforcement of sequential dependencies (e.g., Device SOA started before Clinical SOA completed)
- Post-market surveillance treated as afterthought rather than continuous cycle

### Why Existing Solutions Fall Short

**Point Solutions:**
Existing tools address isolated tasks (e.g., literature screening OR document writing) but fail to integrate the complete clinical affairs workflow. This creates "integration tax"—manual handoffs, duplicate data entry, and broken traceability chains.

**Manual/Consultant-Heavy Approaches:**
Traditional workflows rely heavily on consultants performing manual literature review, evidence extraction, and narrative writing. This is expensive, slow, and creates knowledge transfer problems when consultants rotate.

**Generic Document Management:**
Some manufacturers use generic PLM/QMS systems not purpose-built for clinical affairs. These lack regulatory intelligence (e.g., MDR section templates, PRISMA flowchart generation, GSPR mapping) and cannot enforce clinical evidence workflows.

**No Post-Market Integration:**
Most systems focus on pre-market submission (initial CER) but lack structured post-market surveillance integration. The regulatory loop (PMS findings → CER updates) is managed ad-hoc rather than systematically.

### Proposed Solution

**CORTEX Clinical Affairs Suite** is a purpose-built, integrated platform that manages the complete clinical evidence lifecycle for medical devices with full regulatory traceability.

**Five Interconnected Modules:**

1. **SLS (Systematic Literature Search)** — Foundation module managing regulatory-grade literature searches with AI-assisted screening, multi-database execution, and locked auditable datasets that feed downstream modules.

2. **SOA (State of the Art)** — Analysis module transforming raw literature into structured clinical evidence: extraction grids, thematic narrative sections (MDR-aligned), performance benchmarks, and device comparison tables.

3. **Validation Module** — Manages clinical validation lifecycle: protocol design (Standalone/MRMC study types), sample size justification, data import from Data Science team, results mapping to SOA benchmarks, and automated report generation.

4. **CER (Clinical Evaluation Report)** — Assembly and narrative engine consuming outputs from SLS, SOA, and Validation to produce regulatory-grade CER documents compliant with MDR Annex XIV, MEDDEV 2.7/1 Rev 4, MDCG 2020-13. Includes AI-assisted drafting, human review workflows, version management, and DOCX export. Parallel FDA path produces 18.CVS (Clinical Validation Study).

5. **PMS (Post-Market Surveillance)** — Manages continuous post-market lifecycle: PMS Plan (strategy), PMCF (Post-Market Clinical Follow-up activities), and PSUR (Periodic Safety Update Report). Closes the regulatory loop by feeding Real-World Evidence back into CER updates.

**Core Architecture Principles:**

- **Sequential Dependency Enforcement:** Clinical SOA must be completed before Device SOA can be fully scoped; SLS must be locked before SOA finalization; all upstream modules locked before CER completion.
- **Total Traceability:** Every statement in the CER is linked to its source (SLS article, SOA section, Validation result, Risk Management file).
- **Living Documentation:** CERs are versioned (initial, annual_update, patch_update), each version locking its upstream dependencies as immutable snapshots.
- **AI-Assisted, Human-Reviewed:** AI performs screening (relevance scoring), extraction (grid population), and drafting (narrative generation), but humans always review and finalize—AI never publishes autonomously.
- **Dual Regulatory Compliance:** MDR path (20.CER primary document) and FDA path (18.CVS standalone) supported natively.

### Key Differentiators

1. **Full Lifecycle Integration**
   - Unlike point solutions, CORTEX manages the entire clinical evidence lifecycle as a unified system with automated data flow between modules.
   - Single source of truth from literature search through post-market surveillance.

2. **Regulatory-Grade Traceability**
   - Every CER claim is traceable to its source with Article-Query Links, SOA section references, and Validation result mappings.
   - Notified Body-ready audit trails built into the data model.

3. **AI-Assisted Workflows with Human Oversight**
   - AI relevance scoring for literature screening (reduces manual review burden)
   - AI-assisted extraction into configurable grids (structured data capture)
   - AI narrative drafting for CER sections (maintains regulatory voice)
   - Mandatory human review before finalization (safety + accountability)

4. **Enforced Sequential Dependencies**
   - System prevents regulatory gaps by enforcing workflow order (e.g., warns if Device SOA created before Clinical SOA Section 6 finalized).
   - Status-based access control (draft → screening → locked) ensures data integrity.

5. **Dual Compliance (MDR + FDA)**
   - Native support for MDR requirements (20.CER, MEDDEV templates, MDCG guidance)
   - Parallel FDA path (18.CVS standalone validation reports)
   - Configurable for other jurisdictions (CE-MDR, De Novo, NMPA, etc.)

6. **Continuous Post-Market Loop**
   - PMS module treats post-market surveillance as ongoing cycle, not one-time submission.
   - Real-World Evidence (RWE) from PMCF feeds PSUR, which triggers CER updates when benefit-risk balance shifts.
   - Gap registry aggregates findings from SOA, Validation, and CER to inform PMCF planning.

7. **Living Document with Version Control**
   - CERs are versioned documents with locked upstream dependencies per version.
   - Update triggers: annual PMS cycle, software patch validation, new risk findings.
   - Each version maintains independent snapshot of referenced evidence (prevents retroactive changes).

8. **Purpose-Built Data Models**
   - Clinical affairs-specific entities: Article-Query Links, Screening Decisions, SOA Thematic Sections, GSPR Compliance Matrix, Benefit Registry, PMCF Activities.
   - Not generic PLM/QMS adapted for clinical affairs—designed from ground up for regulatory workflows.

---

## Target Users

### Primary Users

CORTEX serves three primary user segments who interact with the platform daily to manage clinical affairs compliance:

#### 1. Regulatory Affairs Manager

**Profile:** Marie Dubois, Regulatory Affairs Manager at a Class IIb/III medical device manufacturer. 8 years of experience managing MDR submissions for 3-5 devices simultaneously. Coordinates external consultants, internal teams, and Notified Body interactions.

**Current Pain Points:**

- Juggles disconnected systems (Excel, consultants, QMS) creating fragmented workflows
- Spends weeks manually compiling CERs from disparate sources
- Constant anxiety: "Are all CER claims traceable to their sources?"
- Fear of Notified Body audits uncovering traceability gaps

**Success Vision with CORTEX:**

- One-click verification that every CER statement is justified and traceable
- Generate updated CER in days instead of months
- Confidence before audits thanks to automatic audit trails
- **"Aha!" Moment:** "The system warned me I was creating a Device SOA before Clinical SOA Section 6 was finalized—it prevented a regulatory gap!"

**Key CORTEX Interactions:**

- **CER Module:** Primary hub—views status of all upstream modules, reviews AI drafts, manages versions
- **Dashboards:** Overview of regulatory status (SLS locked? SOA completed? Validation results mapped?)
- **Approval Workflows:** Reviews AI drafts, finalizes before submission
- **DOCX Export:** Generates submission-ready documents for Notified Body

---

#### 2. Clinical Affairs Specialist

**Profile:** Thomas Chen, Clinical Evidence Specialist on the RA team. 5 years of experience, expert in literature searches and SOA analysis. Interface between Data Science (validation studies) and Regulatory Affairs.

**Current Pain Points:**

- Spends months manually screening thousands of articles (PubMed, Cochrane, etc.)
- Data extraction into different Excel grids per project (no standardization)
- Difficulty maintaining consistency between Clinical SOA and Device SOA
- Frustration: "I already analyzed this article for another project—why start over?"

**Success Vision with CORTEX:**

- AI performs first-pass screening (relevance scoring), he reviews only edge cases
- Configurable extraction grids pre-populated by AI (he validates/corrects)
- Reuse similar device analyses across projects
- **"Aha!" Moment:** "The system auto-generated my MDR-aligned thematic sections with article references—I just refined the narrative!"

**Key CORTEX Interactions:**

- **SLS Module:** Configures queries, executes multi-database searches, AI-assisted screening, finalizes dataset
- **SOA Module:** Configures extraction grids, reviews AI-extracted data, writes/validates thematic sections, creates benchmarks
- **Validation Module:** Collaborates with Data Science to import results, maps to SOA benchmarks

---

#### 3. Quality/RA Consultant (External)

**Profile:** Dr. Sophie Martin, independent consultant specializing in MDR compliance. Works with 10-15 manufacturer clients simultaneously. Expertise: CER writing, gap analysis, Notified Body preparation.

**Current Pain Points:**

- Each client has different systems → non-standardized workflow
- Wastes time learning each client's proprietary systems
- Difficult knowledge transfer when leaving a project
- Bills by time spent → incentivized to work efficiently while maintaining quality

**Success Vision with CORTEX:**

- Standardized platform across all CORTEX clients
- Template-based workflows executable quickly
- Auto-generated documentation facilitating handoff
- **"Aha!" Moment:** "I can onboard to a new CORTEX project in hours instead of days—the system is always the same!"

**Key CORTEX Interactions:**

- Multi-tenant access to multiple client projects
- Reusable templates for queries, grids, section structures
- Collaboration workflows (comments, suggests, approves)
- Report exports for clients

---

### Secondary Users

CORTEX also serves secondary user segments with specific, periodic interactions:

#### 4. Notified Body Auditor

**Role:** Verifies MDR compliance during audits. Requests evidence of traceability, justifications, audit trails.

**CORTEX Needs:**

- Read-only project views for audit
- Drill-down from any CER claim to its source (article, SOA section, validation result)
- PRISMA flowcharts, query execution logs, screening decision audit logs
- Export audit reports (proof packages)

---

#### 5. Data Science Team

**Role:** Conducts validation studies (Standalone, MRMC). Generates statistical results, confusion matrices, ROC curves.

**CORTEX Interactions:**

- **Receives:** SOA benchmarks and acceptance criteria (performance targets)
- **Provides:** XLS deliveries with results (imported into Validation Module)
- **Benefit:** Understands clinical context (SOA) informing their study design

---

#### 6. Executive/Management

**Role:** VP Regulatory, Head of Quality, CEO (startups). Approve budgets, timelines, go/no-go decisions.

**CORTEX Needs:**

- Executive dashboards: How many CERs in progress? Status? Deadlines?
- Risk indicators: Unresolved gaps? Blockers?
- ROI metrics: Time saved vs. consultants? Faster time-to-market?
- Approval workflows to finalize CER before submission

---

### User Journey: Regulatory Affairs Manager (Marie)

#### 🔍 Discovery

Marie discovers CORTEX at an MDR conference. A peer tells her: "Since we started using CORTEX, our CERs are ready in 6 weeks instead of 6 months."

#### 🚀 Onboarding

- Creates her first Project in CORTEX
- Configures Clinical Evaluation Plan (CEP)—system displays MDR templates
- Links her first SLS session to the CEP
- System guides: "Let's start by defining your search scope..."

#### 💼 Core Usage

**Typical workflow:**

**Monday morning:** Dashboard shows Clinical SOA Section 6 (Market Analysis) just finalized by Thomas

- She clicks notification → reviews similar device registry
- Approves → System unlocks ability to create Device SOA

**Wednesday:** Data Science imported validation results → she maps to SOA benchmarks in Validation Module

**Friday:** CER Module displays AI-generated draft narrative for "Performance Evaluation" section

- She reviews, adjusts tone, verifies references
- Saves → Frontmatter updates `stepsCompleted`, version incremented

#### ✨ Success Moment: The Notified Body Audit

**The auditor asks:** "Justify this statement on page 47 of the CER: 'Device X achieves 92% sensitivity'."

Marie clicks the statement in CORTEX → Drill-down displays:

- **Source:** Validation Study "CINA-CSpine v1.0 Standalone"
- **Result:** Endpoint "Sensitivity" = 92.3% (CI: 89.1-95.1%)
- **Linked SOA benchmark:** "Target ≥ 90% per acceptance criteria"
- **Article reference:** Smith et al. 2024, extracted in SOA Clinical Section 3

She exports the proof package in 30 seconds. The auditor smiles: "Exactly what I wanted to see."

**Realization moment:** "I no longer sweat during audits. Everything is there, traced, justified."

#### 🔄 Long-term Engagement

- **Annual PMS cycle:** PSUR auto-generated, she reviews findings, decides if CER update needed
- **Software patch:** Validation study v1.1 imported → CER patch update generated in days
- **New project:** Reusable template from first project → onboarding 10x faster

---

## Success Metrics

### North Star Metric 🌟

**"Time to Regulatory-Ready CER"**

**Definition:** Total duration from project creation to CER status "completed" and submission-ready.

**Why this metric?**

- Encompasses the entire CORTEX value stream (SLS → SOA → Validation → CER)
- Directly measures product promise: "CER in weeks instead of months"
- Aligned with user pain (Marie: "How long until we're ready for submission?")
- Aligned with business objective (faster time-to-market)

**Aspirational Target:** 6 weeks (vs. 6 months baseline) = **90% reduction**

---

### User Success Metrics

Success metrics organized by primary user persona:

#### Regulatory Affairs Manager (Marie)

**1. CER Production Speed**

- **Metric:** Average time to generate complete CER (project start to CER finalized)
- **Current Baseline:** 4-6 months (manual/consultant workflow)
- **CORTEX Target:** 4-6 weeks (75-85% reduction)
- **Measurement:** Duration between project creation and CER "completed" status

**2. Audit Success Rate**

- **Metric:** % of Notified Body audits passed without major findings
- **Current Baseline:** 60-70% (common traceability gaps)
- **CORTEX Target:** 95%+ (integrated traceability)
- **Measurement:** Audits passed / Total audits

**3. Traceability Completeness**

- **Metric:** % of CER claims with traced sources (article, SOA section, validation result)
- **Current Baseline:** 40-60% (manual, incomplete)
- **CORTEX Target:** 100% (architecture enforces traceability)
- **Measurement:** Claims with references / Total claims

**4. Pre-Audit Confidence**

- **Metric:** NPS before audit (confidence in documentation)
- **Current Baseline:** 3-4/10 (high anxiety)
- **CORTEX Target:** 9+/10 (total confidence via automatic audit trails)

---

#### Clinical Affairs Specialist (Thomas)

**1. Literature Screening Time Reduction**

- **Metric:** % time reduction for screening vs. manual
- **Current Baseline:** 200-300 hours to screen 5000 articles
- **CORTEX Target:** 80-90% reduction (AI first pass, human reviews edge cases only)
- **Measurement:** Hours saved = (Baseline - CORTEX) / Baseline

**2. SOA Article Throughput**

- **Metric:** Number of articles extracted and analyzed per SOA
- **Target:** 50-200 articles/SOA depending on scope
- **Measurement:** Articles included in finalized SOA

**3. SOA Completion Time**

- **Metric:** Days from SLS locked to SOA finalized
- **Current Baseline:** 6-12 weeks
- **CORTEX Target:** 2-4 weeks (AI-assisted extraction grids)
- **Measurement:** SOA phase duration

**4. Analysis Reuse Rate**

- **Metric:** % of similar device analyses reused across projects
- **Target:** 30-50% (similar devices, indication overlap)
- **Measurement:** SOA sections referenced from previous projects / Total sections

---

#### Quality/RA Consultant (Sophie)

**1. Client Onboarding Time**

- **Metric:** Hours to become productive on new CORTEX project
- **Current Baseline:** 40-60 hours (different proprietary systems per client)
- **CORTEX Target:** 4-8 hours (standardized platform)
- **Measurement:** Time to first productive action (e.g., finalize SLS query)

**2. Multi-Client Capacity**

- **Metric:** Number of client projects managed simultaneously
- **Current Baseline:** 3-5 projects
- **CORTEX Target:** 10-15 projects (standardization + automation)
- **Measurement:** Active projects per consultant

**3. Template Reuse Rate**

- **Metric:** % workflows using reusable templates
- **Target:** 70%+ (standardized queries, grids, section structures)
- **Measurement:** Templated workflows / Total workflows

---

### Business Objectives

#### 1. Reduce Consultant Costs

**Objective:** Reduce dependency on and costs of external consultants

**Metrics:**

- **% Consultant Spend Reduction:** Target 50-70% reduction vs. baseline
- **Work Insourced:** % clinical affairs tasks managed internally vs. outsourced
- **Cost per CER:** €/$ per CER produced
  - Baseline: €50-100K
  - Target: €15-30K

**Timeframe:** 12 months post-deployment

---

#### 2. Faster Time-to-Market

**Objective:** Accelerate regulatory submission timelines

**Metrics:**

- **Weeks Saved:** Project start to Notified Body submission
  - Baseline: 12-18 months
  - Target: 6-9 months (40-50% reduction)
- **Parallel Workflows:** Capacity to manage multiple devices simultaneously
  - Baseline: 1-2 devices at a time
  - Target: 3-5 devices (2-3x capacity increase)

**Timeframe:** Measured per project cohort

---

#### 3. Increase Submission Success Rate

**Objective:** First-time submissions accepted by Notified Bodies

**Metrics:**

- **First-Time Approval Rate:** % submissions approved without major revisions
  - Baseline: 30-50%
  - Target: 70-85%
- **Revision Cycles:** Average rounds of back-and-forth
  - Baseline: 2-3 cycles
  - Target: 0-1 cycle

**Timeframe:** Measured post-submission (6-12 month lag)

---

#### 4. Clinical Affairs Team Scalability

**Objective:** Increase output without proportional headcount increase

**Metrics:**

- **Devices per FTE:** Number of devices managed per RA team member
  - Baseline: 1-2 devices/FTE
  - Target: 4-6 devices/FTE (2-3x productivity)
- **Capacity Utilization:** % team time on high-value tasks vs. admin/manual work
  - Baseline: 30-40% high-value (remainder = screening, manual compilation)
  - Target: 70-80% high-value (AI handles manual tasks)

**Timeframe:** Measured quarterly

---

### Key Performance Indicators

#### Leading Indicators (Success Predictors)

**1. Adoption & Usage**

- **Active Users per Module:** SLS (5-10), SOA (5-8), CER (3-5), PMS (2-3)
- **Sessions per Month:** SLS sessions created, SOA analyses started
- **Module Completion Rate:** % of SLS → SOA → Validation → CER pipeline completed

**2. Quality Signals**

- **AI Acceptance Rate:** % of AI-generated content accepted without major modifications
  - Target: 70-80% (indicates AI draft quality)
- **Traceability Coverage:** % of CER claims with full source links
  - Target: 100% (architectural requirement)

**3. Workflow Velocity**

- **SLS Lock Time:** Days from session start to locked dataset
  - Target: 3-6 weeks
- **SOA Completion Time:** Days from SLS locked to SOA finalized
  - Target: 2-4 weeks
- **CER Draft-to-Final:** Days from AI draft generated to CER completed
  - Target: 1-2 weeks

---

#### Lagging Indicators (Success Outcomes)

**1. Deliverables Produced**

- **CERs Completed per Quarter:** Number of CERs finalized and submitted
  - Target: 2-5/quarter (depending on organization size)
- **PSURs Generated per Year:** Post-market reports completed
  - Target: Aligned with device count and update frequency

**2. Regulatory Outcomes**

- **Notified Body Audit Findings:**
  - Major non-conformities: Target 0
  - Minor non-conformities: Target ≤ 2/audit
- **Submission Success Rate:** % first-time approvals
  - Target: 75-85%

**3. Financial Impact**

- **Cost Savings:** € saved vs. consultant-heavy baseline
  - Target: €200-500K/year (mid-size manufacturer, 3-5 devices)
- **Revenue Impact:** Revenue unlocked via faster time-to-market
  - Example: 3 months earlier launch × €500K/month revenue = €1.5M

**4. User Satisfaction**

- **NPS (Net Promoter Score):** Likelihood to recommend CORTEX
  - Target: 50+ (industry SaaS benchmark)
- **Feature Satisfaction:** Per-module satisfaction scores
  - Target: 4+/5 for core modules (SLS, SOA, CER)

---

## MVP Scope

### MVP Philosophy: Full CORTEX, Phased Implementation

**Vision:** Deliver the complete CORTEX Clinical Affairs suite (all 5 modules) as the Minimum Viable Product, demonstrating the full-lifecycle integration that is CORTEX's core differentiator.

**Implementation Strategy:** Phased delivery by module, each phase building on the previous, culminating in the integrated 5-module system.

**Why Full MVP?** CORTEX's unfair advantage is full-lifecycle integration (SLS → SOA → Validation → CER → PMS). A partial MVP would fail to demonstrate this core value proposition. Users need the complete regulatory loop, not isolated tools.

---

### Core Features: 5-Module MVP

#### Phase 1: SLS Module (Systematic Literature Search)

**Foundational module — all downstream modules depend on locked SLS datasets**

**Features:**

- ✅ **Project & Session Management** — Create projects, link SLS sessions to Clinical Evaluation Plan (CEP)
- ✅ **Query Construction** — Manual query builder with Boolean operators, version control per query
- ✅ **Multi-Database Execution** — PubMed, Cochrane, Embase (configurable per query)
- ✅ **Query Execution Records** — Track execution per database, capture result counts, import articles
- ✅ **AI-Assisted Screening** — Relevance scoring for abstract-level screening
- ✅ **Article Status Workflow** — pending → scored → included/excluded/skipped → full_text_review → final_included/final_excluded
- ✅ **Screening Decisions Audit Log** — Every inclusion/exclusion with logged reason (traceability)
- ✅ **Article Pool** — Consolidated articles from all databases, deduplicated
- ✅ **Article-Query Links** — Which query/database returned this article (PRISMA flowchart foundation)
- ✅ **Lock Dataset** — Finalize SLS session (status: draft → screening → full_text_review → locked)
- ✅ **PRISMA Flowchart** — Auto-generated with per-query, per-database breakdown

**Delivery:** Locked, auditable literature dataset feeding SOA, CER, PMS modules

---

#### Phase 2: SOA Module (State of the Art) — Clinical + Device

**Analysis module — transforms locked SLS into structured clinical evidence**

**Features:**

**SOA Configuration:**

- ✅ **SOA Types** — clinical, similar_device, alternative (all types in MVP)
- ✅ **Link to SLS** — One or more locked SLS sessions feed SOA analysis
- ✅ **Sequential Dependency Enforcement** — Device SOA warns if Clinical SOA Section 6 not finalized

**Extraction & Analysis:**

- ✅ **Configurable Extraction Grids** — Define columns per SOA type (pathology, population, device details, performance metrics, etc.)
- ✅ **Grid Templates** — Pre-built templates for common SOA types (user-customizable)
- ✅ **Manual Extraction** — Users populate grids per article (1 row per included article)
- ✅ **Article Appraisal Records** — Pertinence, device classification, relevance per article
- ✅ **Quality Assessments** — Dual system (regulatory: QUADAS-2 + internal quality scoring)

**Thematic Sections (MDR-Aligned):**

- ✅ **Clinical SOA Sections:** §1 Clinical Condition, §2 Diagnostic Pathway, §3 Unmet Clinical Needs, §4 Risk Analysis, §5 Software & Technology, §6 Market Analysis & Similar Devices (triggers Device SOA)
- ✅ **Device SOA Sections:** §1 Equivalence Argument, §2 Performance Claims, §3 Clinical Benefit Claims, §4 Safety & Risk Claims, §5 Limitations
- ✅ **AI-Assisted Narrative Drafting** — Generate section text from extraction grid data + referenced claims
- ✅ **Human Review & Finalization** — Edit AI drafts, approve sections
- ✅ **Claims Management** — Claims linked to articles, tied to sections (foundation for CER)

**Benchmarks & Comparisons:**

- ✅ **Performance Benchmarks** — Pooled statistics, device comparisons (Device SOA)
- ✅ **Similar Device Registry** — Clinical SOA Section 6 output
- ✅ **Comparison Tables** — Device SOA comparison tables (1-2 devices selected from registry)

**Delivery:** Locked SOA analyses (Clinical + Device) feeding CER and Validation modules

---

#### Phase 3: Validation Module

**Bridge between SOA benchmarks and actual device performance**

**Features:**

**Study Configuration:**

- ✅ **Study Types** — Standalone (device vs. ground truth), MRMC (multi-reader multi-case with radiologist readers)
- ✅ **Link to SOA** — Import benchmarks and acceptance criteria from SOA Device analysis
- ✅ **Protocol (Study Summary)** — Structured template matching document format
  - Endpoints (primary, secondary, additional assessments)
  - Dataset description
  - Readers (MRMC only)
  - Statistical strategy
  - Sample size justification

**Data Import & Mapping:**

- ✅ **XLS Data Deliveries** — Versioned imports from Data Science team
  - Data distribution/stratification
  - Statistical results (per endpoint)
- ✅ **Results Mapping** — Map validation endpoints to SOA benchmarks for comparison

**Reporting:**

- ✅ **Validation Report Generation (DOCX)** — Performance report
- ✅ **Clinical Benefit Report (DOCX)** — MRMC-specific, demonstrates clinical benefit with radiologist readers
- ✅ **SOA Comparison Table Updates** — Feed validation results back to SOA for CER consumption

**Delivery:** Validation reports and performance data feeding CER module

---

#### Phase 4: CER Module (Clinical Evaluation Report)

**Assembly and narrative engine — the central regulatory deliverable**

**Features:**

**CER Configuration:**

- ✅ **Regulatory Context** — CE-MDR (primary), support for §510k, De Novo, NMPA
- ✅ **Link Upstream Modules** — Locked SLS, locked SOA (Clinical + Device), completed/locked Validation studies
- ✅ **Document Version Management** — initial, annual_update, patch_update
- ✅ **Section Template** — Configurable CER structure (default: MDR Annex XIV)

**Content Assembly:**

- ✅ **External Document References** — Risk Management, Usability, IFU, Project Master Plan, Methods Document (summarized, not imported)
- ✅ **Named Device Literature Search** — Optional SLS session for specific device name search
- ✅ **CER Sections** — Ordered narrative chapters with source references
  - Each section linked to SOA/Validation claims
  - AI-drafted narrative from upstream data
  - Human review and finalization

**Traceability & Quality:**

- ✅ **Section Claims** — Claims linked to SOA/Validation source claims (full traceability chain)
- ✅ **GSPR Compliance Matrix** — Linked to Validation GSPR mapping
- ✅ **Benefit-Risk Determination** — Benefit Registry (from Validation) + Risk Summary (from external Risk Management doc)

**Outputs:**

- ✅ **20.CER (DOCX)** — MDR submission document
- ✅ **CEP (Clinical Evaluation Plan) DOCX** — CER in "planned" status, exported with prospective language
- ✅ **PCCP (Performance and Clinical Claims Plan) DOCX** — Companion planning document, intended claims snapshot before validation
- ✅ **GSPR Table, Benefit-Risk Summary** — Supplementary exports

**Parallel FDA Path:**

- ✅ **18.CVS (Clinical Validation Study)** — Standalone validation report for FDA submissions (independent deliverable, not appendix of CER)

**Workflow & Versioning:**

- ✅ **Status Progression** — planned → drafting → review → completed → locked
- ✅ **Version Locking** — Each CER version locks its upstream dependencies (SLS, SOA, Validation) as immutable snapshots
- ✅ **Update Triggers** — Annual PMS cycle, software patch, new risk findings

**Delivery:** Regulatory-grade CER (20.CER) + optional FDA 18.CVS, submission-ready

---

#### Phase 5: PMS Module (Post-Market Surveillance)

**Continuous post-market lifecycle — closes the regulatory loop**

**Features:**

**PMS Configuration:**

- ✅ **PMS Plan** — Strategy document defining data collection methods, timeline
- ✅ **PMCF Plan** — Clinical follow-up strategy
- ✅ **Similar Device Registry** — Shared with SOA similar device registry from Clinical SOA Section 6
- ✅ **Gap Registry** — Aggregated from SOA, Validation, CER (fairness gaps, performance gaps, competitor updates)
- ✅ **Update Frequency** — Configurable (default: 1 year for Class IIb under MDR)

**PMS Cycles (One Per Reporting Period):**

- ✅ **Cycle Configuration** — Period start/end, linked CER version, linked SLS sessions
- ✅ **PMCF Activities:**
  - Survey Results (imported)
  - Literature Update (SLS pms_update session type)
  - Named Device Literature Update (SLS named_device session)
  - Vigilance Monitoring Results (competent authority searches)
  - Complaints & Incidents Summary (manually entered from ZOHO Desk)
  - Installed Base Data (manually entered)
  - Maintenance Activity Summary (manually entered)
  - Trend Analysis (computed from entered data)
- ✅ **PMCF Report (DOCX)** — Independent clinical follow-up document feeding PSUR
- ✅ **PSUR (Periodic Safety Update Report) (DOCX)** — Comprehensive annual report aggregating clinical (PMCF) + non-clinical post-market data
- ✅ **CER Update Decision** — Documented conclusion: benefit-risk re-assessment determines if CER update needed

**Regulatory Loop:**

- ✅ **PMS Findings → CER Update** — PSUR conclusions trigger CER version update (annual_update or patch_update)
- ✅ **Gap Registry Updates** — New gaps identified during PMS feed into next PMCF planning

**Delivery:** Continuous post-market compliance (PSUR), CER lifecycle management

---

### MVP Integration Points (Critical Dependencies)

**Sequential Module Dependencies:**

1. **SLS → SOA:** SOA cannot start until SLS locked
2. **SOA Clinical Section 6 → SOA Device:** Device SOA requires similar device registry from Clinical SOA
3. **SOA Device → Validation:** Validation protocol uses SOA benchmarks as acceptance criteria
4. **SLS + SOA + Validation → CER:** CER assembly requires all upstream modules locked/completed
5. **CER (open questions) + SOA (gaps) + Validation (fairness gaps) → PMS:** Gap registry feeds PMCF planning
6. **PMS PSUR → CER Update:** Post-market findings trigger CER version updates

**Enforcement:**

- System validates dependencies (e.g., warning if Device SOA created before Clinical SOA §6 finalized)
- Status-based access control (can't start downstream work until upstream locked)

---

### Out of Scope for MVP

**Not Modules — but Advanced Features Within Modules:**

**SLS Advanced Features (Deferred):**

- ⏸️ Automated PDF retrieval via APIs (Unpaywall, institutional access)
- ⏸️ AI query suggestions based on CEP scope
- ⏸️ Bulk article actions (bulk include/exclude)

**SOA Advanced Features (Deferred):**

- ⏸️ AI-assisted extraction grid population from PDFs (OCR/NLP pipeline)
- ⏸️ Advanced quality assessment automation (auto-score QUADAS-2 from article text)
- ⏸️ Multi-SOA comparison views (compare SOAs across projects)

**Validation Advanced Features (Deferred):**

- ⏸️ Interactive statistical analysis tools (run stats within CORTEX vs. import from Data Science)
- ⏸️ Sample size calculator integrated into protocol design

**CER Advanced Features (Deferred):**

- ⏸️ Fully automated traceability (AI auto-detects claims and links to sources without manual linking)
- ⏸️ Multi-language CER generation (EN/FR/DE/ES)
- ⏸️ Advanced regulatory templates (NMPA-specific, PMDA-specific beyond basic support)

**PMS Advanced Features (Deferred):**

- ⏸️ Automated vigilance database searches (auto-query MAUDE, Eudamed)
- ⏸️ Survey distribution and collection within CORTEX (vs. external survey tools)

**Cross-Module Advanced Features (Deferred):**

- ⏸️ Real-time collaboration (multiple users editing simultaneously with conflict resolution)
- ⏸️ API integrations with external PLM/QMS systems (Veeva, Greenlight Guru, etc.)
- ⏸️ Advanced executive dashboards (predictive analytics, risk forecasting)
- ⏸️ Multi-tenant architecture for consultants (separate client workspaces)
- ⏸️ Granular RBAC (role-based access control beyond basic user permissions)

---

### MVP Success Criteria

#### Phase Completion Gates (Per Module):

**Phase 1 (SLS) Success:**

- ✅ Complete one SLS session from query construction to locked dataset
- ✅ AI screening reduces manual review time by 50%+
- ✅ PRISMA flowchart accurately reflects query execution records

**Phase 2 (SOA) Success:**

- ✅ Complete Clinical SOA and Device SOA for one device
- ✅ AI-drafted thematic sections require < 40% editing (60%+ content retention)
- ✅ Device SOA successfully uses Clinical SOA Section 6 similar device registry

**Phase 3 (Validation) Success:**

- ✅ Complete one Standalone validation study protocol and report
- ✅ Validation results successfully mapped to SOA benchmarks
- ✅ DOCX exports are submission-quality

**Phase 4 (CER) Success:**

- ✅ Complete one 20.CER (MDR) from locked upstream modules
- ✅ Traceability: 90%+ of key claims linked to sources (SLS articles, SOA sections, Validation results)
- ✅ DOCX export is Notified Body submission-ready (user validation)

**Phase 5 (PMS) Success:**

- ✅ Complete one PMS cycle (PMCF activities → PSUR)
- ✅ PSUR triggers CER update decision (demonstrate regulatory loop)
- ✅ Gap registry successfully aggregates findings from SOA, Validation, CER

---

#### Full MVP Success (All 5 Phases Complete):

**1. End-to-End Pipeline Completion**

- ✅ Complete full lifecycle for one device: SLS → SOA → Validation → CER → PMS (one annual cycle)
- ✅ Metric: 100% of pilot users complete all 5 modules

**2. Time Reduction (North Star Metric)**

- ✅ Time to Regulatory-Ready CER: 6-8 weeks (vs. 4-6 months baseline)
- ✅ Metric: 75-85% time reduction demonstrated

**3. Full Traceability**

- ✅ Every CER claim traceable to source (SLS article, SOA section, Validation result)
- ✅ Metric: 95%+ traceability coverage (manual linking acceptable for MVP)

**4. Audit Readiness**

- ✅ Pilot users pass mock Notified Body audit using CORTEX-generated documentation
- ✅ Metric: 0 major findings, ≤ 2 minor findings in mock audit

**5. User Adoption Intent**

- ✅ Pilot users commit to using CORTEX for all future CER projects
- ✅ Metric: 80%+ pilot users answer "yes" to continued usage

**6. Cost Savings Validation**

- ✅ Demonstrated 40-60% cost reduction vs. consultant-heavy baseline
- ✅ Metric: Cost per CER ≤ €30K (vs. €50-100K baseline)

**7. System Stability**

- ✅ All 5 modules operational without critical bugs
- ✅ Metric: < 10 critical bugs across entire MVP (all modules)

---

#### Decision Gates:

**Proceed to V2.0 (Advanced Features) IF:**

- All 5 MVP phases completed and success criteria met
- 5+ pilot users produce complete CER using full CORTEX pipeline
- NPS ≥ 50
- No architectural blockers preventing scale

**Iterate/Optimize IF:**

- Modules complete but success criteria partially met (e.g., time reduction only 50% instead of 75%)
- User feedback indicates specific module pain points
- Performance or usability issues discovered

---

### Future Vision (Post-MVP)

#### V2.0: Advanced Features & Optimization (6-12 months post-MVP)

**Add Advanced Features Deferred from MVP:**

- ✅ **Automated Traceability** — AI auto-links CER claims to sources (no manual linking)
- ✅ **AI-Assisted Extraction** — Auto-populate SOA grids from article PDFs
- ✅ **Multi-Database Automated PDF Retrieval** — Integrate Unpaywall, institutional APIs
- ✅ **Advanced Quality Assessments** — Auto-score QUADAS-2, Reading Grids from article text
- ✅ **Multi-Language CER** — EN/FR/DE/ES generation

**Optimize Existing Modules:**

- Performance improvements (faster AI drafting, faster exports)
- UX refinements based on pilot user feedback
- Enhanced templates and configurability

**Value:** CORTEX MVP proven → now optimize for speed, automation, user experience

---

#### V3.0: Platform & Ecosystem (12-24 months post-MVP)

**Add Platform Features:**

- ✅ **Multi-Tenant Architecture** — Consultants manage multiple client projects with workspace isolation
- ✅ **Real-Time Collaboration** — Multiple users editing simultaneously (Google Docs-style)
- ✅ **API Integrations** — PLM/QMS connectors (Veeva, Greenlight Guru), external data sources
- ✅ **Advanced Dashboards** — Executive view, predictive analytics, risk forecasting
- ✅ **Granular RBAC** — Role-based permissions (view-only, editor, approver per module)

**Expand Regulatory Support:**

- ✅ **Advanced Regulatory Templates** — NMPA (China), PMDA (Japan), TGA (Australia) specific workflows
- ✅ **FDA Enhancements** — De Novo detailed support, PMA pathways

**Value:** CORTEX as platform, not just tool — ecosystem play for clinical affairs

---

#### V4.0: AI & Automation Frontier (24+ months)

**Push AI Boundaries:**

- ✅ **Predictive Risk Models** — AI predicts which gaps from SOA/Validation likely to surface in PMS
- ✅ **Auto-Query Construction** — AI generates SLS queries from CEP scope description
- ✅ **Auto-PMCF Planning** — AI suggests PMCF activities based on gap registry patterns
- ✅ **Regulatory Intelligence** — AI monitors regulatory landscape changes, suggests CER updates proactively

**Scale & Enterprise:**

- ✅ **Multi-Device Portfolio Management** — Manage 10-20 devices simultaneously with cross-device analytics
- ✅ **Compliance Dashboard** — Org-wide view of all devices, upcoming deadlines, risk indicators
- ✅ **White-Label Options** — Enterprise deployments with custom branding

**Value:** CORTEX as intelligent compliance co-pilot, not just documentation system
