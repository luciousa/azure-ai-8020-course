# Lab 04a — Approved Views

**Week:** 4 | **Estimated time:** 2.5–3 hours  
**Prerequisites:** Lab 01a (database set up with synthetic data); Module 07 read  
**Deliverable:** All 9 approved views created and verified in SQL Server; service account permissions confirmed

## Lab Objectives

1. Create all 9 approved views in the `SunlakeUnifiedDW` database.
2. Verify that aggregated views return no individual student PII.
3. Configure the read-only service account and verify GRANT/DENY permissions.
4. Optionally explore what AI-generated SQL would look like (synthetic data only, controlled lab) to understand the risk.
5. Test parameterized query access via `pyodbc`.

## Part 1 — Create the Approved Views

Connect to `SunlakeUnifiedDW` and run the following DDL. These views are designed around the synthetic schema in `resources/synthetic-schema.md`.

### View 1: Attendance Summary by Student and Term

```sql
-- vw_AttendanceSummaryByStudentAndTerm
-- Returns student-level attendance (no names/PII, only surrogate key and derived metrics)
CREATE OR ALTER VIEW vw_AttendanceSummaryByStudentAndTerm AS
SELECT
    s.StudentKey,
    sch.SchoolID,
    sch.SchoolName,
    gl.GradeLevelCode       AS GradeLevel,
    t.TermCode              AS TermID,
    sy.SchoolYear,
    a.DaysEnrolled,
    a.DaysPresent,
    a.DaysAbsent,
    a.DaysExcusedAbsent,
    a.DaysUnexcusedAbsent,
    CASE
        WHEN a.DaysEnrolled > 0
        THEN ROUND(CAST(a.DaysPresent AS FLOAT) / a.DaysEnrolled * 100, 2)
        ELSE NULL
    END                     AS AttendanceRate,
    a.IsChronicallyAbsent,
    -- No student name, no DOB, no SSN, no address
    e.SectionID
FROM fact_Attendance a
JOIN dim_Student     s    ON a.StudentKey    = s.StudentKey
JOIN dim_School      sch  ON a.SchoolKey     = sch.SchoolKey
JOIN dim_GradeLevel  gl   ON a.GradeLevelKey = gl.GradeLevelKey
JOIN dim_Term        t    ON a.TermKey       = t.TermKey
JOIN dim_SchoolYear  sy   ON t.SchoolYearKey = sy.SchoolYearKey
JOIN fact_Enrollment e    ON e.StudentKey    = s.StudentKey
                         AND e.SchoolKey     = sch.SchoolKey
                         AND e.TermKey       = t.TermKey;
GO
```

### View 2: Attendance Summary by School and Grade

```sql
-- vw_AttendanceSummaryBySchoolAndGrade
-- Aggregated — no individual student data
CREATE OR ALTER VIEW vw_AttendanceSummaryBySchoolAndGrade AS
SELECT
    sch.SchoolID,
    sch.SchoolName,
    gl.GradeLevelCode            AS GradeLevel,
    t.TermCode                   AS TermID,
    sy.SchoolYear,
    COUNT(DISTINCT s.StudentKey) AS TotalEnrollment,
    ROUND(AVG(CASE
        WHEN a.DaysEnrolled > 0
        THEN CAST(a.DaysPresent AS FLOAT) / a.DaysEnrolled * 100
        ELSE NULL
    END), 2)                     AS AttendanceRate,
    SUM(CASE WHEN a.IsChronicallyAbsent = 1 THEN 1 ELSE 0 END)
                                 AS ChronicallyAbsentCount,
    ROUND(
        CAST(SUM(CASE WHEN a.IsChronicallyAbsent = 1 THEN 1 ELSE 0 END) AS FLOAT)
        / NULLIF(COUNT(DISTINCT s.StudentKey), 0) * 100, 2
    )                            AS ChronicallyAbsentRate,
    ROUND(AVG(CAST(a.DaysUnexcusedAbsent AS FLOAT)), 2)
                                 AS AvgUnexcusedAbsences
FROM fact_Attendance a
JOIN dim_Student    s   ON a.StudentKey    = s.StudentKey
JOIN dim_School     sch ON a.SchoolKey     = sch.SchoolKey
JOIN dim_GradeLevel gl  ON a.GradeLevelKey = gl.GradeLevelKey
JOIN dim_Term       t   ON a.TermKey       = t.TermKey
JOIN dim_SchoolYear sy  ON t.SchoolYearKey = sy.SchoolYearKey
GROUP BY
    sch.SchoolID, sch.SchoolName,
    gl.GradeLevelCode, t.TermCode, sy.SchoolYear;
GO
```

### View 3: Local Assessment Results by School and Grade

```sql
-- vw_LocalAssessmentResultsBySchoolAndGrade
CREATE OR ALTER VIEW vw_LocalAssessmentResultsBySchoolAndGrade AS
SELECT
    sch.SchoolID,
    sch.SchoolName,
    gl.GradeLevelCode                       AS GradeLevel,
    at.SubjectArea,
    t.TermCode                              AS AssessmentWindow,
    sy.SchoolYear,
    COUNT(*)                                AS TotalAssessed,
    ROUND(AVG(CAST(ar.ScaleScore AS FLOAT)), 1) AS AvgScore,
    ROUND(AVG(CASE WHEN ar.PerformanceLevel = 1 THEN 1.0 ELSE 0 END) * 100, 1)
                                            AS PctBelowBasic,
    ROUND(AVG(CASE WHEN ar.PerformanceLevel = 2 THEN 1.0 ELSE 0 END) * 100, 1)
                                            AS PctBasic,
    ROUND(AVG(CASE WHEN ar.PerformanceLevel = 3 THEN 1.0 ELSE 0 END) * 100, 1)
                                            AS PctProficient,
    ROUND(AVG(CASE WHEN ar.PerformanceLevel = 4 THEN 1.0 ELSE 0 END) * 100, 1)
                                            AS PctAdvanced,
    ROUND(AVG(CASE WHEN ar.PerformanceLevel >= 3 THEN 1.0 ELSE 0 END) * 100, 1)
                                            AS PctProficientOrAbove
FROM fact_LocalAssessmentResult ar
JOIN dim_Student       s   ON ar.StudentKey      = s.StudentKey
JOIN dim_School        sch ON ar.SchoolKey       = sch.SchoolKey
JOIN dim_GradeLevel    gl  ON ar.GradeLevelKey   = gl.GradeLevelKey
JOIN dim_AssessmentTest at ON ar.AssessmentKey   = at.AssessmentKey
JOIN dim_Term          t   ON ar.TermKey         = t.TermKey
JOIN dim_SchoolYear    sy  ON t.SchoolYearKey    = sy.SchoolYearKey
GROUP BY
    sch.SchoolID, sch.SchoolName,
    gl.GradeLevelCode, at.SubjectArea,
    t.TermCode, sy.SchoolYear;
GO
```

### View 4: State Assessment Summary by School and Grade

```sql
-- vw_StateAssessmentSummaryBySchoolAndGrade
CREATE OR ALTER VIEW vw_StateAssessmentSummaryBySchoolAndGrade AS
SELECT
    sch.SchoolID,
    sch.SchoolName,
    gl.GradeLevelCode                AS GradeLevel,
    at.SubjectArea,
    sy.SchoolYear,
    COUNT(*)                         AS TotalTested,
    ROUND(AVG(CASE WHEN ar.AchievementLevel = 1 THEN 1.0 ELSE 0 END) * 100, 1)
                                     AS PctLevel1,
    ROUND(AVG(CASE WHEN ar.AchievementLevel = 2 THEN 1.0 ELSE 0 END) * 100, 1)
                                     AS PctLevel2,
    ROUND(AVG(CASE WHEN ar.AchievementLevel = 3 THEN 1.0 ELSE 0 END) * 100, 1)
                                     AS PctLevel3,
    ROUND(AVG(CASE WHEN ar.AchievementLevel = 4 THEN 1.0 ELSE 0 END) * 100, 1)
                                     AS PctLevel4,
    ROUND(AVG(CASE WHEN ar.AchievementLevel = 5 THEN 1.0 ELSE 0 END) * 100, 1)
                                     AS PctLevel5,
    ROUND(AVG(CASE WHEN ar.AchievementLevel >= 3 THEN 1.0 ELSE 0 END) * 100, 1)
                                     AS PctAtOrAboveGradeLevel
FROM fact_StateAssessmentResult ar
JOIN dim_Student        s   ON ar.StudentKey    = s.StudentKey
JOIN dim_School         sch ON ar.SchoolKey     = sch.SchoolKey
JOIN dim_GradeLevel     gl  ON ar.GradeLevelKey = gl.GradeLevelKey
JOIN dim_AssessmentTest at  ON ar.AssessmentKey = at.AssessmentKey
JOIN dim_SchoolYear     sy  ON ar.SchoolYearKey = sy.SchoolYearKey
GROUP BY
    sch.SchoolID, sch.SchoolName,
    gl.GradeLevelCode, at.SubjectArea, sy.SchoolYear;
GO
```

### View 5: Assessment Gap by Subgroup

```sql
-- vw_AssessmentGapBySubgroup
-- Small cell suppression applied: groups with < 10 students get NULL rates
CREATE OR ALTER VIEW vw_AssessmentGapBySubgroup AS
SELECT
    sch.SchoolID,
    sch.SchoolName,
    gl.GradeLevelCode              AS GradeLevel,
    at.SubjectArea,
    sy.SchoolYear,
    sg.SubgroupCategory,
    sg.SubgroupName,
    COUNT(*)                       AS GroupCount,
    -- Suppress when n < 10 (FERPA small cell rule)
    CASE WHEN COUNT(*) >= 10
         THEN ROUND(AVG(CASE WHEN ar.PerformanceLevel >= 3 THEN 1.0 ELSE 0 END) * 100, 1)
         ELSE NULL
    END                            AS ProficiencyRate
FROM fact_LocalAssessmentResult ar
JOIN dim_Student        s   ON ar.StudentKey      = s.StudentKey
JOIN dim_School         sch ON ar.SchoolKey       = sch.SchoolKey
JOIN dim_GradeLevel     gl  ON ar.GradeLevelKey   = gl.GradeLevelKey
JOIN dim_AssessmentTest at  ON ar.AssessmentKey   = at.AssessmentKey
JOIN dim_SchoolYear     sy  ON ar.SchoolYearKey   = sy.SchoolYearKey
JOIN dim_Subgroup       sg  ON ar.SubgroupKey     = sg.SubgroupKey
GROUP BY
    sch.SchoolID, sch.SchoolName, gl.GradeLevelCode,
    at.SubjectArea, sy.SchoolYear,
    sg.SubgroupCategory, sg.SubgroupName;
GO
```

### View 6: Performance vs. Benchmark

```sql
-- vw_PerformanceVsBenchmark
CREATE OR ALTER VIEW vw_PerformanceVsBenchmark AS
SELECT
    a.SchoolID,
    a.SchoolName,
    a.GradeLevel,
    a.SubjectArea,
    a.SchoolYear,
    a.PctProficientOrAbove         AS ActualProficiency,
    pb.BenchmarkTarget,
    ROUND(a.PctProficientOrAbove - pb.BenchmarkTarget, 1)
                                   AS VarianceFromTarget,
    CASE
        WHEN a.PctProficientOrAbove >= pb.BenchmarkTarget          THEN 'At/Above Target'
        WHEN a.PctProficientOrAbove >= pb.BenchmarkTarget - 5.0    THEN 'Near Target'
        ELSE 'Below Target'
    END                            AS BenchmarkStatus
FROM vw_LocalAssessmentResultsBySchoolAndGrade a
JOIN fact_PerformanceBenchmark pb
    ON pb.SchoolID      = a.SchoolID
   AND pb.GradeLevel    = a.GradeLevel
   AND pb.SubjectArea   = a.SubjectArea
   AND pb.SchoolYear    = a.SchoolYear;
GO
```

### View 7: Longitudinal Proficiency Trend

```sql
-- vw_LongitudinalProficiencyTrend
CREATE OR ALTER VIEW vw_LongitudinalProficiencyTrend AS
SELECT
    sch.SchoolID,
    sch.SchoolName,
    gl.GradeLevelCode              AS GradeLevel,
    at.SubjectArea,
    sy.SchoolYear,
    COUNT(*)                       AS TotalAssessed,
    ROUND(AVG(CASE WHEN ar.PerformanceLevel >= 3 THEN 1.0 ELSE 0 END) * 100, 1)
                                   AS ProficiencyRate
FROM fact_LocalAssessmentResult ar
JOIN dim_Student        s   ON ar.StudentKey      = s.StudentKey
JOIN dim_School         sch ON ar.SchoolKey       = sch.SchoolKey
JOIN dim_GradeLevel     gl  ON ar.GradeLevelKey   = gl.GradeLevelKey
JOIN dim_AssessmentTest at  ON ar.AssessmentKey   = at.AssessmentKey
JOIN dim_Term           t   ON ar.TermKey         = t.TermKey
JOIN dim_SchoolYear     sy  ON t.SchoolYearKey    = sy.SchoolYearKey
WHERE t.TermCode = 'EOY'  -- Only EOY assessments for year-over-year comparison
GROUP BY
    sch.SchoolID, sch.SchoolName, gl.GradeLevelCode,
    at.SubjectArea, sy.SchoolYear;
GO
```

### View 8: Intervention Student Summary

```sql
-- vw_InterventionStudentSummary
CREATE OR ALTER VIEW vw_InterventionStudentSummary AS
SELECT
    sch.SchoolID,
    sch.SchoolName,
    sy.SchoolYear,
    im.TierLevel,
    im.ProgramName,
    COUNT(DISTINCT im.StudentKey)  AS StudentCount,
    ROUND(AVG(CASE
        WHEN a.DaysEnrolled > 0
        THEN CAST(a.DaysPresent AS FLOAT) / a.DaysEnrolled * 100
        ELSE NULL
    END), 2)                       AS AvgAttendanceRate
FROM fact_InterventionMonitoring im
JOIN dim_School     sch ON im.SchoolKey     = sch.SchoolKey
JOIN dim_SchoolYear sy  ON im.SchoolYearKey = sy.SchoolYearKey
-- Join attendance for the same school year
LEFT JOIN fact_Attendance a
    ON a.StudentKey  = im.StudentKey
   AND a.SchoolKey   = im.SchoolKey
JOIN dim_Term t     ON a.TermKey = t.TermKey
JOIN dim_SchoolYear sy2 ON t.SchoolYearKey = sy2.SchoolYearKey
                       AND sy2.SchoolYear = sy.SchoolYear
GROUP BY
    sch.SchoolID, sch.SchoolName, sy.SchoolYear,
    im.TierLevel, im.ProgramName;
GO
```

### View 9: Data Quality Flags

```sql
-- vw_DataQualityFlags
CREATE OR ALTER VIEW vw_DataQualityFlags AS
SELECT
    sch.SchoolID,
    sch.SchoolName,
    sy.SchoolYear,
    'AttendanceRateAbove100'       AS IssueCategory,
    COUNT(*)                       AS IssueCount
FROM fact_Attendance a
JOIN dim_School     sch ON a.SchoolKey     = sch.SchoolKey
JOIN dim_Term       t   ON a.TermKey       = t.TermKey
JOIN dim_SchoolYear sy  ON t.SchoolYearKey = sy.SchoolYearKey
WHERE CAST(a.DaysPresent AS FLOAT) / NULLIF(a.DaysEnrolled, 0) > 1.0
GROUP BY sch.SchoolID, sch.SchoolName, sy.SchoolYear

UNION ALL

SELECT
    sch.SchoolID,
    sch.SchoolName,
    sy.SchoolYear,
    'NoAttendanceRecord'           AS IssueCategory,
    COUNT(*)                       AS IssueCount
FROM fact_Enrollment e
JOIN dim_School     sch ON e.SchoolKey     = sch.SchoolKey
JOIN dim_Term       t   ON e.TermKey       = t.TermKey
JOIN dim_SchoolYear sy  ON t.SchoolYearKey = sy.SchoolYearKey
WHERE NOT EXISTS (
    SELECT 1 FROM fact_Attendance a
    WHERE a.StudentKey = e.StudentKey AND a.SchoolKey = e.SchoolKey
      AND a.TermKey = e.TermKey
)
GROUP BY sch.SchoolID, sch.SchoolName, sy.SchoolYear;
GO
```

## Part 2 — Configure Service Account Permissions

```sql
-- Run as sysadmin or database owner
-- 1. Create the service account
CREATE LOGIN ai_svc_readonly WITH PASSWORD = 'AI$vc_P0c_Readonly!';
CREATE USER ai_svc_readonly FOR LOGIN ai_svc_readonly;

-- 2. Grant SELECT on all approved views
GRANT SELECT ON dbo.vw_AttendanceSummaryByStudentAndTerm      TO ai_svc_readonly;
GRANT SELECT ON dbo.vw_AttendanceSummaryBySchoolAndGrade      TO ai_svc_readonly;
GRANT SELECT ON dbo.vw_LocalAssessmentResultsBySchoolAndGrade  TO ai_svc_readonly;
GRANT SELECT ON dbo.vw_StateAssessmentSummaryBySchoolAndGrade  TO ai_svc_readonly;
GRANT SELECT ON dbo.vw_AssessmentGapBySubgroup                 TO ai_svc_readonly;
GRANT SELECT ON dbo.vw_PerformanceVsBenchmark                  TO ai_svc_readonly;
GRANT SELECT ON dbo.vw_LongitudinalProficiencyTrend            TO ai_svc_readonly;
GRANT SELECT ON dbo.vw_InterventionStudentSummary              TO ai_svc_readonly;
GRANT SELECT ON dbo.vw_DataQualityFlags                        TO ai_svc_readonly;

-- 3. Explicitly DENY on all base tables
DENY SELECT ON dbo.dim_Student               TO ai_svc_readonly;
DENY SELECT ON dbo.dim_Staff                 TO ai_svc_readonly;
DENY SELECT ON dbo.fact_Attendance           TO ai_svc_readonly;
DENY SELECT ON dbo.fact_Enrollment           TO ai_svc_readonly;
DENY SELECT ON dbo.fact_GradeRecord          TO ai_svc_readonly;
DENY SELECT ON dbo.fact_LocalAssessmentResult  TO ai_svc_readonly;
DENY SELECT ON dbo.fact_StateAssessmentResult  TO ai_svc_readonly;
DENY SELECT ON dbo.fact_InterventionMonitoring TO ai_svc_readonly;
DENY SELECT ON dbo.fact_PerformanceBenchmark   TO ai_svc_readonly;
```

Update `.env.local`:
```
SQL_USER=ai_svc_readonly
SQL_PASSWORD=AI$vc_P0c_Readonly!
```

## Part 3 — Verify Permissions

```python
# scripts/lab04a_permission_test.py
import os
import pyodbc
from dotenv import load_dotenv

load_dotenv(".env.local")

conn_str = (
    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
    f"SERVER={os.environ['SQL_SERVER']};"
    f"DATABASE={os.environ['SQL_DATABASE']};"
    f"UID={os.environ['SQL_USER']};"
    f"PWD={os.environ['SQL_PASSWORD']};"
    "TrustServerCertificate=yes;"
)

def try_query(description: str, sql: str, params=None):
    try:
        with pyodbc.connect(conn_str) as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params or [])
            rows = cursor.fetchall()
            print(f"  ✅ ALLOWED   {description} ({len(rows)} rows)")
    except pyodbc.Error as e:
        print(f"  ❌ DENIED    {description}: {str(e)[:100]}")

print("=== Permission verification for ai_svc_readonly ===\n")

# --- Should SUCCEED (approved views) ---
print("-- Expected ALLOWED --")
try_query("vw_AttendanceSummaryBySchoolAndGrade",
          "SELECT TOP 3 * FROM vw_AttendanceSummaryBySchoolAndGrade WHERE SchoolYear = 2026",
          [])
try_query("vw_LocalAssessmentResultsBySchoolAndGrade",
          "SELECT TOP 3 * FROM vw_LocalAssessmentResultsBySchoolAndGrade WHERE SchoolYear = 2026",
          [])
try_query("vw_InterventionStudentSummary",
          "SELECT TOP 3 * FROM vw_InterventionStudentSummary WHERE SchoolYear = 2026",
          [])

# --- Should FAIL (base tables) ---
print("\n-- Expected DENIED --")
try_query("dim_Student (base table)",
          "SELECT TOP 1 * FROM dim_Student", [])
try_query("fact_Attendance (base table)",
          "SELECT TOP 1 * FROM fact_Attendance", [])
try_query("fact_LocalAssessmentResult (base table)",
          "SELECT TOP 1 * FROM fact_LocalAssessmentResult", [])
```

Expected output:
```
=== Permission verification for ai_svc_readonly ===

-- Expected ALLOWED --
  ✅ ALLOWED   vw_AttendanceSummaryBySchoolAndGrade (N rows)
  ✅ ALLOWED   vw_LocalAssessmentResultsBySchoolAndGrade (N rows)
  ✅ ALLOWED   vw_InterventionStudentSummary (N rows)

-- Expected DENIED --
  ❌ DENIED    dim_Student (base table): ...SELECT permission was denied...
  ❌ DENIED    fact_Attendance (base table): ...SELECT permission was denied...
  ❌ DENIED    fact_LocalAssessmentResult (base table): ...SELECT permission was denied...
```

## Part 4 — Controlled Exploration: AI-Generated SQL (Synthetic Data Only)

> **Safety note:** This section explores AI-generated SQL on the **synthetic dataset only**, using a **separate lab connection** with full access (not the `ai_svc_readonly` account). The purpose is to understand what direct SQL generation would produce — confirming why the approved view pattern is necessary. Do not apply this pattern to any real data.

```python
# scripts/lab04a_ai_sql_risk_demo.py
"""
CONTROLLED LAB ONLY — SYNTHETIC DATA — NOT FOR PRODUCTION USE.
Demonstrates what AI-generated SQL would look like to understand the risk.
Uses a full-access connection (admin credentials), NOT ai_svc_readonly.
"""
import os
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv(".env.local")

client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version=os.environ["AZURE_OPENAI_API_VERSION"],
)

# Schema summary to give the model context
SCHEMA_SUMMARY = """
Tables in SunlakeUnifiedDW (SYNTHETIC DATA ONLY):
- dim_Student (StudentKey, FirstName, LastName, DOB, GradeLevel)
- fact_Attendance (StudentKey, SchoolKey, TermKey, DaysPresent, DaysAbsent, IsChronicallyAbsent)
- dim_School (SchoolKey, SchoolID, SchoolName)
"""

questions = [
    "Show me all students with more than 10 absences",
    "List the names of the lowest-performing Grade 5 students in ELA",
    "Drop the dim_Student table",  # SQL injection attempt
]

print("=== AI-Generated SQL Demo (SYNTHETIC DATA — CONTROLLED LAB) ===\n")
print("PURPOSE: Understand what unrestricted SQL generation produces\n")

for question in questions:
    response = client.chat.completions.create(
        model=os.environ["AZURE_OPENAI_CHAT_DEPLOYMENT"],
        messages=[
            {"role": "system", "content": f"Generate SQL Server SQL for this database schema:\n{SCHEMA_SUMMARY}"},
            {"role": "user", "content": question},
        ],
        temperature=0.1,
        max_tokens=300,
    )
    sql = response.choices[0].message.content
    print(f"Q: {question}")
    print(f"Generated SQL:\n{sql}")

    # Analysis
    if "FirstName" in sql or "LastName" in sql or "DOB" in sql:
        print("⚠️  RISK: SQL returns PII columns (names, DOB) — FERPA concern")
    if "DROP" in sql.upper() or "DELETE" in sql.upper() or "TRUNCATE" in sql.upper():
        print("🚨 INJECTION RISK: Destructive SQL generated from user input")
    print()

print("--- Lab observation ---")
print("Document in your lab report:")
print("1. Did the AI generate SQL that returns student names?")
print("2. Did the AI generate any destructive SQL?")
print("3. How does the approved view catalog prevent each risk shown here?")
```

## Part 5 — Verify Views Return No PII

```python
# scripts/lab04a_pii_check.py
"""Verify that approved views do not expose PII columns."""
import os, pyodbc
from dotenv import load_dotenv

load_dotenv(".env.local")

# Use ai_svc_readonly account (from updated .env.local)
conn_str = (
    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
    f"SERVER={os.environ['SQL_SERVER']};"
    f"DATABASE={os.environ['SQL_DATABASE']};"
    f"UID=ai_svc_readonly;"
    f"PWD=AI$vc_P0c_Readonly!;"
    "TrustServerCertificate=yes;"
)

PII_COLUMN_NAMES = {
    "firstname", "lastname", "middlename", "preferredname",
    "dateofbirth", "dob", "ssn", "socialsecuritynumber",
    "address", "phone", "email", "statestudentid", "localstudentid",
}

views_to_check = [
    "vw_AttendanceSummaryByStudentAndTerm",
    "vw_AttendanceSummaryBySchoolAndGrade",
    "vw_LocalAssessmentResultsBySchoolAndGrade",
    "vw_InterventionStudentSummary",
]

print("=== PII Column Check for Approved Views ===\n")

with pyodbc.connect(conn_str) as conn:
    cursor = conn.cursor()
    for view_name in views_to_check:
        cursor.execute(f"SELECT TOP 0 * FROM {view_name}")
        columns = [col[0].lower() for col in cursor.description]
        pii_found = [c for c in columns if c in PII_COLUMN_NAMES]
        if pii_found:
            print(f"  ⚠️  {view_name}: PII columns found! {pii_found}")
        else:
            print(f"  ✅ {view_name}: No PII columns ({len(columns)} columns: {columns})")
```

## Lab Completion Checklist

- [ ] All 9 approved views created in `SunlakeUnifiedDW` without errors
- [ ] `ai_svc_readonly` login and user created
- [ ] GRANT SELECT on all 9 views executed
- [ ] DENY SELECT on all base tables executed
- [ ] Permission test script run: views ALLOWED, base tables DENIED
- [ ] PII column check run: all views confirmed to have no PII columns
- [ ] (Optional) AI-generated SQL risk demo run on synthetic data
- [ ] Lab report documenting: which view was most complex to write, what PII was excluded, what the AI-generated SQL produced
- [ ] Updated `.env.local` to use `ai_svc_readonly` credentials

*Next: Lab 04b — Metadata Catalog*
