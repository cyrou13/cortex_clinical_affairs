---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments:
  - bmad-outputs/planning-artifacts/product-brief-cortex-clinical-affairs-2026-02-13.md
  - specs/CORTEX — Systematic Literature Search Module.pdf
  - specs/CORTEX — State Of the Art Module.pdf
  - specs/CORTEX — Clinical Validation Module.pdf
  - specs/CORTEX — Clinical Evaluation Report Module.pdf
  - specs/CORTEX — Post-Market Surveillance Module.pdf
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
classification:
  projectType: saas_b2b
  domain: healthcare
  complexity: high
  projectContext: greenfield
workflowType: 'prd'
date: 2026-02-13
author: Cyril
projectName: cortex-clinical-affairs
---

# Product Requirements Document - cortex-clinical-affairs

**Author:** Cyril
**Date:** 2026-02-13

## Success Criteria

### User Success

**North Star Metric:** Time to Regulatory-Ready CER
- **Target:** 2 semaines (from project start to CER finalized and submission-ready)
- **Baseline:** 4-6 mois (manual/consultant workflow)
- **Reduction:** **95%+ time savings**
- **Why this metric:** Mesure la value stream complète CORTEX (SLS → SOA → Validation → CER), aligné avec le pain utilisateur principal

**Per-Persona Success Metrics:**

**Regulatory Affairs Manager (Marie):**
- CER Production Speed: 2 semaines target (vs 4-6 mois baseline)
- Audit Success Rate: 95%+ (vs 60-70% actuel)
- Traceability Completeness: 100% des claims CER tracés à leur source
- Pre-Audit Confidence: NPS 9+/10 (vs 3-4/10 actuel)
- **Moment "aha!":** Générer un CER de qualité submission-ready en 2 semaines, sans stress d'audit

**Clinical Affairs Specialist (Thomas):**
- Literature Screening Time Reduction: 80-90% (AI first-pass, human review edge cases)
- SOA Completion Time: 2-4 semaines (vs 6-12 semaines baseline)
- SOA Article Throughput: 50-200 articles analysés per SOA
- Analysis Reuse Rate: 30-50% cross-projects (similar devices)
- **Moment "aha!":** Sections MDR thématiques auto-générées avec références, juste à raffiner

**Quality/RA Consultant (Sophie):**
- Client Onboarding Time: 4-8h (vs 40-60h per client avec systèmes propriétaires)
- Multi-Client Capacity: 10-15 projets simultanés (vs 3-5)
- Template Reuse Rate: 70%+ (queries, grids, sections standardisées)
- **Moment "aha!":** Onboarding nouveau projet CORTEX en heures au lieu de jours

### Business Success

**Primary Objectives (12 mois post-deployment):**

1. **Reduce Consultant Costs:**
   - 50-70% réduction des dépenses consultants
   - Work insourced: 60%+ des tâches clinical affairs gérées en interne
   - Cost per CER: €15-30K (vs €50-100K baseline)

2. **Faster Time-to-Market:**
   - Project start → Notified Body submission: 6-9 mois (vs 12-18 mois) = 40-50% réduction
   - Parallel workflows capacity: 3-5 devices simultanés (vs 1-2)

3. **Increase Submission Success Rate:**
   - First-time approval rate: 70-85% (vs 30-50%)
   - Revision cycles: 0-1 cycle (vs 2-3 cycles)

4. **Clinical Affairs Team Scalability:**
   - Devices per FTE: 4-6 devices/FTE (vs 1-2) = 2-3x productivity
   - High-value time: 70-80% (vs 30-40% - AI handles manual screening/compilation)

**Key Performance Indicators:**

**Leading Indicators (Success Predictors):**
- AI Acceptance Rate: 70-80% du contenu AI accepté sans modifications majeures
- Traceability Coverage: 100% (architectural requirement)
- Module Completion Rate: 80%+ du pipeline SLS → CER complété

**Lagging Indicators (Outcomes):**
- CERs Completed per Quarter: 2-5/quarter (depending on org size)
- Notified Body Audit Findings: 0 major non-conformities, ≤2 minor
- NPS (Net Promoter Score): 50+ (industry SaaS benchmark)
- Cost Savings: €200-500K/year (mid-size manufacturer, 3-5 devices)

### Technical Success

**Quality & Reliability:**
- Document Quality: Submission-ready CERs passant mock Notified Body audits (0 major findings)
- AI Draft Quality: 70-80% du contenu AI retenu après human review
- Traceability Architecture: 100% des CER claims linked to sources (SLS articles, SOA sections, Validation results)

**Performance Targets:**
- SLS Lock Time: 3-6 semaines (query → locked dataset)
- SOA Completion Time: 2-4 semaines (SLS locked → SOA finalized)
- CER Draft-to-Final: 1-2 semaines (AI draft → CER completed)
- System Stability: <10 critical bugs across full MVP (5 modules)

**Compliance & Security:**
- Regulatory compliance: MDR Annex XIV, MEDDEV 2.7/1 Rev 4, MDCG 2020-13 templates
- Audit trails: Complete audit logs for all screening decisions, workflow states
- Data integrity: Versioned documents with locked upstream dependencies (immutable snapshots)

### Measurable Outcomes

**MVP Success Criteria (Decision Gate for V2.0):**
- ✅ Full lifecycle completion: 1 device through SLS → SOA → Validation → CER → PMS
- ✅ Time reduction demonstrated: 95%+ (2 semaines vs 4-6 mois baseline)
- ✅ Traceability coverage: 95%+ of key claims linked
- ✅ Audit readiness: Mock audit passed (0 major, ≤2 minor findings)
- ✅ User commitment: 80%+ pilot users commit to continued usage
- ✅ Cost validation: Cost per CER ≤ €30K
- ✅ **Quality gate:** Documents submission-ready without external consultant review

## Product Scope

### MVP - Minimum Viable Product

**Philosophy:** Full CORTEX (all 5 modules) as MVP, phased implementation.

**Why Full MVP?** CORTEX's unfair advantage is full-lifecycle integration. Partial MVP wouldn't demonstrate core value proposition.

**Phase 1: SLS Module (Foundation - PRIORITY #1)**
- Project & Session Management
- Query Construction (Boolean operators, version control)
- Multi-Database Execution (PubMed, Cochrane, Embase)
- AI-Assisted Screening (relevance scoring)
- Article Status Workflow (pending → scored → included/excluded → locked)
- Screening Decisions Audit Log (traceability)
- PRISMA Flowchart auto-generation
- **Delivery:** Locked, auditable literature dataset

**Phase 2: SOA Module (Clinical + Device)**
- SOA Configuration (clinical, similar_device, alternative types)
- Link to locked SLS sessions
- Configurable Extraction Grids with templates
- MDR-Aligned Thematic Sections (Clinical: §1-6, Device: §1-5)
- AI-Assisted Narrative Drafting
- Human Review & Finalization
- Performance Benchmarks & Comparison Tables
- **Delivery:** Locked SOA analyses feeding CER and Validation

**Phase 3: Validation Module**
- Study Types (Standalone, MRMC)
- Link to SOA benchmarks
- Protocol (study summary, endpoints, sample size)
- XLS Data Import from Data Science team
- Results Mapping to SOA benchmarks
- Validation & Clinical Benefit Report Generation (DOCX)
- **Delivery:** Validation reports feeding CER

**Phase 4: CER Module (Assembly Engine)**
- CER Configuration (CE-MDR primary, FDA 18.CVS parallel)
- Link Upstream Modules (locked SLS, SOA, Validation)
- Document Version Management (initial, annual_update, patch_update)
- Content Assembly with AI-drafted narratives
- Traceability (claims linked to sources)
- GSPR Compliance Matrix
- Benefit-Risk Determination
- 20.CER (DOCX) + CEP + PCCP exports
- **Delivery:** Regulatory-grade CER submission-ready

**Phase 5: PMS Module (Post-Market Loop)**
- PMS Plan & PMCF Plan
- Gap Registry (from SOA, Validation, CER)
- PMS Cycles (PMCF activities, literature updates, vigilance)
- PMCF Report & PSUR (DOCX)
- CER Update Decision (regulatory loop closure)
- **Delivery:** Continuous post-market compliance, CER lifecycle management

**MVP Integration (Critical Dependencies):**
- Sequential enforcement: SLS → SOA → Validation → CER → PMS
- Status-based access control
- Version locking (immutable snapshots per CER version)

### Growth Features (Post-MVP)

**V2.0: Advanced Features & Optimization (6-12 months post-MVP)**
- Automated Traceability (AI auto-links CER claims to sources)
- AI-Assisted Extraction (auto-populate SOA grids from PDFs)
- Multi-Database Automated PDF Retrieval (Unpaywall, institutional APIs)
- Advanced Quality Assessments (auto-score QUADAS-2)
- Multi-Language CER Generation (EN/FR/DE/ES)
- Performance optimizations (faster AI drafting, exports)
- UX refinements based on pilot feedback

### Vision (Future)

**V3.0: Platform & Ecosystem (12-24 months)**
- Multi-Tenant Architecture (consultants managing multiple clients)
- Real-Time Collaboration (Google Docs-style simultaneous editing)
- API Integrations (Veeva, Greenlight Guru, PLM/QMS connectors)
- Advanced Executive Dashboards (predictive analytics, risk forecasting)
- Granular RBAC (role-based permissions per module)
- Expanded Regulatory Support (NMPA China, PMDA Japan, TGA Australia)

**V4.0: AI & Automation Frontier (24+ months)**
- Predictive Risk Models (AI predicts PMS gaps from SOA/Validation)
- Auto-Query Construction (AI generates SLS queries from CEP)
- Auto-PMCF Planning (AI suggests activities from gap patterns)
- Regulatory Intelligence (AI monitors landscape, suggests proactive CER updates)
- Multi-Device Portfolio Management (10-20 devices, cross-device analytics)
- Compliance Dashboard (org-wide view, upcoming deadlines, risk indicators)

## User Journeys

### Journey Narratif : Projet "CINA-CSpine" à travers CORTEX

**Contexte : Le Projet**

**Dispositif :** CINA-CSpine - Logiciel d'aide au diagnostic IA pour détection de fractures cervicales sur radiographies

**Classe :** IIb (MDR)

**Objectif réglementaire :** Obtenir marquage CE-MDR + dossier FDA 510(k)

**Timeline cible :** CER submission-ready en 2 semaines

**Équipe :** Marie (RA Manager), Thomas (Clinical Specialist), Data Science team

#### Project Launch

**Day 1 - Project Kickoff**

CEO directive: "CINA-CSpine CER ready in 2 weeks for Notified Body submission."

Pre-CORTEX baseline: €80K consultants, 4-6 months, manual Excel compilation, traceability gaps.

**Marie opens CORTEX.**

#### Phase 1: SLS Module (Week 1, Days 1-3)

**Thomas (Clinical Specialist) executes systematic literature search:**

1. **Project Setup:** Creates "CINA-CSpine CE-MDR 2026" project, configures CEP (scope: cervical fractures, AI diagnosis, comparative accuracy)
2. **Query Construction:** Builds 3 Boolean queries with version control
3. **Multi-Database Execution:** PubMed, Cochrane, Embase → 4,521 articles (deduplicated)
4. **AI-Assisted Screening:** AI scores abstracts, Thomas reviews 800 "uncertain" articles (manual review focused on edge cases)
5. **Final Dataset:** 641 articles included, screening decisions logged
6. **Lock & PRISMA:** Dataset locked (immutable), PRISMA flowchart auto-generated

**Outcome:** 4,500 articles screened in 3 days (baseline: 3 months manual).

#### Phase 2: SOA Module (Week 1, Days 4-7)

**Thomas executes State of the Art analysis:**

**SOA Clinical (Days 4-5):**
- 187 articles extracted in configurable grids
- AI pre-populates grids from PDFs (60% retention after human validation)
- 6 MDR-aligned thematic sections (§1-6) with AI-drafted narratives
- Section 6 output: Similar Device Registry (87 devices), locked

**SOA Device (Days 6-7):**
- 3 devices selected for detailed comparison
- Performance benchmarks aggregated: Sensitivity 89-94% (mean 91.3%), target ≥92%
- Device SOA 5 sections finalized, locked

**Outcome:** SOA completed in 4 days, benchmarks established (≥92% sensitivity target for validation).

#### Phase 3: Validation Module (Week 2, Days 1-2)

**Marie + Data Science execute validation study:**

**Validation Study "CINA-CSpine v1.0 Standalone":**
- Protocol: 350 X-rays (180 fractured, 170 normal)
- Data Science imports XLS results: Sensitivity 93.9%, Specificity 95.3%
- System auto-compares to SOA benchmarks (≥92% target): Performance exceeds target
- Validation Report (DOCX) auto-generated
- Study locked

**Outcome:** Device performance validated as competitive, exceeds SOA benchmarks.

#### Phase 4: CER Module (Week 2, Days 3-4)

**Marie assembles Clinical Evaluation Report:**

**CER "CINA-CSpine 20.CER Initial v1.0":**
- Links upstream modules: SLS (641 articles locked), SOA locked, Validation locked
- AI drafts 14 MDR Annex XIV sections, Marie reviews and finalizes (75% AI content retained)
- Traceability: 98% coverage (one-click drill-down claim → source)
- GSPR Compliance Matrix auto-generated
- Exports: 20.CER (107 pages), CEP, PCCP, FDA 18.CVS (all DOCX)
- CER completed and locked

**Outcome:** CER submission-ready in 2 weeks (baseline: 4-6 months), 98% traceability coverage.

#### Phase 5: PMS Module (Post-Market Continuous Loop)

**6 months post-submission - PMS Cycle Year 1:**

**PMS Cycle "CINA-CSpine 2026":**
- Gap Registry auto-populated from SOA/Validation/CER open questions
- PMCF Activities executed:
  - Literature update: 47 new articles identified, 8 relevant
  - Named device vigilance search: No serious adverse events
  - User survey: 87% satisfaction (n=120)
  - Installed base tracking: 3,500 X-rays analyzed
- PMCF Report + PSUR auto-generated (DOCX)
- CER Update Decision: No update required (benefit-risk profile unchanged)
- Gap Registry updated for Year 2 PMCF planning

**Outcome:** Post-market regulatory loop closed, continuous compliance demonstrated.

#### Audit Validation (1 year post-submission)

**Notified Body Audit - Traceability Verification:**

Auditor requests justification for claim (page 47): "93.9% sensitivity"

Marie clicks claim in CORTEX → One-click drill-down displays:
- Source: Validation Study "CINA-CSpine v1.0 Standalone", Endpoint Sensitivity 93.9%
- Linked SOA benchmark: ≥92% target (met)
- Complete audit trail with timestamps

Proof package exported in 30 seconds.

**Audit Result:** Zero major findings, traceability validated as compliant.

#### Impact Summary

**Pre-CORTEX:** 4-6 months per CER, €80K consultants, fragmented tools, traceability gaps, 1 device capacity

**Post-CORTEX:** 2 weeks per CER, €20K internal cost, integrated platform, 98% traceability, 4 concurrent devices

**Value Delivered:** 95% time reduction, 75% cost reduction, audit-ready documentation, scalable clinical affairs capacity.

### Journey Requirements Summary

#### Module 1 : SLS (Systematic Literature Search)
- Project & session management (link to CEP)
- Boolean query builder with version control
- Multi-database execution (PubMed, Cochrane, Embase)
- AI-assisted abstract screening with relevance scoring
- Configurable thresholds (likely relevant/irrelevant/uncertain)
- Manual review workflow with spot-check validation
- Screening decision audit log
- Article pool with deduplication
- Article-Query Links (PRISMA foundation)
- Dataset locking (draft → screening → locked)
- PRISMA flowchart auto-generation

#### Module 2 : SOA (State of the Art)
- SOA types (Clinical, Device, Alternative)
- Link to locked SLS dataset
- Sequential dependency enforcement (Clinical §6 → Device SOA unlock)
- Configurable extraction grids with templates
- AI pre-population of grids from PDFs
- Human validation/correction
- MDR-aligned thematic sections (Clinical §1-6, Device §1-5)
- AI-assisted narrative drafting per section
- Similar Device Registry (Clinical §6 output)
- Performance benchmarks aggregation
- Device comparison tables
- Claims management (claims linked to articles)
- SOA locking

#### Module 3 : Validation
- Study types (Standalone, MRMC)
- Link to SOA benchmarks (auto-import acceptance criteria)
- Protocol with endpoints, sample size justification
- XLS data import from Data Science
- Results mapping to SOA benchmarks
- Validation Report generation (DOCX)
- GSPR mapping
- Validation locking

#### Module 4 : CER (Clinical Evaluation Report)
- Regulatory context (CE-MDR, FDA parallel)
- Link upstream modules (locked SLS, SOA, Validation)
- External document references (Risk Management, Usability, IFU)
- Named Device Literature Search
- CER section assembly (14 sections MDR Annex XIV)
- AI-drafted narrative per section
- Human review & finalization
- Traceability drill-down (click claim → source)
- GSPR Compliance Matrix auto-generation
- Benefit-Risk Determination
- Version management (initial, annual_update, patch_update)
- Multi-format export (20.CER, CEP, PCCP, GSPR, FDA 18.CVS)
- CER completion & locking

#### Module 5 : PMS (Post-Market Surveillance)
- PMS Plan configuration
- Gap Registry auto-populated from SOA/Validation/CER
- PMS Cycles (one per reporting period)
- PMCF Activities (Literature update, Named device search, Surveys, Vigilance, Complaints, Installed base, Trends)
- PMCF Report generation (DOCX)
- PSUR generation (DOCX)
- Benefit-Risk re-assessment
- CER Update Decision documentation
- Gap Registry updates for next cycle
- Regulatory loop closure

#### Cross-Module Capabilities
- Sequential dependency enforcement
- Status-based access control
- Version locking (immutable snapshots)
- Complete audit trails
- One-click traceability drill-down
- AI-assisted workflows with human review gates
- Multi-format DOCX exports
- Parallel regulatory paths (MDR + FDA)

#### User Types Revealed
1. **Marie (RA Manager)** - CER orchestration, review, approval, audit response
2. **Thomas (Clinical Specialist)** - SLS execution, SOA analysis, PMCF activities
3. **Data Science Team** - Validation study execution, XLS deliveries
4. **Notified Body Auditor** - Read-only access, traceability drill-down
5. **Executive/CEO** - Go/no-go decisions, timeline tracking
6. *(Implied)* **Admin** - User management, project access control
7. *(Implied)* **Support** - Troubleshooting, data quality checks

## Domain-Specific Requirements

### Compliance & Regulatory

**Regulatory Scope:**
- **Primary:** CE-MDR (Europe) - Medical Device Regulation compliance
- **Secondary:** FDA (US) - 510(k) pathway support
- **CORTEX Status:** CORTEX lui-même n'est PAS un dispositif médical - c'est un outil QMS/documentation interne. Pas de certification requise pour CORTEX, mais doit supporter création de documents conformes.

**Standards & Templates:**
- **MDR Annex XIV** template pour CER structure (mandatory)
- **MEDDEV 2.7/1 Rev 4** guidelines (Clinical Evaluation)
- **MDCG 2020-13** guidance (Clinical Evidence)
- **ISO 13485** QMS principles (traceability, audit trails, version control)
- **FDA guidance** for Software as Medical Device (SaMD) - pour devices évalués, pas CORTEX

**Key Requirement:** CORTEX génère documents submission-ready conformes MDR/FDA, avec templates built-in.

### Data Privacy & Security

**Data Scope:**
- **Données manipulées :** Propriétaires manufacturier uniquement (R&D, études validation, littérature scientifique, CERs)
- **PAS de données patients** → HIPAA non applicable
- **Confidentialité :** High (competitive intelligence, performance claims pré-publication)

**Security Must-Haves:**
- **Audit Trails :** Obligatoire - WHO modified WHAT WHEN (regulatory compliance)
  - Screening decisions logged avec reasons
  - Document version history avec timestamps
  - Workflow state transitions tracked
- **Access Control :** RBAC (Role-Based Access Control)
  - Status-based access (draft → screening → locked)
  - User permissions per module
- **Data Integrity :** Version locking - upstream dependencies locked as immutable snapshots per CER version (prevent retroactive changes)
- **Encryption :** At rest + in transit (standard practice)

### Technical Constraints

**Integration Requirements:**

**Input Integrations:**
- **Literature Databases :** PubMed API (public), Cochrane, Embase (licensing required)
- **Data Science Deliveries :** XLS import format (validation results)
- **External Documents :** Reference to Risk Management, Usability, IFU (summarized, not imported)

**Output Integrations:**
- **DOCX Export :** Submission-ready documents (20.CER, CEP, PCCP, PMCF Report, PSUR)
- **Notified Body Submission :** Export proof packages (audit trails, traceability reports)

**Performance:**
- **AI Processing :** AI screening, extraction, drafting must complete in reasonable time (minutes to hours, not days)
- **Document Generation :** DOCX export <5 min per document (107-page CER)

### AI Validation & Safety

**Mandatory Human-in-the-Loop:**
- **AI NEVER publishes autonomously** - all AI outputs require human review before finalization
- **Review Gates:**
  - AI screening → Human spot-check validation + manual review of "uncertain"
  - AI extraction grids → Human validate/correct
  - AI narrative drafts → Human review, edit, approve

**Traceability Enforcement:**
- **Architecture-enforced :** 100% traceability requirement - every CER claim must link to source
- **One-click drill-down :** From any claim → source article/SOA section/Validation result
- **Audit-ready :** Proof packages exportable in seconds

**AI Quality Metrics:**
- **Acceptance Rate Target :** 70-80% of AI-generated content retained after human review
- **False Positive/Negative Monitoring :** Track AI screening accuracy via spot-checks

### Risk Mitigations

**Domain-Specific Risks:**

**Risk 1 : AI Hallucinations (fausses claims dans CER)**
- **Mitigation :** Mandatory human review before CER finalization. AI drafts, human approves. Traceability check (every claim must have source).

**Risk 2 : Traceability Gaps (claim non tracé → audit failure)**
- **Mitigation :** Architecture enforces traceability (can't finalize CER with unlinked claims). Traceability coverage metric (95%+ target).

**Risk 3 : Data Loss (SLS dataset corrompu après locking)**
- **Mitigation :** Version control + backups. Locked datasets immutable (status "locked" = read-only).

**Risk 4 : Notified Body Rejection (CER non conforme MDR)**
- **Mitigation :** Built-in MDR templates (Annex XIV sections). Mock audit testing before real submission.

**Risk 5 : Regulatory Landscape Changes (new MDR guidance published)**
- **Mitigation :** Template versioning. Update templates when regulations change. Document which template version used per CER.

## Innovation & Novel Patterns

The following innovations differentiate CORTEX from traditional regulatory compliance approaches and existing point solutions.

### Detected Innovation Areas

**1. Full-Lifecycle Integration (Core Differentiator)**
- **Innovation:** Intégration complète SLS → SOA → Validation → CER → PMS comme système unifié
- **Contrast:** Point solutions existantes traitent tâches isolées (literature screening OR document writing), créant "integration tax" avec handoffs manuels
- **CORTEX approach:** Single source of truth pour toute la preuve clinique, automated data flow entre modules

**2. AI-Assisted Regulatory Workflows**
- **Innovation:** AI screening, extraction, drafting dans domaine hautement réglementé (medical device regulatory affairs)
- **Novel application:** AI agents pour tâches regulatory traditionnellement 100% manual/consultant-driven
- **Safety mechanism:** Mandatory human-in-the-loop - AI never publishes autonomously (AI drafts, human approves)
- **Impact:** 80-90% time reduction pour literature screening, 75%+ AI content retention après human review

**3. Architecture-Enforced Traceability**
- **Innovation:** Traceability comme contrainte architecturale (not just best practice)
- **Implementation:** Can't finalize CER with unlinked claims - system enforces 100% traceability
- **Contrast:** Approche traditionnelle = traceability manuelle (Excel, espoir), gaps fréquents lors d'audits
- **Value:** One-click drill-down from any CER claim to source (article, SOA section, Validation result)

**4. Living Documentation with Version Locking**
- **Innovation:** CER as living, versioned document (initial → annual_update → patch_update) avec immutable snapshots
- **Contrast:** CER traditionnel = static document, re-written from scratch pour chaque update
- **Mechanism:** Chaque CER version locks upstream dependencies (SLS, SOA, Validation) comme snapshots immuables (prevents retroactive changes)
- **Impact:** Update CER en jours (vs mois), traceability preserved per version

**5. Systematic Post-Market Loop Closure**
- **Innovation:** PMS → PSUR → CER Update Decision comme processus systématique (not ad-hoc)
- **Mechanism:** Gap Registry aggregates findings from SOA/Validation/CER → PMCF planning → Real-World Evidence → CER updates
- **Contrast:** PMS traditionnel = afterthought, CER update manual et réactif
- **Impact:** Continuous compliance, regulatory loop fermé

### Market Context & Competitive Landscape

**Current Landscape:**
- **Point Solutions:** Tools exist for isolated tasks (literature databases, document management, QMS systems) but no full-lifecycle integration
- **Consultant-Heavy:** Traditional approach relies on external consultants (€50-100K per CER, 4-6 mois)
- **Generic PLM/QMS:** Some manufacturers use generic systems not purpose-built for clinical affairs (lack regulatory intelligence, can't enforce clinical evidence workflows)

**CORTEX Positioning:**
- **First-mover advantage:** Full-lifecycle clinical affairs platform for medical devices
- **Purpose-built:** Data models conçus ground-up pour regulatory workflows (not adapted from generic systems)
- **Niche focus:** Medical device manufacturers (Class IIb/III primarily), not broad healthcare IT

**Competitive Gap:**
- No direct competitor offering integrated SLS → SOA → Validation → CER → PMS
- Existing solutions are either point tools (literature screening) or generic document management

### Validation Approach

**AI Validation:**
- **AI Screening Accuracy:** Spot-check validation (50+ samples per AI decision category)
- **Acceptance Rate Metric:** Target 70-80% AI content retention after human review
- **Human Review Gates:** Mandatory at key decision points (screening uncertain articles, validating extraction grids, approving AI narrative drafts)
- **Continuous Monitoring:** Track AI false positives/negatives, adjust thresholds as needed

**Full-Lifecycle Integration Validation:**
- **MVP Success Criteria:** Complete 1 device through full pipeline (SLS → PMS) in pilot
- **Time Reduction Target:** 95%+ (2 semaines vs 4-6 mois baseline)
- **Traceability Coverage:** 95%+ of CER claims linked to sources
- **Mock Audit Testing:** Pass mock Notified Body audit before real submissions

**User Adoption Validation:**
- **Pilot Users:** 5+ manufacturers complete full CER using CORTEX
- **Quality Gate:** Documents submission-ready without external consultant review
- **Audit Success:** 0 major findings in real Notified Body audits post-CORTEX

### Risk Mitigation

**Risk 1: Users don't trust AI in critical regulatory domain**
- **Mitigation:** Mandatory human review gates, transparency (AI shows relevance scores + reasoning)
- **Fallback:** Users can override AI decisions at any point, full manual workflow available

**Risk 2: AI accuracy insufficient (high false negative rate in screening)**
- **Mitigation:** Spot-check validation, adjustable thresholds, human review of "uncertain" category
- **Fallback:** If AI accuracy <70%, switch to manual screening with AI as suggestion tool only

**Risk 3: Regulatory landscape changes (new MDR/FDA guidance invalidates templates)**
- **Mitigation:** Template versioning, update templates when regulations change, document which template version used per CER
- **Monitoring:** Track regulatory updates (MDCG, FDA guidance documents)

**Risk 4: Integration complexity delays MVP**
- **Mitigation:** Phased implementation (SLS first → SOA → Validation → CER → PMS), validate each module independently before integration
- **Fallback:** If full integration proves too complex, launch modules standalone first, integrate iteratively

**Risk 5: Assumption wrong - market not ready for AI-assisted regulatory work**
- **Mitigation:** Start with internal use (develop for own company first), prove value before commercialization
- **Validation:** If pilot users (internal) achieve 95%+ time reduction + audit success, assumption validated

## SaaS B2B Specific Requirements

CORTEX is a collaborative web application with multi-user workflows. The following requirements address SaaS B2B architectural and operational needs.

### Project-Type Overview

CORTEX est une **application web SaaS B2B** (collaborative, multi-user) déployée en mode **mono-tenant** pour usage interne prioritaire. Architecture moderne Next.js + React avec collaboration temps-réel entre utilisateurs d'une même organisation (Regulatory Affairs team).

**Deployment Model:**
- **Phase actuelle:** Mono-tenant, single company deployment (usage interne)
- **Future potential:** Multi-tenant architecture pour commercialisation (V3.0+)
- **Deployment options:** Local (dockerized) + cloud-ready

### Technical Architecture Considerations

#### Tenant Model

**Current Phase (MVP - V2.0):**
- **Mono-tenant architecture:** Single database, single deployment per organization
- **No tenant isolation needed:** All users within same company
- **Simplified data model:** No tenant_id required in tables

**Future Evolution (V3.0+ if commercialization):**
- **Multi-tenant strategy TBD:** Options include:
  - Database per tenant (strong isolation, easier compliance)
  - Schema per tenant (medium isolation, shared infrastructure)
  - Shared schema with tenant_id (most scalable, requires careful RBAC)
- **Migration path:** Design data models with future multi-tenancy in mind (avoid hard-coded company assumptions)

#### RBAC Matrix (Role-Based Access Control)

**Core Roles:**

1. **Admin**
   - Full system access (all modules, all projects)
   - User management (create/delete users, assign roles)
   - System configuration (templates, workflows settings)

2. **Regulatory Affairs Manager**
   - CER orchestration & approval
   - Project creation & management
   - View all modules (SLS, SOA, Validation, CER, PMS)
   - Approve & finalize documents (CER, PMCF, PSUR)
   - Export submissions (DOCX)

3. **Clinical Affairs Specialist**
   - SLS execution (query construction, screening, dataset locking)
   - SOA analysis (extraction grids, thematic sections, narratives)
   - PMCF activities (literature updates, survey analysis)
   - Cannot finalize CER (approval restricted to RA Manager)

4. **Data Science Team**
   - Validation module access only
   - Import validation results (XLS deliveries)
   - View SOA benchmarks (acceptance criteria)
   - Cannot modify SLS, SOA, CER, or PMS

5. **Executive / Management**
   - Read-only dashboards
   - Project status overview (SLS locked? CER completed? Deadlines?)
   - High-level metrics (time to CER, cost savings, audit results)
   - Approval workflow for critical milestones (CER submission go/no-go)

6. **Auditor (Notified Body, Internal QA)**
   - Read-only access to projects
   - Traceability drill-down (view claim sources)
   - Export audit reports & proof packages
   - No edit permissions

**Permission Granularity:**

**By Module:**
- SLS: Admin, RA Manager, Clinical Specialist
- SOA: Admin, RA Manager, Clinical Specialist
- Validation: Admin, RA Manager, Data Science
- CER: Admin, RA Manager (Clinical Specialist read-only)
- PMS: Admin, RA Manager, Clinical Specialist

**By Status (Workflow State):**
- **Draft:** Creator + assigned roles can edit
- **Screening/Review:** Assigned roles can edit
- **Locked/Completed:** Read-only for all (immutable), except Admin can unlock with audit trail

**By Project:**
- Users can be assigned to specific projects
- Can only access projects they're assigned to (unless Admin)

**Permission Enforcement:**
- Backend API-level enforcement (not just UI hiding)
- Audit trail logs all permission checks (WHO tried to access WHAT, granted/denied)

#### Subscription Tiers

**Current Phase (Internal Tool):**
- No subscription tiers or pricing
- All features available to internal users

**Future Commercial Model (Post-V2.0):**
- TBD based on market validation
- Potential models:
  - **Per-user pricing:** $X/user/month (Clinical Specialist, RA Manager seats)
  - **Per-device pricing:** $Y/device managed (aligns with customer value - cost per CER)
  - **Feature tiers:** Basic (SLS+SOA), Professional (+Validation+CER), Enterprise (+PMS+Multi-tenant)

#### Integration List

**Inbound Integrations:**

**1. Literature Databases (Critical - MVP Phase 1)**
- **PubMed API** (public, free)
- **Cochrane Library** (subscription required)
- **Embase** (subscription + licensing)
- **Integration method:** REST API calls, article metadata import (title, abstract, authors, DOI)
- **Data format:** XML (PubMed), JSON (modern APIs)
- **Rate limiting:** Respect API quotas (PubMed: 10 requests/second with API key)

**2. Data Science Deliveries (Critical - MVP Phase 3)**
- **Format:** XLS/XLSX files (structured templates)
- **Content:** Validation study results (endpoints, statistical outcomes, demographics)
- **Import method:** File upload UI + parser (map XLS columns to Validation data model)
- **Validation:** Schema validation (ensure required fields present)

**3. Risk Management Files (Important - MVP Phase 4)**
- **Format:** PDF or DOCX (summary import, not full file)
- **Content:** Risk analysis summary, GSPR mapping, residual risks
- **Import method:** File upload + manual summary entry (or PDF parsing for key sections)
- **Usage:** Referenced in CER sections (Risk Analysis, Safety, Benefit-Risk Determination)

**Outbound Integrations:**

**1. DOCX Export (Critical - MVP Phase 4)**
- **Documents:** 20.CER, CEP, PCCP, PMCF Report, PSUR, Validation Reports
- **Format:** Microsoft Word .docx (submission-ready, editable)
- **Templates:** MDR-compliant formatting (Annex XIV structure, MEDDEV guidelines)
- **Generation time:** <5 min per 100-page document

**2. Email Notifications (Nice-to-have - V2.0)**
- **Triggers:**
  - Workflow state changes (SLS locked, SOA finalized, CER ready for review)
  - Assignment notifications (user assigned to project, task)
  - Deadline reminders (CER submission due in 7 days)
  - Approval requests (RA Manager approval needed for CER finalization)
- **Method:** SMTP server integration or email service (SendGrid, AWS SES)
- **User preferences:** Opt-in/opt-out per notification type

**3. Audit Log Exports (Important - V2.0)**
- **Format:** CSV or PDF
- **Content:** Complete audit trail (WHO, WHAT, WHEN for all actions)
- **Use case:** Compliance reporting, Notified Body audit evidence
- **Retention:** Configurable (default: 7 years post-device lifecycle per MDR)

**Future Integrations (V3.0+):**
- QMS Systems (Veeva Vault, Greenlight Guru) - bi-directional sync
- Notified Body portals - direct CER submission upload
- Calendar integrations (Google Calendar, Outlook) - deadline sync
- Slack/Teams - workflow notifications

#### Compliance Requirements

**SaaS-Level Compliance (Beyond Domain Requirements):**

**Data Residency:**
- **Current:** EU deployment preferred (data stays in EU for GDPR comfort)
- **Future multi-tenant:** Regional deployments (EU instance, US instance) based on customer location

**SOC 2 / ISO 27001:**
- **Not required for internal tool** (current phase)
- **Required for commercialization:** SOC 2 Type II or ISO 27001 certification (trust signal for enterprise customers)
- **Timeline:** V3.0+ (before commercial launch)

**SLA Commitments:**
- **Internal tool:** Best-effort uptime (no formal SLA)
- **Future commercial:** 99.9% uptime SLA (standard SaaS B2B expectation)
- **Disaster Recovery:** Regular backups, point-in-time recovery

**Data Retention:**
- **Regulatory requirement:** CERs, SLS datasets, audit trails retained for 7+ years (MDR compliance)
- **Backup strategy:** Daily backups, offsite storage, tested restore procedures

### Implementation Considerations

**Technology Stack Decisions:**

**Frontend:**
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS + shadcn/ui (rapid UI development)
- Real-time collaboration: Socket.IO or similar (workflow state sync across users)

**Backend:**
- Next.js API Routes (serverless functions) or dedicated Node.js backend
- Prisma ORM + PostgreSQL (relational data model for traceability)
- Authentication: NextAuth.js or Auth0 (RBAC-ready)

**Document Generation:**
- DOCX generation: docx.js or Pandoc (template-based)
- PDF generation (if needed): Puppeteer or wkhtmltopdf

**AI Integration:**
- OpenAI API (GPT-4) or Claude API for screening, extraction, drafting
- Rate limiting & cost management (AI calls are expensive at scale)
- Fallback to manual workflows if AI service unavailable

**Deployment:**
- Docker multi-stage builds (development, production)
- Container orchestration: Docker Compose (internal) or Kubernetes (future scale)
- Cloud hosting: AWS, GCP, or Azure (region: EU-west for GDPR)

**Scalability Considerations:**

**Current Phase (Mono-tenant, 5-10 users):**
- Single server deployment sufficient
- PostgreSQL on same instance (no separate DB server needed)
- Vertical scaling (bigger instance) if performance issues

**Future Multi-tenant (100s of customers, 1000s of users):**
- Horizontal scaling (load balancer + multiple app instances)
- Database sharding or read replicas
- Caching layer (Redis) for frequent queries
- CDN for static assets

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** **Full-Lifecycle Integration MVP**

**Philosophy:** CORTEX's unfair advantage is full-lifecycle integration (SLS → SOA → Validation → CER → PMS). A partial MVP (only SLS+SOA) wouldn't demonstrate the core value proposition. Users need the complete regulatory loop to validate that CORTEX solves their end-to-end pain.

**Rationale:**
- **Problem:** Medical device manufacturers suffer from fragmented clinical affairs workflows with disconnected tools
- **Solution:** Integrated platform managing complete evidence lifecycle
- **MVP Must Demonstrate:** Full integration as single source of truth, not isolated modules

**Implementation Strategy:** **Phased Delivery** - Build and validate each module sequentially, then integrate

**Resource Requirements:**
- **Team Size:** Small focused team (2-3 full-stack developers + 1 AI/ML specialist + 1 regulatory domain expert)
- **Timeline:** Phased implementation over 12-18 months to full MVP operational
- **Key Skills:** Next.js/React, PostgreSQL, AI integration (OpenAI/Claude API), DOCX generation, regulatory domain knowledge

### MVP Feature Set - Phased Implementation

#### Phase 1: SLS Module (Foundation - Months 1-3)

**Priority:** CRITICAL - All downstream modules depend on locked SLS datasets

**Core User Journeys Supported:**
- Clinical Specialist creates project, constructs Boolean queries, executes multi-database searches
- AI-assisted abstract screening (relevance scoring)
- Manual review of uncertain articles with spot-check validation
- Dataset locking with PRISMA flowchart generation

**Must-Have Capabilities:**
- Project & Session Management (link SLS to Clinical Evaluation Plan)
- Query Construction (Boolean operators, version control)
- Multi-Database Execution (PubMed, Cochrane, Embase APIs)
- AI-Assisted Screening (relevance scoring, configurable thresholds)
- Article Status Workflow (pending → scored → included/excluded → locked)
- Screening Decisions Audit Log (WHO included/excluded WHAT WHEN WHY)
- Article Pool with deduplication
- Article-Query Links (PRISMA foundation)
- Lock Dataset (immutable after locking)
- PRISMA Flowchart auto-generation

**Success Criteria:**
- Complete 1 SLS session from query to locked dataset
- AI screening reduces manual review time by 50%+
- PRISMA flowchart accurately reflects query execution

#### Phase 2: SOA Module (Clinical + Device - Months 4-6)

**Core User Journeys Supported:**
- Clinical Specialist configures extraction grids, performs article analysis
- AI pre-populates grids from PDFs (human validates/corrects)
- MDR-aligned thematic sections auto-generated with narratives
- Performance benchmarks established for validation targets

**Must-Have Capabilities:**
- SOA Configuration (clinical, similar_device, alternative types)
- Link to locked SLS datasets
- Sequential Dependency Enforcement (Clinical SOA §6 must complete before Device SOA)
- Configurable Extraction Grids with templates
- AI pre-population of grids (60%+ retention target)
- MDR-Aligned Thematic Sections (Clinical §1-6, Device §1-5)
- AI-Assisted Narrative Drafting per section
- Human Review & Finalization
- Similar Device Registry (Clinical SOA §6 output)
- Performance Benchmarks aggregation
- Device Comparison Tables
- Claims Management (claims linked to articles)
- SOA Locking

**Success Criteria:**
- Complete Clinical SOA + Device SOA for 1 device
- AI-drafted sections require <40% editing (60%+ retention)
- Device SOA successfully uses Clinical SOA §6 registry

#### Phase 3: Validation Module (Months 7-9)

**Core User Journeys Supported:**
- RA Manager + Data Science configure validation study (Standalone or MRMC)
- Data Science imports XLS results
- Results mapped to SOA benchmarks automatically
- Validation Report generated (DOCX submission-ready)

**Must-Have Capabilities:**
- Study Types (Standalone, MRMC)
- Link to SOA benchmarks (auto-import acceptance criteria)
- Protocol (study summary, endpoints, sample size justification)
- XLS Data Import from Data Science deliveries
- Results Mapping to SOA benchmarks (auto-compare)
- Validation Report generation (DOCX)
- Clinical Benefit Report (MRMC-specific)
- GSPR mapping
- Validation Locking

**Success Criteria:**
- Complete 1 Standalone validation study protocol + report
- Validation results successfully mapped to SOA benchmarks
- DOCX exports are submission-quality

#### Phase 4: CER Module (Assembly Engine - Months 10-12)

**Core User Journeys Supported:**
- RA Manager assembles CER from locked upstream modules
- AI drafts 14 MDR Annex XIV sections
- Human reviews narratives, verifies traceability
- One-click drill-down from claim to source
- Export submission-ready 20.CER (DOCX) + CEP + PCCP + FDA 18.CVS

**Must-Have Capabilities:**
- CER Configuration (CE-MDR primary, FDA 18.CVS parallel)
- Link Upstream Modules (locked SLS, SOA, Validation)
- External Document References (Risk Management, Usability, IFU - summarized)
- Named Device Literature Search (optional SLS session)
- CER Section Assembly (14 sections MDR Annex XIV)
- AI-Drafted Narrative per section
- Human Review & Finalization (tone adjustment, regulatory language)
- Traceability Drill-Down (click claim → source)
- GSPR Compliance Matrix auto-generation
- Benefit-Risk Determination
- Version Management (initial, annual_update, patch_update)
- Multi-Format Export (20.CER, CEP, PCCP, GSPR, FDA 18.CVS - all DOCX)
- CER Completion & Locking

**Success Criteria:**
- Complete 1 20.CER (MDR) from locked upstream modules
- Traceability: 90%+ key claims linked to sources
- DOCX export Notified Body submission-ready (user validation)

#### Phase 5: PMS Module (Post-Market Loop - Months 13-15)

**Core User Journeys Supported:**
- RA Manager + Clinical Specialist execute PMS cycle
- PMCF activities (literature updates, surveys, vigilance, trends)
- PMCF Report + PSUR auto-generated (DOCX)
- CER Update Decision documented (benefit-risk re-assessment)
- Gap Registry feeds next PMCF planning (regulatory loop closure)

**Must-Have Capabilities:**
- PMS Plan configuration (update frequency, linked CER version)
- Gap Registry auto-populated from SOA/Validation/CER
- PMS Cycles (one per reporting period)
- PMCF Activities (Literature Update, Named Device Search, Surveys, Vigilance, Complaints, Installed Base, Trends)
- PMCF Report generation (DOCX)
- PSUR generation (DOCX)
- Benefit-Risk re-assessment
- CER Update Decision documentation
- Gap Registry updates for next cycle
- Regulatory Loop Closure (PMS findings → CER updates)

**Success Criteria:**
- Complete 1 PMS cycle (PMCF activities → PSUR)
- PSUR triggers CER update decision (demonstrate loop)
- Gap Registry aggregates findings from SOA/Validation/CER

### MVP Integration (Critical Dependencies)

**Sequential Enforcement:**
1. SLS → SOA (SOA can't start until SLS locked)
2. SOA Clinical §6 → SOA Device (Device SOA requires similar device registry)
3. SOA Device → Validation (Validation uses SOA benchmarks as acceptance criteria)
4. SLS + SOA + Validation → CER (CER assembly requires all upstream locked)
5. CER + SOA gaps + Validation gaps → PMS (Gap Registry feeds PMCF planning)
6. PMS PSUR → CER Update (Post-market findings trigger CER updates)

**Architectural Constraints:**
- Status-based access control (can't edit locked documents)
- Version locking (CER versions lock upstream dependencies as immutable snapshots)
- Audit trails (every action logged with WHO/WHAT/WHEN)

### Post-MVP Features

#### V2.0: Advanced Features & Optimization (Months 16-24)

**Focus:** Optimize existing modules, add deferred advanced features

**Key Features:**
- Automated Traceability (AI auto-links CER claims to sources)
- AI-Assisted Extraction (auto-populate SOA grids from PDFs)
- Multi-Database PDF Retrieval (Unpaywall, institutional APIs)
- Advanced Quality Assessments (auto-score QUADAS-2)
- Multi-Language CER Generation (EN/FR/DE/ES)
- Performance Optimizations (faster AI, faster DOCX)
- UX Refinements (pilot feedback)
- Email Notifications (workflow states, deadlines, approvals)

**Success Gate:** All pilot users (5+) complete full CER, 95%+ time reduction validated

#### V3.0: Platform & Ecosystem (Months 25-36)

**Focus:** Commercialization readiness, multi-tenant, integrations

**Key Features:**
- Multi-Tenant Architecture (workspace isolation)
- Real-Time Collaboration (simultaneous editing)
- API Integrations (Veeva, Greenlight Guru, PLM/QMS)
- Advanced Executive Dashboards (predictive analytics, risk forecasting)
- Granular RBAC (fine-grained permissions)
- Expanded Regulatory Support (NMPA, PMDA, TGA)
- SOC 2 / ISO 27001 Certification

**Success Gate:** Commercial launch with 10+ paying customers, NPS ≥ 50

#### V4.0: AI & Automation Frontier (Months 37+)

**Focus:** AI innovation, intelligent compliance co-pilot

**Key Features:**
- Predictive Risk Models (AI predicts PMS gaps)
- Auto-Query Construction (AI generates SLS queries)
- Auto-PMCF Planning (AI suggests activities)
- Regulatory Intelligence (AI monitors landscape changes)
- Multi-Device Portfolio Management (10-20 devices)
- Compliance Dashboard (org-wide view, automated risk)
- White-Label Options (enterprise custom branding)

**Success Gate:** CORTEX as intelligent compliance co-pilot

### Risk Mitigation Strategy

#### Technical Risks

**Risk 1: Integration Complexity (5 modules interdependent)**
- **Mitigation:** Phased implementation - validate each module independently before integration
- **Fallback:** Launch modules standalone first, integrate iteratively
- **Validation:** Complete end-to-end test (1 device through full pipeline)

**Risk 2: AI Accuracy Insufficient**
- **Mitigation:** Spot-check validation, adjustable thresholds, mandatory human review
- **Fallback:** If AI <70% accuracy, switch to manual with AI suggestions only
- **Validation:** Track AI acceptance rate (target 70-80%)

**Risk 3: DOCX Generation Quality**
- **Mitigation:** Proven libraries (docx.js/Pandoc), MDR templates, extensive testing
- **Fallback:** Manual DOCX editing if auto-generation fails
- **Validation:** User validates submission-readiness

#### Market Risks

**Risk 1: Market Not Ready for AI-Assisted Regulatory Work**
- **Mitigation:** Start with internal use, prove value before commercialization
- **Validation:** Internal pilot achieves 95%+ time reduction + audit success
- **Fallback:** Position as QMS tool (not AI-first) if resistance high

**Risk 2: Regulatory Landscape Changes**
- **Mitigation:** Template versioning, monitor MDCG/FDA updates quarterly
- **Validation:** Update templates within 30 days of regulatory changes
- **Fallback:** Consulting partnership for regulatory currency

#### Resource Risks

**Risk 1: Fewer Resources Than Planned**
- **Mitigation:** Prioritize SLS → SOA → CER (core), defer PMS if needed
- **Minimum Team:** 2 developers + 1 regulatory expert (vs ideal 4-5)
- **Fallback:** Extend timeline (phased delivery allows flexibility)

**Risk 2: Timeline Slip**
- **Mitigation:** Phase gates with success criteria, 20% buffer per phase
- **Contingency:** Each phase independently validated
- **Fallback:** Launch Phase 1-3 only (SLS+SOA+CER), add rest post-launch

**Risk 3: Key Person Dependency**
- **Mitigation:** Documentation-first, knowledge sharing, pair programming
- **Contingency:** Regulatory expert trains developers
- **Fallback:** External consultant backup for regulatory gaps

## Functional Requirements

The following capabilities define the complete system contract. Each FR is testable and traceable to user needs documented in Success Criteria and User Journeys.

### 1. Project & Session Management

- **FR1:** Admin can create new projects with project name, device information, and regulatory context (CE-MDR, FDA, etc.)
- **FR2:** Admin can configure Clinical Evaluation Plan (CEP) with scope, objectives, and device classification
- **FR3:** Clinical Specialist can create SLS sessions linked to a specific CEP
- **FR4:** Users can view project dashboard showing status of all modules (SLS, SOA, Validation, CER, PMS)
- **FR5:** Users can view project timeline with deadlines and milestones
- **FR6:** Admin can assign users to specific projects with role-based permissions

### 2. Literature Search & Screening (SLS Module)

**Session Typing & Dynamic Scoping:**
- **FR7:** Clinical Specialist can construct Boolean queries with operators (AND, OR, NOT) and version control
- **FR7a:** Clinical Specialist can create SLS session with type (soa_clinical, soa_device, similar_device, pms_update, ad_hoc) that drives downstream behavior and dynamic scope fields
- **FR7b:** System can display different scope fields based on session type

**Query Execution & PRISMA Source of Truth:**
- **FR8:** Clinical Specialist can execute queries across multiple databases (PubMed, Cochrane, Embase)
- **FR8a:** System can create Query Execution Record as PRISMA source of truth with execution status (success/partial/failed/cancelled)
- **FR8b:** System can track execution counts per query (articles returned vs articles imported)

**Article Import & Deduplication:**
- **FR9:** System can import article metadata (title, abstract, authors, DOI, publication date) from database APIs
- **FR10:** System can deduplicate articles across multiple database sources
- **FR10a:** System can apply deduplication rules (DOI exact, PMID exact, title fuzzy >95% + same first author + same year)
- **FR10b:** System can track deduplication statistics for PRISMA flowchart

**Article Lifecycle States:**
- **FR11:** System can track Article-Query Links (which query/database returned each article)
- **FR11a:** System can manage article lifecycle states (pending → scored → included/excluded/skipped → full_text_review → final_included/final_excluded)
- **FR11b:** Clinical Specialist can transition articles between lifecycle states with logged justification

**AI Scoring with Exclusion Codes:**
- **FR12:** AI can score articles for relevance based on abstract content (0-100 score)
- **FR12a:** AI can return suggested exclusion code mapped to project-specific code list
- **FR12b:** Clinical Specialist can cancel AI scoring in progress (preserve completed items)
- **FR12c:** System can display AI scoring progress with ETA and completion notifications

**Configurable Exclusion-Reason Code System:**
- **FR13:** Clinical Specialist can configure relevance thresholds (likely relevant, likely irrelevant, uncertain)
- **FR13a:** Admin can configure project-specific exclusion-reason codes with short codes for PRISMA
- **FR13b:** Admin can add, rename, hide, reorder exclusion codes with uniqueness constraints
- **FR13c:** System can use exclusion codes in AI suggestions and screening decisions

**Custom AI Filter:**
- **FR14:** Clinical Specialist can manually review articles and make screening decisions (include, exclude, skip)
- **FR14a:** Clinical Specialist can define optional Custom AI Filter (secondary 0-100 score from user-written criterion)
- **FR14b:** System can display Custom AI Filter as sortable/filterable column

**Screening Audit & Validation:**
- **FR15:** System can log screening decisions with reason and timestamp
- **FR16:** Clinical Specialist can perform spot-check validation of AI screening decisions

**Dataset Locking & PRISMA:**
- **FR17:** Clinical Specialist can lock SLS dataset (change status to immutable)
- **FR18:** System can auto-generate PRISMA flowchart with per-query and per-database breakdown
- **FR18a:** System can generate reproducibility statements per database included as annex to Search Strategy Report
- **FR19:** System can prevent modifications to locked SLS datasets

**PDF Retrieval & Verification:**
- **FR19a:** System can retrieve full-text PDFs via multiple sources (PMC, Unpaywall, Europe PMC, DOI resolution)
- **FR19b:** System can perform smart verification of PDFs (extract title/authors, compare to metadata, flag mismatches)
- **FR19c:** Clinical Specialist can manually upload PDFs for articles
- **FR19d:** Clinical Specialist can review and resolve PDF mismatch warnings

**Manual Article Addition & Reference Mining:**
- **FR19e:** Clinical Specialist can manually add articles not from searches (upload PDF → LLM extracts metadata → user edits → enters screening funnel)
- **FR19f:** System can extract references from PDFs using GROBID + LLM fallback
- **FR19g:** System can validate extracted references via CrossRef/PubMed APIs
- **FR19h:** System can deduplicate mined references against existing article pool
- **FR19i:** Clinical Specialist can review and approve mined references for inclusion

**Async Task System:**
- **FR19j:** System can display async task panel with progress, ETA, and status
- **FR19k:** Users can cancel async tasks in progress (preserve completed items)
- **FR19l:** System can run tasks in background and send completion notifications
- **FR19m:** Users can view task history with completion status and timestamps

**LLM Abstraction Layer:**
- **FR19n:** Admin can configure LLM backends per task type (system default, project override, per-task override)
- **FR19o:** System can apply cost-optimization strategy for LLM selection

### 3. Clinical Evidence Analysis (SOA Module)

**SOA Configuration & Linking:**
- **FR20:** Clinical Specialist can create SOA analysis with type (clinical, similar_device, alternative)
- **FR21:** Clinical Specialist can link SOA to one or more locked SLS sessions
- **FR22:** System can enforce sequential dependency (warn if Device SOA created before Clinical SOA Section 6 finalized)

**Extraction Grids:**
- **FR23:** Clinical Specialist can configure extraction grids with custom columns per SOA type
- **FR24:** Clinical Specialist can select from pre-built extraction grid templates
- **FR25:** AI can pre-populate extraction grids from article PDFs
- **FR26:** Clinical Specialist can validate and correct AI-extracted data in grids

**AI Confidence & Source Tracking:**
- **FR26e:** System can display per-cell AI confidence level (high/medium/low) for extracted data
- **FR26f:** Clinical Specialist can flag cells with low AI confidence for manual review
- **FR26g:** System can store source quote (text snippet) for extracted numeric values
- **FR26h:** Clinical Specialist can view source quote when hovering over extracted cell value
- **FR26i:** System can deep-link from grid cell to PDF location where data was extracted

**Per-Article Extraction Status:**
- **FR26j:** System can track per-article extraction status in grid (pending, extracted, reviewed, flagged)
- **FR26k:** System can display extraction progress per SOA analysis
- **FR26l:** Clinical Specialist can filter grid by extraction status

**Evidence Quality Assessment:**
- **FR26a:** Clinical Specialist can perform QUADAS-2 regulatory quality assessment per article
- **FR26b:** Clinical Specialist can perform Internal Reading Grids quality assessment per article
- **FR26c:** System can generate combined quality assessment summary
- **FR26d:** Clinical Specialist can assign data contribution level per article (pivotal, supportive, background)

**Thematic Sections & Narratives:**
- **FR27:** Clinical Specialist can create MDR-aligned thematic sections (Clinical §1-6, Device §1-5)
- **FR28:** AI can generate narrative drafts for thematic sections based on extraction grid data
- **FR29:** Clinical Specialist can review, edit, and approve AI-drafted narratives

**Benchmarks & Comparison:**
- **FR30:** Clinical Specialist can create Similar Device Registry (Clinical SOA Section 6)
- **FR31:** Clinical Specialist can aggregate performance benchmarks
- **FR32:** Clinical Specialist can create device comparison tables from similar device registry

**Claims & Locking:**
- **FR33:** Clinical Specialist can manage claims linked to articles and sections
- **FR34:** Clinical Specialist can lock SOA analysis (change status to immutable)

**SOA Async Operations:**
- **FR34a:** System can run batch quality assessment asynchronously with progress tracking
- **FR34b:** System can cancel SOA async operations in progress (preserve completed items)
- **FR34c:** System can display SOA async operations in task panel with status

### 4. Validation Management

**Validation Study Creation:**
- **FR35:** RA Manager can create validation study with type (Standalone, MRMC)
- **FR35a:** RA Manager can launch mini literature search (SLS session type ad_hoc) from Validation for MRMC methodology justification
- **FR35b:** System can link mini literature search to Validation study for traceability
- **FR36:** RA Manager can link validation study to SOA Device analysis (auto-import benchmarks)

**Protocol Management & Amendments:**
- **FR37:** RA Manager can define study protocol (endpoints, sample size justification, statistical strategy)
- **FR37a:** System can warn when protocol is amended after approval
- **FR37b:** System can automatically increment protocol version (1.0 → 1.1) when amended
- **FR37c:** System can include amendment history in Validation Report

**Data Import & Versioning:**
- **FR38:** Data Science can import validation results via XLS file upload
- **FR38a:** System can manage multiple XLS import versions per validation study
- **FR38b:** Data Science can select "active" import version for report generation
- **FR38c:** System can display diff between import versions
- **FR38d:** System can rollback to previous import version if needed
- **FR39:** System can validate XLS schema (ensure required fields present)

**Results Mapping:**
- **FR40:** System can map validation results to SOA benchmarks (auto-compare performance)

**Report Generation - Standard:**
- **FR41:** System can generate Validation Report (DOCX) with protocol, results, SOA comparison
- **FR42:** System can generate Clinical Benefit Report for MRMC studies (DOCX)

**Report Generation - Additional Exports:**
- **FR42a:** System can generate Algorithmic Fairness Report (DOCX)
- **FR42b:** System can generate Labeling Validation Checklist (DOCX)
- **FR42c:** System can generate Benefit Quantification Report (DOCX)
- **FR42d:** System can export structured output set
- **FR42g:** System can generate FDA 18.CVS (Clinical Validation Study) standalone report (DOCX) for FDA submissions
- **FR42h:** System can export FDA 18.CVS with FDA-specific formatting

**Patch Validation Reports:**
- **FR42e:** System can generate Patch Validation Report with delta analysis
- **FR42f:** System can highlight what changed between parent study and patch study

**GSPR Mapping & Locking:**
- **FR43:** RA Manager can map validation results to GSPR requirements
- **FR44:** RA Manager can lock validation study (change status to immutable)

**Async Operations:**
- **FR44a:** System can display which Validation actions run asynchronously
- **FR44b:** System can track async Validation operations in task panel

### 5. Clinical Evaluation Report Assembly (CER Module)

**CER Creation & Configuration:**
- **FR45:** RA Manager can create CER with regulatory context (CE-MDR, FDA 510(k))
- **FR46:** RA Manager can link CER to locked upstream modules (SLS, SOA, Validation)
- **FR47:** RA Manager can reference external documents (Risk Management, Usability, IFU) with summary

**Named Device Literature Search - Expanded:**
- **FR48:** RA Manager can create Named Device Literature Search
- **FR48a:** System can search competent authority databases (MAUDE, ANSM, BfArM, AFMPS) in addition to scientific databases
- **FR48b:** System can aggregate vigilance findings from multiple competent authority sources

**CER Assembly & Drafting:**
- **FR49:** System can assemble CER with 14 MDR Annex XIV sections
- **FR50:** AI can draft narrative for each CER section based on upstream data
- **FR51:** RA Manager can review, edit, and finalize AI-drafted CER sections

**Traceability & GSPR:**
- **FR52:** Users can drill-down from any CER claim to view source with one click
- **FR53:** System can auto-generate GSPR Compliance Matrix
- **FR54:** System can generate Benefit-Risk Determination

**Cross-Reference & Bibliography Management:**
- **FR58a:** System can differentiate cross-reference numbering rules ([R1] for external document refs vs [1] for bibliography refs)
- **FR58b:** System can auto-renumber cross-references when sections are edited
- **FR58e:** System can compile bibliography from all cited articles across CER sections
- **FR58f:** System can deduplicate bibliography entries
- **FR58g:** System can support multiple citation output styles (Vancouver, author-year)

**External Document Version Management:**
- **FR58c:** System can detect version mismatches when external documents change version
- **FR58d:** System can flag impacted CER sections when external document version changes

**PCCP Deviation Workflow:**
- **FR58h:** RA Manager can track deviations from PCCP
- **FR58i:** RA Manager can configure deviation significance threshold
- **FR58j:** System can flag significant deviations requiring justification

**Evaluator Records & Signatures:**
- **FR58k:** RA Manager can assign evaluator roles per CER section (written_by, verified_by, approved_by)
- **FR58l:** RA Manager can attach evaluator CV to CER metadata
- **FR58m:** RA Manager can record evaluator COI declarations
- **FR58n:** System can display evaluator metadata and signature trail

**GSPR Compliance Statement:**
- **FR58o:** System can auto-generate GSPR compliance statement compiled from GSPR table statuses
- **FR58p:** System can include GSPR compliance statement in CER document

**CER Version Management & Updates:**
- **FR55:** RA Manager can manage CER versions (initial, annual_update, patch_update)
- **FR55a:** System can duplicate previous locked CER when creating update version
- **FR55b:** System can display "unchanged since vN" indicators for sections
- **FR55c:** System can flag sections requiring updates based on upstream module changes
- **FR55d:** System can generate delta summary showing what changed between CER versions
- **FR56:** System can lock upstream dependencies as immutable snapshots per CER version

**Export & Locking:**
- **FR57:** System can export CER in multiple formats (20.CER, CEP, PCCP, GSPR Table - all DOCX)
- **FR58:** RA Manager can complete and lock CER (change status to immutable)

### 6. Post-Market Surveillance (PMS Module)

**PMS Plan Configuration:**
- **FR59:** RA Manager can create PMS Plan with update frequency and data collection methods
- **FR59a:** Admin can configure vigilance databases per PMS Plan
- **FR59b:** Admin can define vigilance search keywords per similar device
- **FR59c:** Admin can link survey templates to PMS Plan
- **FR59d:** System can manage PMS Plan statuses (draft → approved → active)
- **FR59e:** RA Manager can define Responsibilities table per PMS activity

**Gap Registry & Cycle Creation:**
- **FR60:** System can auto-populate Gap Registry from SOA, Validation, and CER open questions
- **FR61:** RA Manager can create PMS Cycles linked to CER version

**PMCF Activities:**
- **FR62:** Clinical Specialist can execute PMCF activities
- **FR62a:** Clinical Specialist can enter complaints and incidents data from Zoho Desk
- **FR62b:** System can compute trend analysis from complaints, incidents, and installed base data
- **FR62c:** System can track activity completion status per PMCF activity

**Report Generation:**
- **FR63:** System can generate PMCF Report (DOCX) aggregating clinical PMCF activities
- **FR64:** System can generate PSUR (DOCX) as comprehensive annual report
- **FR64a:** System clarifies: PSUR is the comprehensive annual report; no separate "PMS Report" exists

**CER Update Decision & Loop Closure:**
- **FR65:** RA Manager can document CER Update Decision with benefit-risk re-assessment
- **FR66:** System can update Gap Registry based on PMS findings
- **FR67:** System can trigger CER version update when PSUR identifies material changes

### 7. User & Permission Management

- **FR68:** Admin can create users with roles (Admin, RA Manager, Clinical Specialist, Data Science, Executive, Auditor)
- **FR69:** System can enforce role-based permissions per module
- **FR70:** System can enforce status-based access control (draft = editable, locked = read-only)
- **FR71:** Admin can assign users to specific projects
- **FR72:** System can log all permission checks
- **FR73:** Admin can unlock locked documents with audit trail justification

### 8. Document Generation & Export

- **FR74:** System can generate DOCX documents using MDR-compliant templates
- **FR75:** System can generate multiple document types
- **FR76:** System can complete DOCX generation in <5 minutes for 100+ page documents
- **FR77:** Users can export proof packages for Notified Body audits

### 9. Traceability & Audit

- **FR78:** System can log all user actions with WHO, WHAT, WHEN, WHY
- **FR79:** System can log screening decisions with inclusion/exclusion reasons
- **FR80:** System can log workflow state transitions
- **FR81:** System can log document version history with timestamps
- **FR82:** Auditors can drill-down from any CER claim to view complete source chain
- **FR83:** Auditors can export audit trails in CSV or PDF format
- **FR84:** System can enforce 100% traceability

### 10. AI-Assisted Workflows

- **FR85:** AI can perform relevance scoring for literature screening
- **FR86:** AI can pre-populate SOA extraction grids from article PDFs
- **FR87:** AI can generate narrative drafts for SOA thematic sections and CER sections
- **FR88:** System can enforce mandatory human review gates before finalization
- **FR89:** Clinical Specialist can perform spot-check validation of AI decisions
- **FR90:** System can track AI acceptance rate
- **FR91:** Users can override AI decisions at any point
## Non-Functional Requirements

### Performance

- **P1:** SLS query execution completes in <30 seconds for queries returning up to 10,000 articles
- **P2:** AI screening processes 1,000 articles in <5 minutes
- **P3:** Full-text AI abstraction processes 50 articles in <10 minutes
- **P4:** CER document generation (100+ pages) completes in <2 minutes
- **P5:** User interface actions (load project, view article, save note) respond in <2 seconds
- **P6:** System supports 5 concurrent users on same project with <10% performance degradation

### Security

- **S1:** All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- **S2:** Role-Based Access Control (RBAC) strictly enforced for 6 defined roles
- **S3:** Multi-Factor Authentication (MFA) required for all users
- **S4:** Immutable audit trail logs all critical actions (CER claim modifications, protocol amendments, vigilance reports)
- **S5:** Electronic signatures compliant with 21 CFR Part 11
- **S6:** GDPR-compliant data handling for patient data in clinical studies
- **S7:** Data retention of 15 years for all regulatory submissions (MDR compliance)
- **S8:** Session timeout after 30 minutes of inactivity

### Scalability

- **SC1:** System supports up to 50 concurrent users
- **SC2:** System supports up to 20 concurrent device projects
- **SC3:** Shared article database scales to 100,000+ indexed articles
- **SC4:** CER generation supports documents up to 500 pages with annexes
- **SC5:** Architecture permits future migration to multi-tenant SaaS (not MVP requirement)

### Reliability & Data Integrity

- **R1:** System availability of 99% during business hours (8am-8pm CET, Monday-Friday)
- **R2:** Automated daily database backups with 30-day retention
- **R3:** All user inputs auto-saved every 10 seconds to prevent data loss
- **R4:** Locked document versions are immutable with checksum verification
- **R5:** Recovery Point Objective (RPO) <24 hours, Recovery Time Objective (RTO) <4 hours
- **R6:** Architecture-enforced traceability prevents orphaned CER claims (referential integrity)

### Integration

- **I1:** Import Risk Management files in .xlsx and .xml formats (ISO 14971)
- **I2:** Export regulatory submissions in DOCX format with configurable templates (FDA, MDR)
- **I3:** Email notifications via SMTP for workflow assignments and PMS alerts
- **I4:** Architecture permits future API for third-party integrations (not MVP requirement)

