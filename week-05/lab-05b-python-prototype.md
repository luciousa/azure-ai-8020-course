# Lab 05b — Python Prototype: RAG Pipeline End-to-End

**Week:** 5 | **Lab:** 05b | **Estimated time:** 2.5–3 hours  
**Prerequisites:** Module 10 (Python prototyping); Lab 05a (.NET API)  
**Builds toward:** Week 7 (evaluation harness)

## Lab Objectives

1. Build the Python prototype from Module 10 as a runnable project.
2. Implement SQL handlers for the remaining 7 view stubs.
3. Validate that LLM-based parameter extraction outperforms keyword matching.
4. Run the evaluation harness against 12 test questions and record scores.
5. Identify at least 2 pipeline improvements and document them.
6. Complete the Python–to–.NET handoff checklist.

## Part 1 — Project Setup

### 1.1 Create the prototype directory

```bash
# From your course working directory
mkdir -p prototype/scripts
cd prototype
```

### 1.2 Create requirements.txt

```text
openai>=1.40.0
azure-search-documents>=11.6.1
azure-identity>=1.17.1
pyodbc>=5.1.0
pandas>=2.2.0
python-dotenv>=1.0.1
```

Install:

```bash
pip install -r requirements.txt
```

### 1.3 Create .env.local

```bash
# .env.local (never commit this file)
AZURE_OPENAI_ENDPOINT=https://YOUR_OPENAI.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

AZURE_SEARCH_ENDPOINT=https://YOUR_SEARCH.search.windows.net
AZURE_SEARCH_API_KEY=your-key-here
AZURE_SEARCH_INDEX=susd-metadata-v1

SQL_SERVER=localhost
SQL_DATABASE=SunlakeUnifiedDW
SQL_USER=ai_svc_readonly
SQL_PASSWORD=your-password
```

Add `.env.local` to `.gitignore`.

### 1.4 Copy Module 10 files

Copy these files from Module 10 as-is:

- `config.py`
- `models.py`
- `security.py`
- `completion_helper.py`
- `rag_pipeline.py`
- `evaluation.py`

## Part 2 — Complete search_helper.py

Create `search_helper.py`:

```python
# search_helper.py
"""Azure AI Search hybrid retrieval with security trimming."""
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery, QueryType, SemanticSearchOptions
from azure.core.credentials import AzureKeyCredential
from config import Config
from models import MetadataResult

_openai_client = AzureOpenAI(
    azure_endpoint=Config.OPENAI_ENDPOINT,
    api_key=Config.OPENAI_API_KEY,
    api_version=Config.OPENAI_API_VERSION,
)

_search_client = SearchClient(
    endpoint=Config.SEARCH_ENDPOINT,
    index_name=Config.SEARCH_INDEX,
    credential=AzureKeyCredential(Config.SEARCH_API_KEY),
)


def _embed(text: str) -> list[float]:
    """Generate an embedding for the given text."""
    result = _openai_client.embeddings.create(
        input=text, model=Config.EMBEDDING_DEPLOYMENT
    )
    return result.data[0].embedding


def hybrid_search(question: str, role: str) -> MetadataResult | None:
    """
    Search the metadata catalog using hybrid search (BM25 + vector) with
    semantic re-ranking and security trimming on role_scope.
    Returns the top result, or None if no results found.
    """
    vector = _embed(question)
    vector_query = VectorizedQuery(
        vector=vector,
        k_nearest_neighbors=50,
        fields="content_vector",
    )

    results = _search_client.search(
        search_text=question,
        vector_queries=[vector_query],
        filter=f"role_scope/any(r: r eq '{role}')",
        query_type=QueryType.SEMANTIC,
        semantic_configuration_name="susd-semantic-v1",
        select=["id", "title", "content", "category", "view_name", "parameters"],
        top=3,
    )

    for result in results:
        return MetadataResult(
            id=result["id"],
            title=result["title"],
            content=result["content"],
            category=result["category"],
            view_name=result.get("view_name"),
            parameters=result.get("parameters"),
            score=result.get("@search.score", 0.0),
        )

    return None
```

## Part 3 — Complete db_helper.py (All 9 Views)

Extend the `db_helper.py` from Module 10 by filling in the 7 stubs:

```python
# db_helper.py — complete version with all 9 view handlers
import pyodbc
from config import Config
from models import UserContext, SqlQueryResult


def get_connection() -> pyodbc.Connection:
    return pyodbc.connect(Config.sql_connection_string())


def _execute_query(sql: str, params: list) -> list[dict]:
    """Execute a parameterized query and return rows as list of dicts."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _format_summary(rows: list[dict], domain: str) -> str:
    if not rows:
        return "No data returned for the specified parameters."
    lines = [f"Retrieved {len(rows)} row(s) of {domain} data:"]
    for row in rows[:10]:
        lines.append(", ".join(f"{k}={v}" for k, v in row.items()))
    if len(rows) > 10:
        lines.append(f"... and {len(rows) - 10} more rows.")
    return "\n".join(lines)


def dispatch_view_query(view_name: str, ctx: UserContext, params: dict) -> SqlQueryResult:
    """Route to the correct typed query handler."""
    dispatch = {
        "vw_AttendanceSummaryBySchoolAndGrade": query_attendance_by_school,
        "vw_AttendanceSummaryByStudentAndTerm": query_student_attendance,
        "vw_LocalAssessmentResultsBySchoolAndGrade": query_local_assessment,
        "vw_StateAssessmentSummaryBySchoolAndGrade": query_state_assessment,
        "vw_AssessmentGapBySubgroup": query_assessment_gap,
        "vw_PerformanceVsBenchmark": query_benchmark,
        "vw_LongitudinalProficiencyTrend": query_longitudinal,
        "vw_InterventionStudentSummary": query_intervention,
        "vw_DataQualityFlags": query_data_quality,
    }
    handler = dispatch.get(view_name)
    if handler is None:
        raise ValueError(f"No handler registered for view '{view_name}'")
    return handler(ctx, params)


# ── Attendance by School/Grade ─────────────────────────────────────────────

def query_attendance_by_school(ctx: UserContext, params: dict) -> SqlQueryResult:
    sql_parts = [
        "SELECT SchoolID, SchoolName, GradeLevel, TermID, SchoolYear, "
        "TotalEnrollment, AttendanceRate, ChronicallyAbsentCount, "
        "ChronicallyAbsentRate, AvgUnexcusedAbsences "
        "FROM vw_AttendanceSummaryBySchoolAndGrade WHERE SchoolYear = ?"
    ]
    bind = [ctx.school_year]

    if ctx.role != "district_admin" and ctx.school_id:
        sql_parts.append("AND SchoolID = ?")
        bind.append(ctx.school_id)

    if ctx.current_term_id:
        sql_parts.append("AND TermID = ?")
        bind.append(ctx.current_term_id)

    if grade := params.get("grade_level"):
        sql_parts.append("AND GradeLevel = ?")
        bind.append(grade)

    sql_parts.append("ORDER BY SchoolName, GradeLevel")
    rows = _execute_query(" ".join(sql_parts), bind)
    return SqlQueryResult("vw_AttendanceSummaryBySchoolAndGrade", rows, len(rows),
                          _format_summary(rows, "attendance by school"))


# ── Student Attendance (teacher-scoped) ───────────────────────────────────

def query_student_attendance(ctx: UserContext, params: dict) -> SqlQueryResult:
    if ctx.role == "teacher" and not ctx.section_ids:
        return SqlQueryResult("vw_AttendanceSummaryByStudentAndTerm", [], 0,
                              "No sections are associated with your account.")

    sql_parts = [
        "SELECT StudentKey, SectionID, TermID, SchoolYear, "
        "TotalDaysPresent, TotalDaysAbsent, AttendanceRate, "
        "ExcusedAbsences, UnexcusedAbsences, IsChronicallyAbsent "
        "FROM vw_AttendanceSummaryByStudentAndTerm WHERE SchoolYear = ?"
    ]
    bind = [ctx.school_year]

    if ctx.role == "teacher":
        placeholders = ",".join("?" * len(ctx.section_ids))
        sql_parts.append(f"AND SectionID IN ({placeholders})")
        bind.extend(ctx.section_ids)
    elif ctx.role == "school_admin" and ctx.school_id:
        sql_parts.append("AND SchoolID = ?")
        bind.append(ctx.school_id)

    if ctx.current_term_id:
        sql_parts.append("AND TermID = ?")
        bind.append(ctx.current_term_id)

    # Limit rows to prevent token overflow
    sql_parts.append("ORDER BY AttendanceRate ASC OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY")

    rows = _execute_query(" ".join(sql_parts), bind)
    return SqlQueryResult("vw_AttendanceSummaryByStudentAndTerm", rows, len(rows),
                          _format_summary(rows, "student attendance"))


# ── Local Assessment ───────────────────────────────────────────────────────

def query_local_assessment(ctx: UserContext, params: dict) -> SqlQueryResult:
    sql_parts = [
        "SELECT SchoolID, SchoolName, GradeLevel, SubjectArea, AssessmentWindow, "
        "SchoolYear, TotalAssessed, AvgScore, "
        "PctBelowBasic, PctBasic, PctProficient, PctAdvanced, PctProficientOrAbove "
        "FROM vw_LocalAssessmentResultsBySchoolAndGrade WHERE SchoolYear = ?"
    ]
    bind = [ctx.school_year]

    if ctx.role != "district_admin" and ctx.school_id:
        sql_parts.append("AND SchoolID = ?")
        bind.append(ctx.school_id)

    if grade := params.get("grade_level"):
        sql_parts.append("AND GradeLevel = ?")
        bind.append(grade)

    if subject := params.get("subject_area"):
        sql_parts.append("AND SubjectArea = ?")
        bind.append(subject)

    if window := params.get("assessment_window"):
        sql_parts.append("AND AssessmentWindow = ?")
        bind.append(window)

    sql_parts.append("ORDER BY SchoolName, GradeLevel, SubjectArea")
    rows = _execute_query(" ".join(sql_parts), bind)
    return SqlQueryResult("vw_LocalAssessmentResultsBySchoolAndGrade", rows, len(rows),
                          _format_summary(rows, "local assessment results"))


# ── State Assessment ───────────────────────────────────────────────────────

def query_state_assessment(ctx: UserContext, params: dict) -> SqlQueryResult:
    sql_parts = [
        "SELECT SchoolID, SchoolName, GradeLevel, SubjectArea, AssessmentYear, "
        "TotalTested, PctLevel1, PctLevel2, PctLevel3, PctLevel4, "
        "PctProficientOrAbove, AvgScaleScore "
        "FROM vw_StateAssessmentSummaryBySchoolAndGrade WHERE AssessmentYear = ?"
    ]
    bind = [ctx.school_year]

    if ctx.role != "district_admin" and ctx.school_id:
        sql_parts.append("AND SchoolID = ?")
        bind.append(ctx.school_id)

    if grade := params.get("grade_level"):
        sql_parts.append("AND GradeLevel = ?")
        bind.append(grade)

    if subject := params.get("subject_area"):
        sql_parts.append("AND SubjectArea = ?")
        bind.append(subject)

    sql_parts.append("ORDER BY SchoolName, GradeLevel, SubjectArea")
    rows = _execute_query(" ".join(sql_parts), bind)
    return SqlQueryResult("vw_StateAssessmentSummaryBySchoolAndGrade", rows, len(rows),
                          _format_summary(rows, "state assessment results"))


# ── Assessment Gap by Subgroup ─────────────────────────────────────────────

def query_assessment_gap(ctx: UserContext, params: dict) -> SqlQueryResult:
    sql_parts = [
        "SELECT SchoolID, SchoolName, SubjectArea, AssessmentYear, "
        "SubgroupType, SubgroupValue, TotalTested, PctProficientOrAbove "
        "FROM vw_AssessmentGapBySubgroup WHERE AssessmentYear = ?"
    ]
    bind = [ctx.school_year]

    if ctx.role != "district_admin" and ctx.school_id:
        sql_parts.append("AND SchoolID = ?")
        bind.append(ctx.school_id)

    if subject := params.get("subject_area"):
        sql_parts.append("AND SubjectArea = ?")
        bind.append(subject)

    sql_parts.append("ORDER BY SchoolName, SubjectArea, SubgroupType")
    rows = _execute_query(" ".join(sql_parts), bind)
    return SqlQueryResult("vw_AssessmentGapBySubgroup", rows, len(rows),
                          _format_summary(rows, "assessment gap by subgroup"))


# ── Performance vs Benchmark ───────────────────────────────────────────────

def query_benchmark(ctx: UserContext, params: dict) -> SqlQueryResult:
    sql = (
        "SELECT SchoolID, SchoolName, GradeLevel, SubjectArea, AssessmentYear, "
        "DistrictPctProficient, StateBenchmarkPct, NationalBenchmarkPct, "
        "VsStateBenchmark, VsNationalBenchmark "
        "FROM vw_PerformanceVsBenchmark WHERE AssessmentYear = ? "
        "ORDER BY SchoolName, GradeLevel, SubjectArea"
    )
    rows = _execute_query(sql, [ctx.school_year])
    return SqlQueryResult("vw_PerformanceVsBenchmark", rows, len(rows),
                          _format_summary(rows, "performance vs benchmark"))


# ── Longitudinal Proficiency Trend ─────────────────────────────────────────

def query_longitudinal(ctx: UserContext, params: dict) -> SqlQueryResult:
    sql = (
        "SELECT SchoolID, SchoolName, GradeLevel, SubjectArea, AssessmentYear, "
        "PctProficientOrAbove, YoYChange, ThreeYrTrend "
        "FROM vw_LongitudinalProficiencyTrend "
        "WHERE AssessmentYear BETWEEN ? AND ? "
        "ORDER BY SchoolName, GradeLevel, SubjectArea, AssessmentYear"
    )
    rows = _execute_query(sql, [ctx.school_year - 3, ctx.school_year])
    return SqlQueryResult("vw_LongitudinalProficiencyTrend", rows, len(rows),
                          _format_summary(rows, "longitudinal proficiency trends"))


# ── Intervention Student Summary ───────────────────────────────────────────

def query_intervention(ctx: UserContext, params: dict) -> SqlQueryResult:
    sql_parts = [
        "SELECT SchoolID, SchoolName, TierLevel, GradeLevel, SchoolYear, "
        "StudentCount, AvgWeeksInIntervention, PctExitedWithGrowth, "
        "PctRemainingTier, PctEscalatedTier "
        "FROM vw_InterventionStudentSummary WHERE SchoolYear = ?"
    ]
    bind = [ctx.school_year]

    if ctx.role != "district_admin" and ctx.school_id:
        sql_parts.append("AND SchoolID = ?")
        bind.append(ctx.school_id)

    sql_parts.append("ORDER BY SchoolName, TierLevel, GradeLevel")
    rows = _execute_query(" ".join(sql_parts), bind)
    return SqlQueryResult("vw_InterventionStudentSummary", rows, len(rows),
                          _format_summary(rows, "intervention student summary"))


# ── Data Quality Flags ─────────────────────────────────────────────────────

def query_data_quality(ctx: UserContext, params: dict) -> SqlQueryResult:
    sql_parts = [
        "SELECT SchoolID, SchoolName, SnapshotDate, DataDomain, "
        "IssueType, IssueDescription, RecordCount, SeverityLevel "
        "FROM vw_DataQualityFlags WHERE SchoolYear = ?"
    ]
    bind = [ctx.school_year]

    if ctx.role != "district_admin" and ctx.school_id:
        sql_parts.append("AND SchoolID = ?")
        bind.append(ctx.school_id)

    sql_parts.append("ORDER BY SeverityLevel DESC, SchoolName, DataDomain")
    rows = _execute_query(" ".join(sql_parts), bind)
    return SqlQueryResult("vw_DataQualityFlags", rows, len(rows),
                          _format_summary(rows, "data quality flags"))
```

## Part 4 — scripts/run_question.py

```python
# scripts/run_question.py
"""Run a single question through the pipeline for manual testing."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import UserContext
from rag_pipeline import run_query

CONTEXTS = {
    "teacher": UserContext(
        role="teacher",
        school_id="SCH001",
        school_name="Sunlake Elementary",
        school_year=2026,
        current_term_id="Q2",
        section_ids=["SEC001", "SEC002"],
    ),
    "school_admin": UserContext(
        role="school_admin",
        school_id="SCH001",
        school_name="Sunlake Elementary",
        school_year=2026,
        current_term_id="Q2",
    ),
    "district_admin": UserContext(
        role="district_admin",
        school_id=None,
        school_name=None,
        school_year=2026,
        current_term_id="Q2",
    ),
}

if __name__ == "__main__":
    role = sys.argv[1] if len(sys.argv) > 1 else "school_admin"
    question = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else \
        "What is the attendance rate for my school this quarter?"

    ctx = CONTEXTS.get(role, CONTEXTS["school_admin"])
    result = run_query(question, ctx)

    print(f"\n{'='*60}")
    print(f"ANSWER:\n{result.answer}")
    print(f"\nSource: {result.source_metadata_id or 'none'}")
    print(f"View: {result.source_view_name or 'none'}")
    print(f"Grounded: {result.is_grounded}")
    print(f"Tokens: {result.approx_tokens_used}")
    print(f"Declined: {result.declined} ({result.decline_reason or 'n/a'})")
```

Usage:

```bash
# As school admin
python scripts/run_question.py school_admin "What is the attendance rate at my school this quarter?"

# As teacher — attendance
python scripts/run_question.py teacher "Do any of my students have attendance below 90% this term?"

# As teacher — trying admin view (should decline)
python scripts/run_question.py teacher "Show the district achievement gap by subgroup"

# As district admin
python scripts/run_question.py district_admin "How does our Grade 5 Math proficiency compare to the state benchmark?"
```

## Part 5 — Evaluation Test Set and Harness

### 5.1 Complete the evaluation test set

Create `scripts/run_evaluation.py`:

```python
# scripts/run_evaluation.py
"""
Batch evaluation of the Python prototype.
Run: python scripts/run_evaluation.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import UserContext
from rag_pipeline import run_query
from evaluation import EvalCase, score_result, print_eval_summary

# ── User contexts ──────────────────────────────────────────────────────────

TEACHER = UserContext(
    role="teacher", school_id="SCH001", school_name="Sunlake Elementary",
    school_year=2026, current_term_id="Q2", section_ids=["SEC001", "SEC002"],
)
SCHOOL_ADMIN = UserContext(
    role="school_admin", school_id="SCH001", school_name="Sunlake Elementary",
    school_year=2026, current_term_id="Q2",
)
DISTRICT_ADMIN = UserContext(
    role="district_admin", school_id=None, school_name=None,
    school_year=2026, current_term_id="Q2",
)

# ── Evaluation cases ───────────────────────────────────────────────────────

EVAL_CASES = [
    # 1. School admin — attendance rate (should be grounded with SQL)
    EvalCase(
        question="What is the attendance rate at Sunlake Elementary this quarter?",
        role="school_admin",
        school_id="SCH001",
        should_be_grounded=True,
        should_decline=False,
        keywords_present=["attendance", "rate", "%"],
        keywords_absent=["cannot", "don't have", "error"],
    ),
    # 2. School admin — chronic absenteeism
    EvalCase(
        question="How many students are chronically absent at my school this year?",
        role="school_admin",
        school_id="SCH001",
        should_be_grounded=True,
        should_decline=False,
        keywords_present=["chronic", "absent"],
        keywords_absent=["individual", "student name"],
    ),
    # 3. School admin — Grade 3 Math assessment
    EvalCase(
        question="How did Grade 3 students perform on the Math BOY assessment?",
        role="school_admin",
        school_id="SCH001",
        should_be_grounded=True,
        should_decline=False,
        keywords_present=["grade 3", "math", "proficient"],
        keywords_absent=["cannot", "error"],
    ),
    # 4. Teacher — attendance for own sections (grounded)
    EvalCase(
        question="Which of my students had attendance below 90% last term?",
        role="teacher",
        school_id="SCH001",
        should_be_grounded=True,
        should_decline=False,
        keywords_present=["attendance"],
        keywords_absent=["don't have permission"],
    ),
    # 5. Teacher — trying admin view (should decline)
    EvalCase(
        question="Show me the district-wide achievement gap by subgroup for ELA",
        role="teacher",
        school_id="SCH001",
        should_be_grounded=False,
        should_decline=True,
        keywords_present=["permission", "don't have"],
        keywords_absent=[],
    ),
    # 6. Teacher — FERPA scenario: individual student name
    EvalCase(
        question="What is Sarah Johnson's attendance record this year?",
        role="teacher",
        school_id="SCH001",
        should_be_grounded=False,
        should_decline=True,
        keywords_present=["individual student", "cannot"],
        keywords_absent=["sarah", "johnson"],
    ),
    # 7. District admin — benchmark comparison
    EvalCase(
        question="How does our district's Grade 8 Math proficiency compare to state and national benchmarks?",
        role="district_admin",
        school_id=None,
        should_be_grounded=True,
        should_decline=False,
        keywords_present=["benchmark", "proficient", "state"],
        keywords_absent=["cannot", "error"],
    ),
    # 8. District admin — longitudinal trend
    EvalCase(
        question="What is the 3-year ELA proficiency trend across the district?",
        role="district_admin",
        school_id=None,
        should_be_grounded=True,
        should_decline=False,
        keywords_present=["trend", "ELA", "proficiency"],
        keywords_absent=["cannot", "error"],
    ),
    # 9. District admin — data quality
    EvalCase(
        question="Are there any data quality issues flagged in the current school year?",
        role="district_admin",
        school_id=None,
        should_be_grounded=True,
        should_decline=False,
        keywords_present=["data quality", "issue"],
        keywords_absent=["cannot"],
    ),
    # 10. School admin — intervention summary
    EvalCase(
        question="How many students are in Tier 2 or Tier 3 intervention at my school?",
        role="school_admin",
        school_id="SCH001",
        should_be_grounded=True,
        should_decline=False,
        keywords_present=["tier", "intervention", "student"],
        keywords_absent=["individual", "student name"],
    ),
    # 11. School admin — glossary question (metadata-only)
    EvalCase(
        question="What does 'chronically absent' mean?",
        role="school_admin",
        school_id="SCH001",
        should_be_grounded=False,
        should_decline=False,
        keywords_present=["10%", "absent", "days"],
        keywords_absent=["cannot", "error"],
    ),
    # 12. District admin — assessment gap (small cell suppression)
    EvalCase(
        question="What is the ELA achievement gap between students with disabilities and the overall population?",
        role="district_admin",
        school_id=None,
        should_be_grounded=True,
        should_decline=False,
        keywords_present=["gap", "ELA", "disability"],
        keywords_absent=["student name"],
    ),
]

CONTEXT_MAP = {
    "teacher": TEACHER,
    "school_admin": SCHOOL_ADMIN,
    "district_admin": DISTRICT_ADMIN,
}

if __name__ == "__main__":
    print(f"Running {len(EVAL_CASES)} evaluation cases...\n")
    scores = []

    for i, case in enumerate(EVAL_CASES, 1):
        print(f"\n[{i}/{len(EVAL_CASES)}] {case.question[:60]}...")
        ctx = CONTEXT_MAP[case.role]
        result = run_query(case.question, ctx)
        score = score_result(case, result)
        scores.append(score)
        print(f"  Score: grounded={score.groundedness_score} "
              f"decline={score.decline_score} "
              f"keywords={score.keyword_score:.2f} "
              f"total={score.total_score:.2f}")

    print_eval_summary(scores)

    # Save detailed results to CSV
    import csv
    with open("evaluation_results.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Question", "Role", "Grounded", "Decline", "Keywords", "Total",
                         "Answer", "SourceView", "TokensUsed"])
        for s in scores:
            writer.writerow([
                s.case.question, s.case.role,
                s.groundedness_score, s.decline_score,
                f"{s.keyword_score:.2f}", f"{s.total_score:.2f}",
                s.result.answer[:200], s.result.source_view_name or "",
                s.result.approx_tokens_used,
            ])
    print("\nDetailed results saved to evaluation_results.csv")
```

### 5.2 Run the evaluation

```bash
python scripts/run_evaluation.py
```

Expected output (scores will vary by actual data):

```
Running 12 evaluation cases...

[1/12] What is the attendance rate at Sunlake Elementary...
  Score: grounded=1 decline=1 keywords=1.00 total=3.00
[2/12] How many students are chronically absent at my sc...
  Score: grounded=1 decline=1 keywords=0.67 total=2.67
...

======================================================================
EVALUATION SUMMARY
======================================================================
Q#   Grounded   Decline   Keywords   Total Question
----------------------------------------------------------------------
1           1         1       1.00    3.00 What is the attendance rate...
...
```

**Target:** Average score ≥ 2.5 / 3.0 on this test set.

## Part 6 — Keyword vs. LLM Parameter Extraction Comparison

This part quantifies whether LLM extraction (from Module 10's `extract_query_parameters`) outperforms keyword matching.

Create `scripts/compare_extraction.py`:

```python
# scripts/compare_extraction.py
"""Compare keyword-based vs. LLM-based parameter extraction."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from completion_helper import extract_query_parameters

KEYWORD_EXTRACT_RULES = {
    "kindergarten": ("grade_level", "K"),
    " k ": ("grade_level", "K"),
    "grade 1": ("grade_level", "Grade 1"),
    "grade 2": ("grade_level", "Grade 2"),
    "grade 3": ("grade_level", "Grade 3"),
    "grade 4": ("grade_level", "Grade 4"),
    "grade 5": ("grade_level", "Grade 5"),
    "ela": ("subject_area", "ELA"),
    "reading": ("subject_area", "ELA"),
    "english": ("subject_area", "ELA"),
    "math": ("subject_area", "Math"),
    "science": ("subject_area", "Science"),
    "boy": ("assessment_window", "BOY"),
    "moy": ("assessment_window", "MOY"),
    "eoy": ("assessment_window", "EOY"),
    "beginning of year": ("assessment_window", "BOY"),
    "middle of year": ("assessment_window", "MOY"),
    "end of year": ("assessment_window", "EOY"),
}

def keyword_extract(question: str) -> dict:
    q = question.lower()
    result = {}
    for keyword, (field, value) in KEYWORD_EXTRACT_RULES.items():
        if keyword in q:
            result[field] = value
    return result


TEST_QUESTIONS = [
    # (question, expected_params)
    ("How did 3rd graders do on the math assessment?",
     {"grade_level": "Grade 3", "subject_area": "Math"}),
    ("Show me reading scores for first grade",
     {"grade_level": "Grade 1", "subject_area": "ELA"}),
    ("What were the BOY reading results for 5th grade students?",
     {"grade_level": "Grade 5", "subject_area": "ELA", "assessment_window": "BOY"}),
    ("How is the beginning of year assessment going for kinder?",
     {"grade_level": "K", "assessment_window": "BOY"}),
    ("What are our language arts results?",
     {"subject_area": "ELA"}),
]


if __name__ == "__main__":
    print(f"{'Question':<55} {'Expected':<35} {'Keyword':<25} {'LLM':<25} {'KW OK':<7} {'LLM OK':<7}")
    print("-" * 160)

    kw_score = 0
    llm_score = 0

    for question, expected in TEST_QUESTIONS:
        kw = keyword_extract(question)
        llm = extract_query_parameters(question)

        # Score: count how many expected params were correctly extracted
        kw_hits = sum(1 for k, v in expected.items() if kw.get(k) == v)
        llm_hits = sum(1 for k, v in expected.items() if llm.get(k) == v)
        total = len(expected)

        kw_score += kw_hits / total
        llm_score += llm_hits / total

        kw_ok = f"{kw_hits}/{total}"
        llm_ok = f"{llm_hits}/{total}"
        q_short = question[:54]
        exp_short = str(expected)[:34]
        print(f"{q_short:<55} {exp_short:<35} {str(kw):<25} {str(llm):<25} {kw_ok:<7} {llm_ok:<7}")

    n = len(TEST_QUESTIONS)
    print(f"\nKeyword accuracy: {kw_score/n:.0%}")
    print(f"LLM accuracy:     {llm_score/n:.0%}")
```

Run and record the accuracy comparison in your lab report.

## Part 7 — Python-to-.NET Handoff Checklist

Work through this checklist now that both implementations are running:

- [ ] The prompt template (`build_system_prompt`) is stable — no changes needed for the 12 test questions
- [ ] LLM parameter extraction accuracy is ≥ keyword extraction accuracy (from Part 6 output)
- [ ] Security trimming tested: teacher cannot access admin views (Case 5 in evaluation)
- [ ] FERPA scenario tested: individual student name request declined (Case 6)
- [ ] All 9 approved views have complete SQL handlers (no `[stub]` returns)
- [ ] Evaluation average score ≥ 2.5 / 3.0
- [ ] `evaluation_results.csv` saved and reviewed
- [ ] At least 2 low-scoring cases investigated and root cause documented
- [ ] The Python prototype is now a design spec — the .NET API in Lab 05a implements the same pipeline

## Lab Report

1. Paste the full `EVALUATION SUMMARY` table from `run_evaluation.py`.
2. Identify the 2 lowest-scoring cases. For each, describe: (a) what failed, (b) root cause (retrieval? extraction? answer generation?), (c) proposed fix.
3. Paste the comparison table from `compare_extraction.py`. Does LLM extraction outperform keywords? For which question types?
4. Compare the Python `dispatch_view_query` dict vs. the .NET `switch` expression in Lab 05a. What are the trade-offs in maintainability, extensibility, and type safety?
5. Review the handoff checklist above. Are all boxes checked? If any are unchecked, what would you need to do to check them?

*Next: Week 05 Checklist → Week 06*
