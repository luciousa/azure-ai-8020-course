# Lab 03a — Build the AI Search Index

**Week:** 3 | **Estimated time:** 2.5–3 hours  
**Prerequisites:** Lab 01a complete; Module 06 read; AI Search resource provisioned  
**Deliverable:** Populated AI Search index with district metadata; working search queries

## Lab Objectives

1. Create the `susd-metadata-v1` AI Search index using the schema from Module 06.
2. Author district metadata documents for the approved view catalog and data dictionary.
3. Generate embeddings for each document using `text-embedding-3-small`.
4. Upload all documents to the index.
5. Test keyword, vector, and hybrid search queries.
6. Verify that role-based security trimming works correctly.

## Part 1 — Create the Index

### Using Python

```bash
python scripts/lab03a_create_index.py
```

Expected output:
```
Index 'susd-metadata-v1' created/updated with 10 fields.
```

### Using .NET

```csharp
// Labs/Lab03a/Lab03aRunner.cs
using Azure.Search.Documents.Indexes;
using Azure;
using DotNetEnv;

namespace SusdAiLabs.Labs.Lab03a;

public static class Lab03aRunner
{
    public static async Task RunAsync()
    {
        Env.Load(".env.local");

        var indexClient = new SearchIndexClient(
            new Uri(Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT")!),
            new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_SEARCH_KEY")!));

        var index = SearchIndexDefinition.CreateIndex();

        // Create or update (idempotent)
        var result = await indexClient.CreateOrUpdateIndexAsync(index);
        Console.WriteLine($"Index '{result.Value.Name}' created with {result.Value.Fields.Count} fields.");
    }
}
```

## Part 2 — Author Metadata Documents

The metadata catalog represents the knowledge base about the district's data system. Author documents for each category.

### Approved View Descriptions (9 documents)

```python
# scripts/lab03a_metadata_documents.py
"""
District metadata catalog documents for susd-metadata-v1 index.
Each document represents one chunk of knowledge about SUSD data.
"""
from datetime import datetime, timezone

LAST_UPDATED = datetime.now(timezone.utc).isoformat()

METADATA_DOCUMENTS = [
    # ── ATTENDANCE VIEWS ──────────────────────────────────────────────────────
    {
        "id": "view-attendance-by-student-term",
        "title": "vw_AttendanceSummaryByStudentAndTerm",
        "content": (
            "View: vw_AttendanceSummaryByStudentAndTerm\n"
            "Domain: Attendance\n"
            "Description: Provides term-level attendance summary for individual students. "
            "Returns one row per student per term with days enrolled, days present, "
            "attendance rate (percentage), and chronic absenteeism flag (True if absent "
            "10% or more of enrolled days).\n"
            "Parameters accepted: SchoolID (required), SchoolYear (required), "
            "TermID (optional), GradeLevel (optional)\n"
            "Authorized roles: teacher (own students only), school_admin (all students "
            "at their school), district_admin (all schools)\n"
            "Use for: Questions about individual student attendance within a school, "
            "teacher questions about their roster's attendance, school-level student "
            "attendance drilldown.\n"
            "Do NOT use for: District-wide attendance comparisons (use vw_AttendanceSummaryBySchoolAndGrade)."
        ),
        "category": "view",
        "domain": "attendance",
        "view_name": "vw_AttendanceSummaryByStudentAndTerm",
        "parameters": "SchoolID (required), SchoolYear (required), TermID (optional), GradeLevel (optional)",
        "role_scope": ["teacher", "school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "view-attendance-by-school-grade",
        "title": "vw_AttendanceSummaryBySchoolAndGrade",
        "content": (
            "View: vw_AttendanceSummaryBySchoolAndGrade\n"
            "Domain: Attendance\n"
            "Description: Provides aggregate attendance summary by school and grade level. "
            "Returns one row per school/grade/term combination with total enrollment, "
            "average attendance rate, count of chronically absent students, and "
            "chronic absenteeism rate. Does not contain individual student data.\n"
            "Parameters accepted: SchoolYear (required), SchoolID (optional), "
            "TermID (optional), GradeLevel (optional)\n"
            "Authorized roles: school_admin (own school), district_admin (all schools)\n"
            "Use for: School-level attendance comparisons by grade, identifying grades "
            "with attendance concerns, district-wide attendance trends.\n"
            "Do NOT use for: Individual student queries (use vw_AttendanceSummaryByStudentAndTerm)."
        ),
        "category": "view",
        "domain": "attendance",
        "view_name": "vw_AttendanceSummaryBySchoolAndGrade",
        "parameters": "SchoolYear (required), SchoolID (optional), TermID (optional), GradeLevel (optional)",
        "role_scope": ["school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },

    # ── ASSESSMENT VIEWS ──────────────────────────────────────────────────────
    {
        "id": "view-local-assessment-by-school-grade",
        "title": "vw_LocalAssessmentResultsBySchoolAndGrade",
        "content": (
            "View: vw_LocalAssessmentResultsBySchoolAndGrade\n"
            "Domain: Assessment\n"
            "Description: Provides local (district-administered) assessment results "
            "aggregated by school, grade, and subject. Returns count of students assessed, "
            "average score, and count/percentage at each performance level "
            "(Below Basic, Basic, Proficient, Advanced). No individual student scores.\n"
            "Parameters: SchoolYear (required), SchoolID (optional), GradeLevel (optional), "
            "SubjectArea (optional: 'ELA', 'Math', 'Science', 'Social Studies'), "
            "AssessmentWindow (optional: 'BOY', 'MOY', 'EOY')\n"
            "Authorized roles: school_admin (own school), district_admin (all schools)\n"
            "Use for: School assessment performance by grade and subject, proficiency rates, "
            "year-over-year comparisons at the school/grade level."
        ),
        "category": "view",
        "domain": "assessment",
        "view_name": "vw_LocalAssessmentResultsBySchoolAndGrade",
        "parameters": "SchoolYear (required), SchoolID (optional), GradeLevel (optional), SubjectArea (optional), AssessmentWindow (optional)",
        "role_scope": ["school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "view-state-assessment-by-school-grade",
        "title": "vw_StateAssessmentSummaryBySchoolAndGrade",
        "content": (
            "View: vw_StateAssessmentSummaryBySchoolAndGrade\n"
            "Domain: Assessment\n"
            "Description: Provides state assessment (Florida FAST / FSA) results aggregated "
            "by school and grade. Returns total tested, percent at each achievement level "
            "(Level 1-5), and percent at or above grade level (Level 3+). "
            "Data is uploaded annually after state release — not real-time.\n"
            "Parameters: SchoolYear (required), SchoolID (optional), GradeLevel (optional), "
            "SubjectArea (optional: 'ELA', 'Math')\n"
            "Authorized roles: school_admin (own school), district_admin (all schools)\n"
            "Use for: State accountability comparisons, year-over-year proficiency trends, "
            "cross-school comparisons of state performance."
        ),
        "category": "view",
        "domain": "assessment",
        "view_name": "vw_StateAssessmentSummaryBySchoolAndGrade",
        "parameters": "SchoolYear (required), SchoolID (optional), GradeLevel (optional), SubjectArea (optional)",
        "role_scope": ["school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "view-assessment-gap-by-subgroup",
        "title": "vw_AssessmentGapBySubgroup",
        "content": (
            "View: vw_AssessmentGapBySubgroup\n"
            "Domain: Assessment\n"
            "Description: Provides proficiency rates by student subgroup for equity gap analysis. "
            "Returns proficiency rate by school, grade, subject, and subgroup category "
            "(economically disadvantaged, ELL, students with disabilities, race/ethnicity). "
            "Enables comparison between subgroups and the overall rate.\n"
            "Parameters: SchoolYear (required), SchoolID (optional), GradeLevel (optional), "
            "SubjectArea (optional), SubgroupCategory (optional)\n"
            "Authorized roles: school_admin (own school), district_admin (all schools)\n"
            "Use for: Equity analysis, achievement gap identification, subgroup-disaggregated "
            "reporting. FERPA note: subgroup results suppressed when n < 10."
        ),
        "category": "view",
        "domain": "assessment",
        "view_name": "vw_AssessmentGapBySubgroup",
        "parameters": "SchoolYear (required), SchoolID (optional), GradeLevel (optional), SubjectArea (optional), SubgroupCategory (optional)",
        "role_scope": ["school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "view-performance-vs-benchmark",
        "title": "vw_PerformanceVsBenchmark",
        "content": (
            "View: vw_PerformanceVsBenchmark\n"
            "Domain: Benchmark\n"
            "Description: Compares actual assessment results to district-defined performance "
            "benchmarks. Returns proficiency rate, benchmark target, and variance (+/-) "
            "for each school/grade/subject combination. Includes benchmark status: "
            "At/Above Target, Near Target, Below Target.\n"
            "Parameters: SchoolYear (required), SchoolID (optional), GradeLevel (optional), "
            "SubjectArea (optional)\n"
            "Authorized roles: school_admin (own school), district_admin (all schools)\n"
            "Use for: Performance gap analysis against targets, accountability tracking, "
            "identifying schools or grades where additional support is needed."
        ),
        "category": "view",
        "domain": "benchmark",
        "view_name": "vw_PerformanceVsBenchmark",
        "parameters": "SchoolYear (required), SchoolID (optional), GradeLevel (optional), SubjectArea (optional)",
        "role_scope": ["school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "view-longitudinal-proficiency-trend",
        "title": "vw_LongitudinalProficiencyTrend",
        "content": (
            "View: vw_LongitudinalProficiencyTrend\n"
            "Domain: Assessment\n"
            "Description: Provides multi-year proficiency trend data by school and subject. "
            "Returns proficiency rate for each school/grade/subject combination across "
            "up to 5 years, enabling trend analysis and rate-of-change calculation.\n"
            "Parameters: SchoolID (optional), SubjectArea (optional), "
            "StartYear (optional), EndYear (optional)\n"
            "Authorized roles: school_admin (own school), district_admin (all schools)\n"
            "Use for: Multi-year trend analysis, determining if performance is improving "
            "or declining, presenting trajectory data for leadership reporting."
        ),
        "category": "view",
        "domain": "assessment",
        "view_name": "vw_LongitudinalProficiencyTrend",
        "parameters": "SchoolID (optional), SubjectArea (optional), StartYear (optional), EndYear (optional)",
        "role_scope": ["school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "view-intervention-student-summary",
        "title": "vw_InterventionStudentSummary",
        "content": (
            "View: vw_InterventionStudentSummary\n"
            "Domain: Intervention\n"
            "Description: Provides aggregated summary of student intervention participation "
            "by school, tier, and program. Returns count of students in each tier "
            "(Tier 1, Tier 2, Tier 3), attendance rate by tier, and program participation "
            "counts. Does not return individual student intervention details.\n"
            "Parameters: SchoolID (required), SchoolYear (required), TierLevel (optional)\n"
            "Authorized roles: school_admin (own school), district_admin (all schools)\n"
            "Use for: School-level intervention program participation, tier distribution, "
            "comparing attendance rates across tiers, program enrollment counts."
        ),
        "category": "view",
        "domain": "intervention",
        "view_name": "vw_InterventionStudentSummary",
        "parameters": "SchoolID (required), SchoolYear (required), TierLevel (optional)",
        "role_scope": ["school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "view-data-quality-flags",
        "title": "vw_DataQualityFlags",
        "content": (
            "View: vw_DataQualityFlags\n"
            "Domain: Data Quality\n"
            "Description: Identifies potential data quality issues in attendance and assessment "
            "records. Returns count of anomalies by school and category: impossible dates, "
            "enrollment without attendance records, out-of-range assessment scores, and "
            "attendance rates above 100% (data entry error indicator).\n"
            "Parameters: SchoolID (optional), SchoolYear (optional), IssueCategory (optional)\n"
            "Authorized roles: school_admin (own school), district_admin (all schools)\n"
            "Use for: Data quality monitoring, identifying schools needing data review, "
            "pre-analysis data validation."
        ),
        "category": "view",
        "domain": "data-quality",
        "view_name": "vw_DataQualityFlags",
        "parameters": "SchoolID (optional), SchoolYear (optional), IssueCategory (optional)",
        "role_scope": ["school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },

    # ── BUSINESS RULE DEFINITIONS ─────────────────────────────────────────────
    {
        "id": "biz-rule-chronically-absent",
        "title": "Business Rule: Chronically Absent",
        "content": (
            "Term: Chronically Absent\n"
            "Definition: A student is chronically absent in SUSD data when they have "
            "missed 10% or more of the school days they were enrolled during a given "
            "period (term or school year). This includes both excused and unexcused "
            "absences. For a standard 180-day school year, this equals 18 or more days.\n"
            "Source: SUSD Student Attendance Policy AR 5113 / Florida Statute 1003.26\n"
            "Field in data: IsChronicallyAbsent (boolean), ChronicallyAbsentRate (percentage)\n"
            "Note: The threshold is applied per enrollment period. A student who transfers "
            "mid-year is evaluated against their days enrolled at each school separately."
        ),
        "category": "business-rule",
        "domain": "attendance",
        "view_name": None,
        "parameters": None,
        "role_scope": ["teacher", "school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "biz-rule-proficiency-levels",
        "title": "Business Rule: Assessment Proficiency Levels",
        "content": (
            "Term: Proficiency Levels (Local Assessment)\n"
            "SUSD local assessments use a 4-level performance scale:\n"
            "  Level 1 - Below Basic: Student demonstrates minimal understanding; "
            "significant intervention required.\n"
            "  Level 2 - Basic: Student demonstrates partial understanding; "
            "some support needed.\n"
            "  Level 3 - Proficient: Student demonstrates grade-level proficiency; "
            "meets district standards.\n"
            "  Level 4 - Advanced: Student demonstrates above grade-level understanding.\n"
            "Proficiency is defined as Level 3 or above (Levels 3+).\n"
            "District proficiency target: 75% of students at Level 3+ per school/grade/subject.\n"
            "State assessment levels (Florida FAST): Levels 1-5; proficiency = Level 3+."
        ),
        "category": "business-rule",
        "domain": "assessment",
        "view_name": None,
        "parameters": None,
        "role_scope": ["teacher", "school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "biz-rule-intervention-tiers",
        "title": "Business Rule: Multi-Tiered Support System (MTSS) Tiers",
        "content": (
            "Term: Intervention Tiers (MTSS)\n"
            "Sunlake Unified uses a three-tier support model:\n"
            "  Tier 1 - Universal Support: Core instruction for all students. "
            "All students receive Tier 1. Attendance and assessment benchmarks monitored.\n"
            "  Tier 2 - Targeted Support: Small-group intervention for students not "
            "meeting benchmarks. Typically 15-20% of students. Examples: reading groups, "
            "math intervention blocks, check-in/check-out attendance programs.\n"
            "  Tier 3 - Intensive Support: Individualized intervention for students "
            "significantly below grade level. Typically 3-5% of students. May include "
            "special education referral, intensive tutoring, or alternative programming.\n"
            "Tier assignment is reviewed quarterly at Student Support Team meetings."
        ),
        "category": "business-rule",
        "domain": "intervention",
        "view_name": None,
        "parameters": None,
        "role_scope": ["teacher", "school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "biz-rule-school-year",
        "title": "Business Rule: School Year Identifier",
        "content": (
            "Term: School Year Identifier\n"
            "SUSD uses end-year notation for school years. The 2025-26 school year "
            "is identified as SchoolYear = 2026.\n"
            "Terms within a school year: Q1 (August-October), Q2 (November-January), "
            "Q3 (February-March), Q4 (April-June). End of year (EOY) refers to the "
            "full school year aggregate.\n"
            "Current school year: 2025-26 (SchoolYear = 2026). "
            "Data available back to 2022-23 (SchoolYear = 2023) in the data warehouse."
        ),
        "category": "business-rule",
        "domain": "attendance",
        "view_name": None,
        "parameters": None,
        "role_scope": ["teacher", "school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },

    # ── DOMAIN OVERVIEW ───────────────────────────────────────────────────────
    {
        "id": "domain-overview-attendance",
        "title": "Data Domain Overview: Attendance",
        "content": (
            "Data Domain: Attendance\n"
            "What it covers: Daily student attendance records aggregated at term and "
            "school-year level. Includes present days, absent days (excused and unexcused), "
            "and chronic absenteeism status.\n"
            "Data refresh: Nightly from the student information system (SIS).\n"
            "Approved views: vw_AttendanceSummaryByStudentAndTerm (student-level), "
            "vw_AttendanceSummaryBySchoolAndGrade (aggregate).\n"
            "Key metrics: Attendance rate (%), chronically absent count, "
            "chronic absenteeism rate (%), average unexcused absences.\n"
            "Access restrictions: Teachers see their own students. School admins see "
            "their school. District admins see all schools.\n"
            "FERPA note: Student-level attendance data is a student education record. "
            "Aggregated data (10+ students) does not identify individuals."
        ),
        "category": "domain-overview",
        "domain": "attendance",
        "view_name": None,
        "parameters": None,
        "role_scope": ["teacher", "school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
    {
        "id": "domain-overview-assessment",
        "title": "Data Domain Overview: Assessment",
        "content": (
            "Data Domain: Assessment\n"
            "What it covers: Local (district-administered) and state assessment results. "
            "Local assessments include Beginning of Year (BOY), Middle of Year (MOY), "
            "and End of Year (EOY) tests in ELA, Math, Science, and Social Studies "
            "for grades 3-12. State assessments include Florida FAST (ELA, Math, grades 3-10).\n"
            "Data refresh: Local = within 48 hours of scoring. State = annual, after "
            "official release.\n"
            "Approved views: vw_LocalAssessmentResultsBySchoolAndGrade, "
            "vw_StateAssessmentSummaryBySchoolAndGrade, vw_AssessmentGapBySubgroup, "
            "vw_LongitudinalProficiencyTrend.\n"
            "Key metrics: Proficiency rate (% at Level 3+), average score, "
            "performance level distribution.\n"
            "FERPA note: Individual student assessment scores are education records. "
            "All views return aggregated data only. Small groups (<10 students) are suppressed."
        ),
        "category": "domain-overview",
        "domain": "assessment",
        "view_name": None,
        "parameters": None,
        "role_scope": ["teacher", "school_admin", "district_admin"],
        "last_updated": LAST_UPDATED,
    },
]

print(f"Authored {len(METADATA_DOCUMENTS)} metadata documents.")
print("Document IDs:")
for doc in METADATA_DOCUMENTS:
    print(f"  {doc['id']} ({doc['category']}, {doc['domain']})")
```

## Part 3 — Generate Embeddings and Upload

```python
# scripts/lab03a_ingest.py
"""
Ingest district metadata documents into susd-metadata-v1 AI Search index.
Generates embeddings using text-embedding-3-small and uploads all documents.
"""
import os, time
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

# Import documents from the documents file
import sys
sys.path.insert(0, "scripts")
from lab03a_metadata_documents import METADATA_DOCUMENTS

load_dotenv(".env.local")

openai_client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version=os.environ["AZURE_OPENAI_API_VERSION"],
)

search_client = SearchClient(
    endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
    index_name="susd-metadata-v1",
    credential=AzureKeyCredential(os.environ["AZURE_SEARCH_KEY"]),
)

def generate_embeddings(texts: list[str], batch_size: int = 16) -> list[list[float]]:
    """Generate embeddings in batches to respect rate limits."""
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = openai_client.embeddings.create(
            model=os.environ["AZURE_OPENAI_EMBEDDING_DEPLOYMENT"],
            input=batch,
        )
        all_embeddings.extend([item.embedding for item in response.data])
        if i + batch_size < len(texts):
            time.sleep(0.5)  # Respect rate limits
    return all_embeddings

# 1. Extract text to embed (content field)
texts_to_embed = [doc["content"] for doc in METADATA_DOCUMENTS]
print(f"Generating embeddings for {len(texts_to_embed)} documents...")
embeddings = generate_embeddings(texts_to_embed)
print(f"Generated {len(embeddings)} embeddings (dimensions: {len(embeddings[0])})")

# 2. Attach embeddings to documents
documents_to_upload = []
for doc, embedding in zip(METADATA_DOCUMENTS, embeddings):
    doc_with_vector = {**doc, "content_vector": embedding}
    documents_to_upload.append(doc_with_vector)

# 3. Upload to AI Search
print(f"\nUploading {len(documents_to_upload)} documents to 'susd-metadata-v1'...")
result = search_client.upload_documents(documents=documents_to_upload)

succeeded = sum(1 for r in result if r.succeeded)
failed = sum(1 for r in result if not r.succeeded)

print(f"Upload complete: {succeeded} succeeded, {failed} failed")
if failed > 0:
    for r in result:
        if not r.succeeded:
            print(f"  FAILED: {r.key} — {r.error_message}")
```

Run:

```bash
python scripts/lab03a_ingest.py
```

Expected output:
```
Authored 15 metadata documents.
Generating embeddings for 15 documents...
Generated 15 embeddings (dimensions: 1536)

Uploading 15 documents to 'susd-metadata-v1'...
Upload complete: 15 succeeded, 0 failed
```

## Part 4 — Test Search Queries

```python
# scripts/lab03a_search_test.py
"""Test search queries against the populated index."""
import os
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from azure.core.credentials import AzureKeyCredential
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv(".env.local")

search_client = SearchClient(
    endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
    index_name="susd-metadata-v1",
    credential=AzureKeyCredential(os.environ["AZURE_SEARCH_KEY"]),
)

openai_client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version=os.environ["AZURE_OPENAI_API_VERSION"],
)

def embed(text: str) -> list[float]:
    return openai_client.embeddings.create(
        model=os.environ["AZURE_OPENAI_EMBEDDING_DEPLOYMENT"],
        input=text,
    ).data[0].embedding

def search(query: str, user_role: str, top_k: int = 3, domain: str | None = None):
    vector = embed(query)
    filter_parts = [f"role_scope/any(r: r eq '{user_role}')"]
    if domain:
        filter_parts.append(f"domain eq '{domain}'")

    results = search_client.search(
        search_text=query,
        vector_queries=[VectorizedQuery(
            vector=vector, k_nearest_neighbors=top_k, fields="content_vector")],
        filter=" and ".join(filter_parts),
        select=["id", "title", "category", "domain", "view_name"],
        top=top_k,
    )
    return list(results)

# ── Test 1: Attendance question as school_admin ───────────────────────────────
print("=== Test 1: Attendance (school_admin) ===")
results = search("What is the attendance rate for Grade 3?", "school_admin")
for r in results:
    print(f"  [{r['@search.score']:.4f}] {r['title']} ({r['category']}, {r['domain']})")

# ── Test 2: Same question as teacher ─────────────────────────────────────────
print("\n=== Test 2: Attendance (teacher) ===")
results = search("What is the attendance rate for Grade 3?", "teacher")
for r in results:
    print(f"  [{r['@search.score']:.4f}] {r['title']} ({r['category']}, {r['domain']})")

# ── Test 3: Definition question (all roles should see this) ──────────────────
print("\n=== Test 3: Definition — chronically absent ===")
results = search("What does chronically absent mean?", "teacher")
for r in results:
    print(f"  [{r['@search.score']:.4f}] {r['title']} ({r['category']})")

# ── Test 4: Security trimming — teacher asking district-only question ─────────
print("\n=== Test 4: Security trimming (teacher asking for district-wide) ===")
results = search("District-wide cross-school comparison proficiency", "teacher")
print(f"  Results returned: {len(results)}")
for r in results:
    print(f"  [{r['@search.score']:.4f}] {r['title']} (role_scope includes teacher?)")

# ── Test 5: Domain filter ─────────────────────────────────────────────────────
print("\n=== Test 5: Intervention domain filter (school_admin) ===")
results = search("How many students are in Tier 2?", "school_admin", domain="intervention")
for r in results:
    print(f"  [{r['@search.score']:.4f}] {r['title']} ({r['category']}, {r['domain']})")

print("\nAll search tests complete.")
```

Run:

```bash
python scripts/lab03a_search_test.py
```

## Part 5 — Verify Security Trimming

Record the results from Test 4 in your lab report. Answer:

1. For "District-wide cross-school comparison proficiency" queried as a `teacher`, which documents returned? Were any of them view descriptions with `role_scope` of only `["school_admin", "district_admin"]`?
2. If a teacher receives only business-rule and domain-overview documents (which have `role_scope = ["teacher", "school_admin", "district_admin"]`) but no view descriptions scoped to admins only — is that correct behavior? Why?

## Lab Deliverables

1. **`susd-metadata-v1` index** created and populated with all documents
2. **Search test output** — pasted into lab report
3. **Lab report section** answering:
   - How many documents are in the index?
   - Which query returned the highest-scoring result? What was the score?
   - Did security trimming work correctly for the teacher role? What was returned vs. what should not be returned?
   - What would you add to the metadata catalog to improve retrieval for intervention questions?

## Lab Completion Checklist

- [ ] Index `susd-metadata-v1` created (no errors)
- [ ] All 15 metadata documents uploaded successfully
- [ ] Embedding dimensions verified (1536)
- [ ] Test 1 (attendance, school_admin) returns at least the correct view description
- [ ] Test 2 (attendance, teacher) returns the student-level view and business rules
- [ ] Test 3 (definition) returns the chronically absent business rule as top result
- [ ] Test 4 (security trimming) confirmed — district-only views not returned for teacher
- [ ] Test 5 (domain filter) confirmed — only intervention documents returned
- [ ] Lab report section completed

*Next: Lab 03b — RAG Pipeline*
