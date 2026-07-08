# Module 10 — Python Prototyping

**Week:** 5 | **Estimated time:** 2.5 hours  
**Prerequisites:** Module 09 (.NET API design); Lab 03b (RAG pipeline in Python)  
**Builds toward:** Lab 05b (Python prototype), Week 7 (evaluation)

## Learning Objectives

By the end of this module you will be able to:

1. Explain when Python prototyping is the right tool and when to hand off to .NET.
2. Structure a Python RAG prototype for maintainability and testability.
3. Use Python to evaluate and compare pipeline variants before committing to .NET.
4. Implement structured LLM output (JSON extraction) for parameter parsing.
5. Write a Python evaluation harness that scores pipeline quality.
6. Identify the handoff point from Python prototype to production .NET.

## The Role of Python in This Architecture

The district analytics assistant is a **.NET production system**. Python's role in this project is:

| Python Role | .NET Role |
|-------------|-----------|
| Rapid iteration on prompt templates | Production orchestration |
| Evaluation harnesses and scoring scripts | Production API serving |
| One-off data analysis and pipeline testing | Scheduled data pipelines |
| Research: trying retrieval strategies | Vetted, reviewed code in production |
| Generating/refreshing the metadata catalog | Serving authenticated requests |

**When to use Python:** When you want to test a hypothesis (does adding synonyms help? does adding SQL context improve answers?) in 30 minutes before spending a week in C#.

**When to hand off:** When a pattern is validated, stable, and ready to serve real users.

## Project Structure (Python Prototype)

```
prototype/
├── .env.local                    ← environment variables (not committed)
├── requirements.txt
├── config.py                     ← centralized config from env
├── models.py                     ← UserContext, QueryResult (dataclasses)
├── security.py                   ← ViewRegistry, scope enforcement
├── db_helper.py                  ← SQL queries (from Lab 03b)
├── search_helper.py              ← AI Search hybrid search
├── completion_helper.py          ← Azure OpenAI chat completion
├── rag_pipeline.py               ← main pipeline orchestration
├── evaluation.py                 ← scoring and comparison harness
└── scripts/
    ├── run_question.py           ← ad-hoc question runner
    └── run_evaluation.py         ← batch evaluation script
```

## config.py

```python
# config.py
"""Central configuration from environment variables."""
import os
from dotenv import load_dotenv

load_dotenv(".env.local")


class Config:
    # Azure OpenAI
    OPENAI_ENDPOINT: str = os.environ["AZURE_OPENAI_ENDPOINT"]
    OPENAI_API_KEY: str = os.environ["AZURE_OPENAI_API_KEY"]
    OPENAI_API_VERSION: str = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")
    CHAT_DEPLOYMENT: str = os.environ.get("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o-mini")
    EMBEDDING_DEPLOYMENT: str = os.environ.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small")

    # Azure AI Search
    SEARCH_ENDPOINT: str = os.environ["AZURE_SEARCH_ENDPOINT"]
    SEARCH_API_KEY: str = os.environ["AZURE_SEARCH_API_KEY"]
    SEARCH_INDEX: str = os.environ.get("AZURE_SEARCH_INDEX", "susd-metadata-v1")

    # SQL Server
    SQL_SERVER: str = os.environ["SQL_SERVER"]
    SQL_DATABASE: str = os.environ.get("SQL_DATABASE", "SunlakeUnifiedDW")
    SQL_USER: str = os.environ.get("SQL_USER", "ai_svc_readonly")
    SQL_PASSWORD: str = os.environ["SQL_PASSWORD"]

    @classmethod
    def sql_connection_string(cls) -> str:
        return (
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={cls.SQL_SERVER};"
            f"DATABASE={cls.SQL_DATABASE};"
            f"UID={cls.SQL_USER};"
            f"PWD={cls.SQL_PASSWORD};"
            "TrustServerCertificate=yes;"
        )
```

## models.py

```python
# models.py
from dataclasses import dataclass, field


@dataclass
class UserContext:
    role: str                         # "teacher" | "school_admin" | "district_admin"
    school_id: str | None             # None for district_admin
    school_name: str | None
    school_year: int                  # end year: 2026 for 2025-26
    current_term_id: str              # Q1, Q2, Q3, Q4, EOY
    section_ids: list[str] = field(default_factory=list)  # teacher only

    def __post_init__(self) -> None:
        valid_roles = {"teacher", "school_admin", "district_admin"}
        if self.role not in valid_roles:
            raise ValueError(f"Invalid role: {self.role!r}. Must be one of {valid_roles}")


@dataclass
class MetadataResult:
    id: str
    title: str
    content: str
    category: str
    view_name: str | None = None
    parameters: str | None = None
    score: float = 0.0


@dataclass
class SqlQueryResult:
    view_name: str
    rows: list[dict]
    row_count: int
    summary: str


@dataclass
class QueryResult:
    question: str
    answer: str
    source_metadata_id: str | None = None
    source_view_name: str | None = None
    is_grounded: bool = False
    approx_tokens_used: int = 0
    declined: bool = False
    decline_reason: str | None = None
```

## security.py

```python
# security.py
"""ViewRegistry and scope enforcement."""

AUTHORIZED_VIEWS: frozenset[str] = frozenset({
    "vw_AttendanceSummaryByStudentAndTerm",
    "vw_AttendanceSummaryBySchoolAndGrade",
    "vw_LocalAssessmentResultsBySchoolAndGrade",
    "vw_StateAssessmentSummaryBySchoolAndGrade",
    "vw_AssessmentGapBySubgroup",
    "vw_PerformanceVsBenchmark",
    "vw_LongitudinalProficiencyTrend",
    "vw_InterventionStudentSummary",
    "vw_DataQualityFlags",
})

# Views restricted to admin roles only (not teacher)
ADMIN_ONLY_VIEWS: frozenset[str] = frozenset({
    "vw_AssessmentGapBySubgroup",
    "vw_PerformanceVsBenchmark",
    "vw_LongitudinalProficiencyTrend",
    "vw_InterventionStudentSummary",
    "vw_DataQualityFlags",
})


def is_authorized_view(view_name: str | None) -> bool:
    """Return True if view_name is in the approved catalog."""
    return view_name is not None and view_name in AUTHORIZED_VIEWS


def check_view_authorization(view_name: str | None, role: str) -> None:
    """
    Raise ValueError if view_name is not authorized or if the role
    doesn't have permission to query this view.
    """
    if not is_authorized_view(view_name):
        raise ValueError(
            f"View '{view_name}' is not in the approved catalog."
        )
    if role == "teacher" and view_name in ADMIN_ONLY_VIEWS:
        raise PermissionError(
            f"Role 'teacher' is not authorized to query '{view_name}'."
        )
```

## Structured Output — Parameter Extraction

One improvement over Lab 03b's keyword matching: use the LLM to extract query parameters as JSON.

```python
# completion_helper.py (excerpt — parameter extraction)
import json
from openai import AzureOpenAI
from config import Config

_client = AzureOpenAI(
    azure_endpoint=Config.OPENAI_ENDPOINT,
    api_key=Config.OPENAI_API_KEY,
    api_version=Config.OPENAI_API_VERSION,
)

PARAM_EXTRACTION_PROMPT = """\
Extract query parameters from the user question. Return ONLY valid JSON with these fields:
{
  "grade_level": "K" | "Grade 1" ... "Grade 12" | null,
  "subject_area": "ELA" | "Math" | "Science" | "Social Studies" | null,
  "assessment_window": "BOY" | "MOY" | "EOY" | null,
  "school_year_override": integer | null,
  "term_id_override": "Q1" | "Q2" | "Q3" | "Q4" | "EOY" | null
}
Use null for any field not mentioned in the question.
Respond ONLY with the JSON object — no explanation, no markdown.
"""

def extract_query_parameters(question: str) -> dict:
    """
    Use the LLM to extract structured parameters from the question.
    Returns a dict with keys: grade_level, subject_area, assessment_window,
    school_year_override, term_id_override.
    Falls back to empty dict if extraction fails.
    """
    try:
        response = _client.chat.completions.create(
            model=Config.CHAT_DEPLOYMENT,
            messages=[
                {"role": "system", "content": PARAM_EXTRACTION_PROMPT},
                {"role": "user", "content": question},
            ],
            temperature=0.0,
            max_tokens=200,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1].strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()
        return json.loads(raw)
    except (json.JSONDecodeError, Exception) as e:
        print(f"  [param extraction failed: {e}] — using defaults")
        return {}


def generate_answer(
    system_prompt: str, augmented_prompt: str
) -> tuple[str, int]:
    """Generate the final answer. Returns (answer_text, tokens_used)."""
    response = _client.chat.completions.create(
        model=Config.CHAT_DEPLOYMENT,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": augmented_prompt},
        ],
        temperature=0.1,
        max_tokens=600,
    )
    answer = response.choices[0].message.content
    tokens = response.usage.total_tokens
    return answer, tokens
```

## rag_pipeline.py

```python
# rag_pipeline.py
"""Full RAG pipeline orchestration (Python prototype)."""
from models import UserContext, QueryResult, MetadataResult, SqlQueryResult
from security import check_view_authorization, is_authorized_view
from search_helper import hybrid_search
from db_helper import get_connection, dispatch_view_query
from completion_helper import extract_query_parameters, generate_answer

SYSTEM_PROMPT_TEMPLATE = """\
You are the SUSD Analytics Assistant for Sunlake Unified School District.
Answer questions about attendance and assessment data using ONLY the data provided below.
Do not fabricate numbers, rates, or trends.

User role: {role}
User school: {school_name} ({school_id})
School year: {school_year} (2025-26 academic year)
Current term: {term_id}

If the question asks for individual student names or records, respond:
"I cannot provide individual student records through this interface."
If the data context below does not contain the answer, say:
"I don't have that information in the available data."
Cite the data source (view name) when you provide numbers.
"""

def build_system_prompt(ctx: UserContext) -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(
        role=ctx.role,
        school_name=ctx.school_name or "All Schools",
        school_id=ctx.school_id or "district",
        school_year=ctx.school_year,
        term_id=ctx.current_term_id,
    )


def build_augmented_prompt(
    question: str, ctx: UserContext,
    metadata: MetadataResult, sql_result: SqlQueryResult | None
) -> str:
    parts = [
        f"## User Context\n"
        f"Role: {ctx.role}\n"
        f"School: {ctx.school_name or 'All Schools'} ({ctx.school_id or 'district'})\n"
        f"School Year: {ctx.school_year}\n"
        f"Current Term: {ctx.current_term_id}",

        f"## Retrieved Metadata\n"
        f"Source: {metadata.title}\n"
        f"{metadata.content}",
    ]

    if sql_result and sql_result.row_count > 0:
        parts.append(
            f"## Retrieved Data\n"
            f"View: {sql_result.view_name}\n"
            f"Rows returned: {sql_result.row_count}\n"
            f"{sql_result.summary}"
        )
    else:
        parts.append(
            "## Note\n"
            "No SQL data was retrieved. Answer using only the metadata context above."
        )

    parts.append(f"## Question\n{question}")
    return "\n\n".join(parts)


def run_query(question: str, ctx: UserContext) -> QueryResult:
    """Execute the full 5-stage RAG pipeline for a question."""
    print(f"\n{'='*60}")
    print(f"Question: {question}")
    print(f"Role: {ctx.role} | School: {ctx.school_id or 'district'}")

    # Stage 2: Retrieve metadata
    metadata = hybrid_search(question, ctx.role)
    if metadata is None:
        return QueryResult(
            question=question,
            answer="I couldn't find relevant information for that question. "
                   "Try asking about attendance or assessment data.",
            is_grounded=False,
        )

    print(f"Stage 2: Metadata retrieved — {metadata.id} ({metadata.category})")

    # Stage 3a: Extract parameters from question
    params = extract_query_parameters(question)
    print(f"Stage 3a: Extracted params — {params}")

    # Stage 3b: Query SQL if view available
    sql_result: SqlQueryResult | None = None
    if is_authorized_view(metadata.view_name):
        try:
            check_view_authorization(metadata.view_name, ctx.role)
            sql_result = dispatch_view_query(metadata.view_name, ctx, params)
            print(f"Stage 3b: SQL data — {sql_result.row_count} rows from {sql_result.view_name}")
        except PermissionError as e:
            print(f"Stage 3b: Permission denied — {e}")
            return QueryResult(
                question=question,
                answer="You don't have permission to view that data.",
                declined=True,
                decline_reason="insufficient_role",
            )
        except ValueError as e:
            print(f"Stage 3b: View not authorized — {e}")
            return QueryResult(
                question=question,
                answer="This query cannot be processed due to access restrictions.",
                declined=True,
                decline_reason="view_not_authorized",
            )

    # Stage 4: Build augmented prompt
    system_prompt = build_system_prompt(ctx)
    augmented_prompt = build_augmented_prompt(question, ctx, metadata, sql_result)

    # Stage 5: Generate answer
    answer, tokens_used = generate_answer(system_prompt, augmented_prompt)
    print(f"Stage 5: Answer generated ({tokens_used} tokens)")

    return QueryResult(
        question=question,
        answer=answer,
        source_metadata_id=metadata.id,
        source_view_name=metadata.view_name,
        is_grounded=sql_result is not None,
        approx_tokens_used=tokens_used,
    )
```

## db_helper.py — `dispatch_view_query`

```python
# db_helper.py (additions to Lab 03b version)
from models import UserContext, SqlQueryResult
from config import Config
import pyodbc

def get_connection() -> pyodbc.Connection:
    return pyodbc.connect(Config.sql_connection_string())

def dispatch_view_query(
    view_name: str, ctx: UserContext, params: dict
) -> SqlQueryResult:
    """
    Route to the correct typed query function based on view_name.
    view_name has already been validated by check_view_authorization.
    """
    dispatch: dict[str, callable] = {
        "vw_AttendanceSummaryBySchoolAndGrade": query_attendance_by_school,
        "vw_LocalAssessmentResultsBySchoolAndGrade": query_local_assessment,
        "vw_StateAssessmentSummaryBySchoolAndGrade": query_state_assessment,
        "vw_AssessmentGapBySubgroup": query_assessment_gap,
        "vw_PerformanceVsBenchmark": query_benchmark,
        "vw_LongitudinalProficiencyTrend": query_longitudinal,
        "vw_InterventionStudentSummary": query_intervention,
        "vw_DataQualityFlags": query_data_quality,
        "vw_AttendanceSummaryByStudentAndTerm": query_student_attendance,
    }
    handler = dispatch.get(view_name)
    if handler is None:
        raise ValueError(f"No handler registered for view '{view_name}'")
    return handler(ctx, params)


def _execute_query(sql: str, bind_params: list) -> list[dict]:
    """Execute a parameterized query and return rows as list of dicts."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, bind_params)
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


def query_attendance_by_school(ctx: UserContext, params: dict) -> SqlQueryResult:
    sql_parts = [
        "SELECT SchoolID, SchoolName, GradeLevel, TermID, SchoolYear, "
        "TotalEnrollment, AttendanceRate, ChronicallyAbsentCount, "
        "ChronicallyAbsentRate, AvgUnexcusedAbsences "
        "FROM vw_AttendanceSummaryBySchoolAndGrade "
        "WHERE SchoolYear = ?"
    ]
    bind_params = [ctx.school_year]

    if ctx.role != "district_admin" and ctx.school_id:
        sql_parts.append("AND SchoolID = ?")
        bind_params.append(ctx.school_id)

    if ctx.current_term_id:
        sql_parts.append("AND TermID = ?")
        bind_params.append(ctx.current_term_id)

    if grade := params.get("grade_level"):
        sql_parts.append("AND GradeLevel = ?")
        bind_params.append(grade)

    sql_parts.append("ORDER BY SchoolName, GradeLevel")
    rows = _execute_query(" ".join(sql_parts), bind_params)
    return SqlQueryResult("vw_AttendanceSummaryBySchoolAndGrade",
                          rows, len(rows), _format_summary(rows, "attendance"))


def query_local_assessment(ctx: UserContext, params: dict) -> SqlQueryResult:
    sql_parts = [
        "SELECT SchoolID, SchoolName, GradeLevel, SubjectArea, AssessmentWindow, "
        "SchoolYear, TotalAssessed, AvgScore, PctBelowBasic, PctBasic, "
        "PctProficient, PctAdvanced, PctProficientOrAbove "
        "FROM vw_LocalAssessmentResultsBySchoolAndGrade "
        "WHERE SchoolYear = ?"
    ]
    bind_params = [ctx.school_year]

    if ctx.role != "district_admin" and ctx.school_id:
        sql_parts.append("AND SchoolID = ?")
        bind_params.append(ctx.school_id)

    if grade := params.get("grade_level"):
        sql_parts.append("AND GradeLevel = ?")
        bind_params.append(grade)

    if subject := params.get("subject_area"):
        sql_parts.append("AND SubjectArea = ?")
        bind_params.append(subject)

    if window := params.get("assessment_window"):
        sql_parts.append("AND AssessmentWindow = ?")
        bind_params.append(window)

    sql_parts.append("ORDER BY SchoolName, GradeLevel, SubjectArea")
    rows = _execute_query(" ".join(sql_parts), bind_params)
    return SqlQueryResult("vw_LocalAssessmentResultsBySchoolAndGrade",
                          rows, len(rows), _format_summary(rows, "assessment"))


# Remaining handlers (stub — Lab 05b fills these in for all views)
def query_state_assessment(ctx: UserContext, params: dict) -> SqlQueryResult:
    return SqlQueryResult("vw_StateAssessmentSummaryBySchoolAndGrade", [], 0, "[stub]")

def query_assessment_gap(ctx: UserContext, params: dict) -> SqlQueryResult:
    return SqlQueryResult("vw_AssessmentGapBySubgroup", [], 0, "[stub]")

def query_benchmark(ctx: UserContext, params: dict) -> SqlQueryResult:
    return SqlQueryResult("vw_PerformanceVsBenchmark", [], 0, "[stub]")

def query_longitudinal(ctx: UserContext, params: dict) -> SqlQueryResult:
    return SqlQueryResult("vw_LongitudinalProficiencyTrend", [], 0, "[stub]")

def query_intervention(ctx: UserContext, params: dict) -> SqlQueryResult:
    return SqlQueryResult("vw_InterventionStudentSummary", [], 0, "[stub]")

def query_data_quality(ctx: UserContext, params: dict) -> SqlQueryResult:
    return SqlQueryResult("vw_DataQualityFlags", [], 0, "[stub]")

def query_student_attendance(ctx: UserContext, params: dict) -> SqlQueryResult:
    return SqlQueryResult("vw_AttendanceSummaryByStudentAndTerm", [], 0, "[stub]")
```

## Evaluation Harness

The evaluation harness scores pipeline answers against a fixed rubric. This is the foundation for the formal evaluation in Week 7.

```python
# evaluation.py
"""
Evaluation harness for the Python RAG prototype.
Scores pipeline outputs against expected answer properties.
"""
from dataclasses import dataclass
from models import QueryResult

@dataclass
class EvalCase:
    question: str
    role: str
    school_id: str | None
    # What we expect
    should_be_grounded: bool          # expects real SQL data
    should_decline: bool              # expects a refusal
    keywords_present: list[str]       # these words/phrases should appear in the answer
    keywords_absent: list[str]        # these should NOT appear (hallucination markers)

@dataclass
class EvalScore:
    case: EvalCase
    result: QueryResult
    groundedness_score: int     # 0 or 1
    decline_score: int          # 0 or 1
    keyword_score: float        # 0.0–1.0
    total_score: float          # 0.0–3.0


def score_result(case: EvalCase, result: QueryResult) -> EvalScore:
    # Groundedness: did we expect SQL data and did we get it?
    groundedness_score = 0
    if case.should_be_grounded and result.is_grounded:
        groundedness_score = 1
    elif not case.should_be_grounded and not result.is_grounded:
        groundedness_score = 1

    # Decline: did we expect a refusal and did we get one?
    decline_score = 0
    if case.should_decline and result.declined:
        decline_score = 1
    elif not case.should_decline and not result.declined:
        decline_score = 1

    # Keyword check: are expected keywords in the answer?
    answer_lower = result.answer.lower()
    present_hits = sum(1 for kw in case.keywords_present if kw.lower() in answer_lower)
    absent_hits = sum(1 for kw in case.keywords_absent if kw.lower() in answer_lower)
    keyword_score = (present_hits / max(len(case.keywords_present), 1)) - (0.2 * absent_hits)
    keyword_score = max(0.0, min(1.0, keyword_score))

    total = groundedness_score + decline_score + keyword_score

    return EvalScore(
        case=case,
        result=result,
        groundedness_score=groundedness_score,
        decline_score=decline_score,
        keyword_score=keyword_score,
        total_score=total,
    )


def print_eval_summary(scores: list[EvalScore]) -> None:
    print(f"\n{'='*70}")
    print("EVALUATION SUMMARY")
    print(f"{'='*70}")
    print(f"{'Q#':<4} {'Grounded':>10} {'Decline':>8} {'Keywords':>10} {'Total':>7} Question")
    print(f"{'-'*70}")
    for i, s in enumerate(scores, 1):
        q = s.case.question[:45] + ("..." if len(s.case.question) > 45 else "")
        print(f"{i:<4} {s.groundedness_score:>10} {s.decline_score:>8} "
              f"{s.keyword_score:>10.2f} {s.total_score:>7.2f} {q}")
    avg = sum(s.total_score for s in scores) / len(scores)
    print(f"{'-'*70}")
    print(f"Average score: {avg:.2f} / 3.00")
    print(f"{'='*70}")
```

## Python–to–.NET Handoff Checklist

Use this list to decide when a Python prototype is ready to move to .NET:

- [ ] The prompt template is stable (no weekly changes)
- [ ] Parameter extraction is accurate for the full question set (≥ 90%)
- [ ] Security trimming is tested and working
- [ ] All 9 approved views have complete SQL handlers
- [ ] Evaluation scores are consistently ≥ 2.5 / 3.0 on the test set
- [ ] No hallucinations detected in 3 consecutive evaluation runs
- [ ] The prototype is serving the correct data for all 3 role contexts

Once these are true, the Python prototype becomes a **design spec** — the .NET API implements the same pipeline with typed services, DI, and managed identity.

## Reflection Questions

1. The `dispatch_view_query` function uses a dict of callables keyed by view name. What is the security advantage of this pattern over using `eval()` or `getattr()` to call a function by its string name?
2. The `extract_query_parameters` function returns an empty dict on JSON parse failure. What is the correct fallback behavior, and when would this matter most?
3. You run the evaluation harness and find that Q5 ("How does our attendance compare to last year?") consistently scores 0 on groundedness despite the pipeline claiming it's grounded. What are three possible root causes?
4. When does it make sense to use the Python LLM parameter extraction instead of the simple string matching in `db_helper.py`?

## References

- [OpenAI Python SDK — structured outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [azure-search-documents Python SDK](https://pypi.org/project/azure-search-documents/)
- [pyodbc parameterized queries](https://github.com/mkleehammer/pyodbc/wiki/Getting-started#parameters)
- [Python dataclasses](https://docs.python.org/3/library/dataclasses.html)

*Next: Lab 05a — .NET API*
