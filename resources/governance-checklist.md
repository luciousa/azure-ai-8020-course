# AI Governance Checklist for K-12 Districts

Standalone checklist for district technology leaders, data privacy officers, and AI system owners. Covers the full lifecycle from evaluation through ongoing operations.

---

## Before You Build

### Stakeholder Alignment
- [ ] District leadership has approved the use case in writing
- [ ] Data Privacy Officer has been briefed and engaged
- [ ] IT Security Lead has reviewed the architecture
- [ ] Legal counsel has reviewed the Azure service terms and FERPA applicability
- [ ] A named AI System Owner has been designated (accountable for quality and operations)

### Legal and Policy Prerequisites
- [ ] Microsoft Data Processing Agreement (DPA) signed for the Azure services in use
- [ ] Azure FERPA-aligned service configuration confirmed with Microsoft account representative
- [ ] District AI use policy drafted (or existing policy reviewed for AI applicability)
- [ ] Staff data use agreement updated to cover AI-generated outputs
- [ ] Incident response plan includes AI-specific scenarios (e.g., student data exposure via prompt)

---

## Data Governance

### Approved View Catalog
- [ ] All views in the catalog reviewed and approved by Curriculum/Analytics Lead
- [ ] Each view reviewed for individual student data exposure (no PII columns)
- [ ] Small cell suppression implemented in any view that could expose subgroups < 10 students
- [ ] View catalog documented (purpose, columns, role scope, privacy notes) for each view
- [ ] GRANT/DENY permissions for the AI service account (`ai_svc_readonly`) verified for each view
- [ ] No direct table access granted to the AI service account (views only)

### Data Minimization
- [ ] Only the data needed to answer district analytical questions is included in views
- [ ] No columns that identify individual students appear in any approved view
- [ ] No columns containing sensitive categories (disability status, immigration status, health conditions) appear unless specifically approved and documented
- [ ] Data retention schedule defined for audit logs (AI query logs)

---

## Access Control

### Authentication
- [ ] All API endpoints require a valid JWT from the district's identity provider (Entra ID)
- [ ] Role claims sourced exclusively from the identity provider — not from the request
- [ ] SchoolId and SectionId claims sourced from verified directory attributes
- [ ] No hardcoded or shared credentials in production code
- [ ] API keys (POC) replaced with managed identity before production

### Authorization
- [ ] Role-to-view mapping defined and enforced in the `ViewRegistry` class
- [ ] Three-layer access control verified: authentication + metadata filter + SQL scope
- [ ] Cross-school access tested and blocked at Layer 3
- [ ] Teacher section scoping tested (teacher sees only their own SectionIds)
- [ ] Role boundaries tested with at least 6 negative test cases

---

## Privacy Controls

### FERPA Compliance
- [ ] Individual student names never sent to Azure OpenAI in prompts
- [ ] Individual student scores or records never sent to Azure OpenAI
- [ ] System prompt instructs LLM to report at aggregate level only
- [ ] Small cell suppression values (NULL) handled in system prompt and response formatting
- [ ] FERPA Compliance Evidence Document completed and reviewed by Data Privacy Officer
- [ ] FERPA controls verified against a 30+ case evaluation test set including Category C (FERPA decline) cases

### Data in Transit and at Rest
- [ ] Azure services configured to not retain user prompts (Azure OpenAI data retention policy confirmed)
- [ ] Audit logs stored in Azure Monitor / Log Analytics with defined retention period
- [ ] Audit logs contain role/school/view/tokens/latency — NOT question or answer text
- [ ] PII scan of telemetry conducted (KQL query confirmed zero student name hits)
- [ ] Production VNet isolation and private endpoints planned (or deployed)

---

## Quality Assurance

### Evaluation Before Production
- [ ] 30-case evaluation test set completed with ground truth SQL queries
- [ ] Scope safety = 1.00 across all test cases (non-negotiable)
- [ ] Groundedness ≥ 0.85 across all test cases
- [ ] Factual accuracy ≥ 0.90 across all test cases
- [ ] Response quality ≥ 0.80 across all test cases
- [ ] Category C (FERPA decline) cases all correctly declined
- [ ] Azure AI Evaluation SDK calibration completed (manual vs. SDK ≥ 80% agreement)

### Ongoing Quality
- [ ] Quarterly evaluation test set re-run scheduled and assigned to AI System Owner
- [ ] Groundedness regression alert configured in Azure Monitor
- [ ] Decline spike alert configured (>25% of queries declined triggers review)
- [ ] Review cadence defined: monthly (AI Owner), quarterly (DPO + IT Security), annual (leadership)

---

## Monitoring and Audit

### Operational Monitoring
- [ ] OpenTelemetry instrumentation covers all pipeline stages
- [ ] Custom metrics emitted: requests, declines, token counts, latency
- [ ] Application Insights Workbook deployed with KPI dashboard
- [ ] P99 latency alert configured (>10 seconds)
- [ ] Error rate alert configured (>1% in 5 minutes)
- [ ] Token budget alert configured (P95 input tokens > 3,000)

### Audit Trail
- [ ] Every query produces a structured audit log entry
- [ ] Audit log fields: timestamp, role, school_id, school_year, term_id, view_name, is_grounded, is_declined, token counts, latency, trace_id
- [ ] Question and answer text absent from all logs
- [ ] Log retention policy defined and implemented
- [ ] Data Privacy Officer has read access to audit logs for compliance review
- [ ] Procedure defined for responding to a DPO audit log request

---

## Change Management

### Change Control Process
- [ ] Change control process documented (who proposes, who reviews, who approves, what triggers review)
- [ ] Changes requiring DPO review identified: new views, system prompt changes, role scope changes, model version updates
- [ ] Staging environment mirrors production for testing changes
- [ ] Rollback procedure documented for each type of change

### View Catalog Changes
- [ ] Process for requesting a new view documented (who submits, who reviews, who approves)
- [ ] New view FERPA review required before addition to catalog
- [ ] SQL view peer review required before adding to `ViewRegistry`
- [ ] Metadata document for new view required before deployment
- [ ] Evaluation test cases for new view required before production enablement

---

## Staff and Communication

### Training
- [ ] Staff training outline written (role-appropriate: teachers vs. administrators)
- [ ] Training covers: what to ask, what not to ask, how to verify answers, how to report concerns
- [ ] Training completion tracked before user access is granted
- [ ] Training materials reviewed and updated annually

### Communication
- [ ] Executive summary written for district leadership
- [ ] Staff communication written explaining the system and its limits
- [ ] Clear channel for reporting concerns or unexpected outputs (who to contact)
- [ ] Process for staff to request new question types / view catalog expansion

---

## Rollout Readiness

### Before Phase 1 Pilot
- [ ] All FERPA technical controls verified (evaluation test set passed)
- [ ] Data Processing Agreement signed
- [ ] Staff AI use policy finalized and approved
- [ ] Pilot users trained
- [ ] Monitoring and alerting active
- [ ] Incident response plan approved
- [ ] Phase 1 success criteria formally agreed (zero FERPA incidents, groundedness >0.90, user satisfaction >70%)

### Before Phase 2 (Teacher Pilot)
- [ ] All Phase 1 success criteria met
- [ ] Teacher-role test cases verified (section scoping)
- [ ] Decline rate < 15% for in-scope teacher questions
- [ ] Teacher training materials prepared

### Before Phase 3 (District-Wide)
- [ ] All Phase 2 success criteria met
- [ ] Private endpoints deployed (VNet isolation)
- [ ] Production Entra ID integration verified
- [ ] Rate limiting configured and tested under load
- [ ] District-wide training plan ready
- [ ] DPO annual review scheduled

---

## Responsible AI Commitments

Document and publish the district's commitments in each area:

| Principle | District Commitment | Owner | Review Cadence |
|---|---|---|---|
| Fairness | Evaluation test set run across all schools; performance gaps flagged | AI System Owner | Quarterly |
| Reliability | Groundedness ≥ 0.85 maintained; regression alerts active | AI System Owner | Monthly |
| Privacy | FERPA controls verified; DPO audit access maintained | Data Privacy Officer | Quarterly |
| Transparency | Staff know they are using AI; source view cited in every answer | AI System Owner | Annually |
| Accountability | Named AI System Owner with published contact; incident escalation path documented | Superintendent | Annually |
| Inclusiveness | All role types covered in evaluation test set; no role is underserved by catalog | Curriculum Lead | Quarterly |
