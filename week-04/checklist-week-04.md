# Week 04 Completion Checklist

**Week:** 4 — SQL Server Integration and Metadata Design  
**Modules:** 07, 08 | **Labs:** 04a, 04b

## Module 07 — SQL Server Integration

- [ ] Read Module 07 in full
- [ ] Can explain why AI-generated SQL is not used for student data (cite 4+ specific risks)
- [ ] Understands the approved view catalog architecture (AI Search → view name → SQL function)
- [ ] Can apply the three view design principles (aggregates only, no PII, small cell suppression)
- [ ] Understands the small cell suppression SQL pattern (`CASE WHEN COUNT(*) < 10 THEN NULL`)
- [ ] Can implement and explain the `ai_svc_readonly` GRANT/DENY pattern
- [ ] Understands parameterized queries vs. string formatting — can explain the difference
- [ ] Can describe the ViewRegistry pattern in .NET (HashSet + IsAuthorized + switch dispatch)
- [ ] Understands how teacher section scoping prevents cross-section data access
- [ ] Knows which calculations belong in SQL vs. which belong in AI
- [ ] Completed Module 07 reflection questions

## Module 08 — Metadata and Semantic Layers

- [ ] Read Module 08 in full
- [ ] Can distinguish: data dictionary vs. semantic layer vs. metadata catalog
- [ ] Understands what makes a good metadata document (synonyms, scope limits, parameter examples)
- [ ] Can name all 5 metadata document categories and their purposes
- [ ] Understands how `view_name` field in metadata drives SQL dispatch in the RAG pipeline
- [ ] Understands the two sources of query parameters: UserContext (Entra ID) + question parsing
- [ ] Can apply consistent field naming conventions (SchoolYear, TermID, GradeLevel, etc.)
- [ ] Completed Module 08 reflection questions

## Lab 04a — Approved Views

- [ ] All 9 approved views created in `SunlakeUnifiedDW` without SQL errors
- [ ] Views verified to return aggregated data (no individual student rows)
- [ ] `ai_svc_readonly` login and user created
- [ ] GRANT SELECT executed for all 9 views
- [ ] DENY SELECT executed for all base tables (dim_Student, fact_*)
- [ ] Permission test script run: 3 views ALLOWED, 3 base tables DENIED
- [ ] PII column check run: all 4+ views confirmed to have no PII columns
- [ ] (Optional) AI-generated SQL risk demo completed on synthetic data
- [ ] Lab report: documented the view most complex to write; which PII was excluded; risk demo findings
- [ ] `.env.local` updated to use `ai_svc_readonly` credentials

## Lab 04b — Metadata Catalog

- [ ] `lab04b_full_catalog.py` created with all 49 documents
- [ ] All 5 category counts correct: 9 view + 12 business-rule + 5 domain-overview + 12 faq + 11 glossary
- [ ] All 49 documents uploaded to `susd-metadata-v1` with 0 upload failures
- [ ] Retrieval test script run
- [ ] All view category tests returning correct category as top result
- [ ] Business-rule tests returning rule documents (not view documents) for definitional queries
- [ ] FAQ tests returning FAQ documents for "what is / when / can I" questions
- [ ] Glossary tests returning glossary entries for terminology queries
- [ ] Security trimming tests: teacher role does NOT receive district_admin-only view documents
- [ ] At least one retrieval gap found and documented
- [ ] Gap fix applied, re-uploaded, and re-tested — improvement documented in lab report
- [ ] Lab report: before/after comparison of the fixed retrieval gap

## Week 04 Knowledge Check

1. **(Module 07)** A developer suggests: "Instead of approved views, let's use row-level security (RLS) in SQL Server so the AI can query any table, but only see its authorized rows." What are two reasons the approved view approach is still preferred over RLS alone for this use case?

2. **(Module 07)** You have a teacher asking "Which of my Grade 3 students has the worst attendance?" Explain exactly why this question cannot be answered with the view catalog as designed — and what the correct response to the teacher should be.

3. **(Module 08)** You add a new view `vw_GraduationRateBySchool` to the SQL catalog. List the three specific fields in the metadata document that are most critical for the RAG pipeline to work correctly, and explain what happens to the pipeline if any one of them is missing or wrong.

4. **(Lab 04a)** Your permission test shows `vw_AttendanceSummaryBySchoolAndGrade` SUCCEEDS but `vw_DataQualityFlags` FAILS for `ai_svc_readonly`. What is the most likely cause, and what SQL do you run to fix it?

5. **(Lab 04b)** After running your retrieval tests, a teacher asking "What is the difference between Tier 2 and Tier 3?" gets a view document as the top result instead of a business-rule document. Describe two changes you could make to the metadata content to fix this retrieval.

## Time Log (Optional)

| Activity | Estimated | Actual |
|----------|-----------|--------|
| Module 07 | 2.5 hrs | |
| Module 08 | 2.5 hrs | |
| Lab 04a | 2.5–3 hrs | |
| Lab 04b | 2.5–3 hrs | |
| **Total** | **10–11 hrs** | |

*When all items above are checked, proceed to Week 05.*
