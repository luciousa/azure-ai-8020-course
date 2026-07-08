# Module 08 — Metadata and Semantic Layers

**Week:** 4 | **Estimated time:** 2.5–3 hours  
**Prerequisites:** Module 07 (SQL Server Integration); Lab 03a (AI Search index built)  
**Builds toward:** Lab 04b (Metadata catalog), Week 5 (.NET API orchestration)

## Learning Objectives

By the end of this module you will be able to:

1. Explain the difference between a data dictionary, a semantic layer, and a metadata catalog.
2. Design a metadata catalog that maps natural-language questions to approved views.
3. Write rich metadata document content that improves AI Search retrieval accuracy.
4. Define business rules, glossary terms, and FAQ entries as searchable knowledge chunks.
5. Explain how the metadata catalog drives view selection in the RAG pipeline.
6. Identify gaps in a metadata catalog that would cause retrieval failures.

## Three Concepts: Data Dictionary, Semantic Layer, Metadata Catalog

These three terms are related but distinct:

### Data Dictionary

A data dictionary documents the technical schema: table names, column names, data types, constraints, foreign keys. It answers "what does this column mean?"

Example:
```
Table: fact_Attendance
Column: IsChronicallyAbsent
Type: BIT
Definition: 1 if the student missed 10% or more of enrolled days in the period
Source: Calculated at load time from DaysAbsent / DaysEnrolled
```

A data dictionary is useful for SQL developers. An AI model cannot directly use a raw data dictionary to answer "How many students are chronically absent?" — it needs to know which view to query, what parameters to use, and what the result means in plain English.

### Semantic Layer

A semantic layer sits between raw data and users, providing business-friendly names and definitions for metrics and dimensions. Traditional BI tools (e.g., LookML in Looker, SSAS OLAP cubes) implement semantic layers.

For this course, the approved view catalog serves as the semantic layer: each view represents a pre-defined, business-approved aggregation with stable field names and definitions.

### Metadata Catalog (for AI Retrieval)

The metadata catalog is what the AI Search index contains: structured documents that describe the data system in terms an AI can retrieve and use. It combines elements of the data dictionary and semantic layer, but written specifically to support natural-language question answering.

**Key difference:** A metadata catalog is authored to be retrieved by a vector similarity search, then read by an LLM. Its content must be written so that semantically similar questions retrieve the right documents.

## What Makes a Good Metadata Document

Good metadata documents for AI retrieval share three qualities:

### 1. Rich in Synonyms and Alternate Phrasings

The same concept appears in many forms in natural language. A good metadata document includes the variants:

```
❌ Poor:
Title: vw_AttendanceSummaryBySchoolAndGrade
Content: Returns attendance data by school and grade.

✅ Better:
Title: vw_AttendanceSummaryBySchoolAndGrade — School-Level Attendance Summary
Content: This view provides school-level and grade-level attendance summaries. 
Use this when asked about: attendance rates, chronic absenteeism, how often 
students are present, absence rates, how many students are missing school, 
attendance percentages, daily attendance data, and whether students are 
chronically absent. Returns one row per school/grade/term with attendance 
rate percentage and chronically absent count.
```

The "poor" example will miss queries like "How often are kids missing school?" The "better" example has synonym coverage.

### 2. Explicit About What It Does and Does NOT Cover

```
✅ Explicit scope:
Use for: School-level attendance comparisons by grade and term.
Do NOT use for: Individual student attendance (use vw_AttendanceSummaryByStudentAndTerm).
Do NOT use for: Cross-year trend analysis (use vw_LongitudinalProficiencyTrend).
```

This prevents the pipeline from selecting the wrong view when multiple views could match.

### 3. Includes Query Parameters With Examples

```
Parameters: 
  SchoolYear (required) — integer, use end year: 2026 for 2025-26 school year
  SchoolID (optional) — leave blank for all schools; use 'SCH001' for Palmetto Ridge
  TermID (optional) — 'Q1', 'Q2', 'Q3', 'Q4', 'EOY'; leave blank for full year
  GradeLevel (optional) — 'Grade 3', 'Grade 4', ... 'Grade 12', or 'K'

Example question this view answers:
  "What is the attendance rate for Grade 3 at Palmetto Ridge in Q1?"
  → SchoolYear=2026, SchoolID='SCH001', TermID='Q1', GradeLevel='Grade 3'
```

When the metadata document includes example question-to-parameter mappings, the orchestration layer can extract parameters more reliably.

## Metadata Catalog Structure

The full metadata catalog for the district analytics assistant has five document categories:

| Category | Purpose | Count |
|----------|---------|-------|
| `view` | Describes an approved view (view name, purpose, parameters, example questions, what it does/does not cover) | 9 (one per view) |
| `business-rule` | Defines a business rule or threshold (chronic absenteeism = 10%, proficiency = Level 3+, tier definitions) | 10–15 |
| `domain-overview` | Introduces a data domain (what attendance data covers, refresh cadence, access restrictions) | 5–6 |
| `faq` | Question-answer pairs for common questions that don't require data retrieval | 10–20 |
| `glossary` | Definitions of terms that appear in questions but may be ambiguous | 10–15 |

### FAQ Documents

FAQ entries answer questions that the AI can answer without SQL data — definitional, policy, or help questions:

```python
{
    "id": "faq-data-refresh-schedule",
    "title": "FAQ: When is attendance data refreshed?",
    "content": (
        "Question: When is attendance data updated? How current is the data?\n"
        "Answer: Attendance data in the SUSD data warehouse is refreshed nightly, "
        "typically completing between 2:00 AM and 4:00 AM. Data you see reflects "
        "the previous business day's attendance records.\n"
        "For example, if today is October 10, the most recent data will reflect "
        "October 9. Weekend days are included (showing 0 absent if school was not "
        "in session). Assessment data is refreshed within 48 hours of scoring for "
        "local assessments; state assessment data is loaded annually after official "
        "state release.\n"
        "Alternate question forms: How old is the data? Is this real-time? "
        "How often does the attendance data update?"
    ),
    "category": "faq",
    "domain": "attendance",
    "role_scope": ["teacher", "school_admin", "district_admin"],
}

{
    "id": "faq-who-can-see-what",
    "title": "FAQ: What data can each role access?",
    "content": (
        "Question: What data am I authorized to see? What can a teacher see vs. a "
        "school administrator?\n"
        "Answer:\n"
        "Teacher access: Attendance and assessment data for students on your "
        "assigned roster only. You cannot see data for students in other teachers' "
        "sections or for other schools.\n"
        "School Administrator access: All attendance, assessment, and intervention "
        "data for your school. You can see all grades and all students at your "
        "school. You cannot see data for other schools.\n"
        "District Administrator access: All data for all schools and all students "
        "across the district.\n"
        "Access scope is determined by your account in the district directory and "
        "cannot be changed through this interface."
    ),
    "category": "faq",
    "domain": "attendance",
    "role_scope": ["teacher", "school_admin", "district_admin"],
}
```

### Glossary Documents

Glossary entries handle terminology that users may phrase in different ways:

```python
{
    "id": "glossary-assessment-window",
    "title": "Glossary: Assessment Window (BOY, MOY, EOY)",
    "content": (
        "Term: Assessment Window\n"
        "The three testing periods in the SUSD assessment calendar:\n"
        "  BOY (Beginning of Year): Administered in August-September. "
        "Establishes baseline for each student. Also called 'fall assessment' or 'diagnostic.'\n"
        "  MOY (Middle of Year): Administered in January-February. "
        "Mid-year progress check. Also called 'winter assessment' or 'mid-year screener.'\n"
        "  EOY (End of Year): Administered in April-May. "
        "Final proficiency measure. Also called 'spring assessment' or 'summative.'\n"
        "In data queries, use 'BOY', 'MOY', or 'EOY' as the AssessmentWindow parameter."
    ),
    "category": "glossary",
    "domain": "assessment",
    "role_scope": ["teacher", "school_admin", "district_admin"],
}
```

## How the Metadata Catalog Drives View Selection

The metadata retrieval step (Stage 3a in the RAG pipeline) does more than return context — it drives the SQL query decision.

### The Mapping Problem

The question "Are Grade 5 students at Palmetto Ridge keeping up on ELA?" needs to be mapped to:
- View: `vw_LocalAssessmentResultsBySchoolAndGrade`
- Parameters: `SchoolYear=2026, SchoolID='SCH001', GradeLevel='Grade 5', SubjectArea='ELA'`

The metadata document for this view includes both:
1. The view name explicitly (`view_name` field)
2. Example questions that semantically match the user's natural language

When the AI Search retrieval step returns the view description document as the top result, the `view_name` field tells the orchestration layer which SQL function to call.

### Parameter Extraction

After identifying the view, the orchestration layer extracts parameters from:

1. **User context** (from Entra ID token): `SchoolID`, `SchoolYear`, current `TermID`
2. **The user's question**: grade level ("Grade 5"), subject ("ELA"), time period references
3. **The metadata document**: default values and parameter patterns

In the early POC (Python prototype), parameter extraction is explicit — the code parses common grade-level and subject patterns. In the full .NET API (Week 5), this is more structured using the LLM to extract parameters as structured JSON before calling SQL.

## Semantic Layer Design: Consistent Field Naming

Every view in the approved catalog should use consistent field names for the same concepts. This helps the AI learn the vocabulary and reduces ambiguity.

| Concept | Consistent Field Name | Notes |
|---------|----------------------|-------|
| School identifier | `SchoolID` | Short code, e.g., "SCH001" |
| School long name | `SchoolName` | Full name, e.g., "Palmetto Ridge Elementary" |
| Academic year | `SchoolYear` | End year, e.g., 2026 for 2025-26 |
| Term/quarter | `TermID` | "Q1", "Q2", "Q3", "Q4", "EOY" |
| Grade | `GradeLevel` | "K", "Grade 1" through "Grade 12" |
| Attendance rate | `AttendanceRate` | Decimal as percentage (89.3 = 89.3%) |
| Proficiency rate | `PctProficientOrAbove` | Decimal as percentage |
| Assessment subject | `SubjectArea` | "ELA", "Math", "Science", "Social Studies" |

When field names are consistent, the AI can recognize them across different views and correctly interpret values without domain-specific training.

## Reflection Questions

1. A teacher asks "How are my kids doing on reading?" — describe the metadata retrieval step: what documents would you expect to retrieve, and why?
2. A user asks "What is the FCAT score for Grade 4?" — FCAT was a Florida test discontinued in 2015 and replaced by FAST. How should your metadata catalog handle this, and what should the AI respond?
3. You add a new view `vw_GraduationRateBySchool` to the SQL catalog. What metadata document must you create before this view is useful in the RAG pipeline?
4. Your search tests show that questions about "intervention" frequently retrieve assessment view descriptions as the top result. What would you change in the metadata documents to fix this?

## References

- [Azure AI Search — designing indexes for RAG](https://learn.microsoft.com/azure/search/retrieval-augmented-generation-overview)
- [Data catalog best practices — Microsoft](https://learn.microsoft.com/azure/data-catalog/data-catalog-best-practices)
- [Semantic layer concepts (dbt)](https://docs.getdbt.com/docs/build/metricflow-time-spine)
- [FERPA data aggregation guidance](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/PTAC-FAQs%20Disclosure%20Avoidance.pdf)

*Next: Lab 04a — Approved Views*
