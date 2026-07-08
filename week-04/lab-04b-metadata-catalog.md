# Lab 04b — Metadata Catalog

**Week:** 4 | **Estimated time:** 2.5–3 hours  
**Prerequisites:** Lab 03a (AI Search index created); Module 08 (Metadata and Semantic Layers) read  
**Deliverable:** Full metadata catalog (all 5 document categories) uploaded to AI Search; retrieval tests passing for all domains

## Lab Objectives

1. Author the complete metadata catalog: all 9 view documents, 10+ business rules, 5+ domain overviews, 10+ FAQs, and 10+ glossary entries.
2. Upload all documents to the `susd-metadata-v1` AI Search index created in Lab 03a.
3. Run targeted retrieval tests across all five document categories.
4. Verify security trimming is correctly scoped per role for all applicable documents.
5. Identify and fix at least one retrieval gap by improving metadata content.

## Part 1 — Expand the Metadata Catalog

In Lab 03a you created 15 initial metadata documents. This lab expands to a full catalog. Create `scripts/lab04b_full_catalog.py`:

```python
# scripts/lab04b_full_catalog.py
"""
Full SUSD metadata catalog for the analytics assistant.
Includes all 5 document categories:
  - view (9)
  - business-rule (12)
  - domain-overview (5)
  - faq (12)
  - glossary (11)
Total: 49 documents
"""
from datetime import date

TODAY = str(date.today())
ALL_ROLES = ["teacher", "school_admin", "district_admin"]
ADMIN_ROLES = ["school_admin", "district_admin"]
DISTRICT_ONLY = ["district_admin"]

# ===========================================================================
# CATEGORY: view (9 documents — one per approved view)
# ===========================================================================

VIEW_DOCUMENTS = [
    {
        "id": "view-attendance-by-student",
        "title": "vw_AttendanceSummaryByStudentAndTerm — Student Attendance Lookup",
        "content": (
            "This view provides individual student-level attendance summaries without PII "
            "(no names, no dates of birth). Use this when a teacher needs attendance for "
            "specific students in their sections.\n"
            "Use for: My students' attendance rates, which students in my class are missing "
            "school, attendance for a specific section, how often my kids are absent, "
            "section-level absenteeism, classroom attendance.\n"
            "Do NOT use for: School-wide attendance summaries (use "
            "vw_AttendanceSummaryBySchoolAndGrade). Do NOT use for cross-school or "
            "district comparisons.\n"
            "Scope: Teacher access limited to own section IDs (enforced by API). "
            "School admins see their whole school. District admins see all schools.\n"
            "Parameters: SchoolYear (required, integer), SchoolID (required), "
            "TermID (optional: Q1, Q2, Q3, Q4, EOY), SectionID (required for teachers).\n"
            "Returns: One row per student per term. Fields: StudentKey (opaque), "
            "GradeLevel, TermID, DaysEnrolled, DaysPresent, DaysAbsent, "
            "AttendanceRate (%), IsChronicallyAbsent (yes/no)."
        ),
        "category": "view",
        "domain": "attendance",
        "view_name": "vw_AttendanceSummaryByStudentAndTerm",
        "parameters": "SchoolYear, SchoolID, TermID, SectionID",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "view-attendance-by-school-grade",
        "title": "vw_AttendanceSummaryBySchoolAndGrade — School-Level Attendance Summary",
        "content": (
            "This view provides aggregated attendance summaries by school and grade level. "
            "Use for school-level attendance rates, chronically absent counts by grade, "
            "how often students at a school are present, absence patterns, "
            "attendance percentages by grade band, absenteeism trends.\n"
            "Do NOT use for: Individual student attendance. Do NOT use for cross-year trends "
            "(use vw_LongitudinalProficiencyTrend). Do NOT use for subgroup breakdowns "
            "(use vw_AssessmentGapBySubgroup).\n"
            "Parameters: SchoolYear (required), SchoolID (optional — leave blank for all), "
            "TermID (optional: Q1, Q2, Q3, Q4, EOY), GradeLevel (optional: K, Grade 1–12).\n"
            "Returns: One row per school/grade/term. Fields: SchoolID, SchoolName, "
            "GradeLevel, TermID, SchoolYear, TotalEnrollment, AttendanceRate (%), "
            "ChronicallyAbsentCount, ChronicallyAbsentRate (%), AvgUnexcusedAbsences."
        ),
        "category": "view",
        "domain": "attendance",
        "view_name": "vw_AttendanceSummaryBySchoolAndGrade",
        "parameters": "SchoolYear, SchoolID, TermID, GradeLevel",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "view-local-assessment-by-school-grade",
        "title": "vw_LocalAssessmentResultsBySchoolAndGrade — District Assessment Results",
        "content": (
            "This view provides aggregated local assessment (FAST, i-Ready, or district benchmark) "
            "results by school, grade level, and assessment window. "
            "Use for: proficiency rates by grade, how well students are doing on reading or math, "
            "assessment scores, ELA proficiency, math proficiency, percent at grade level, "
            "percent below basic, BOY/MOY/EOY results, assessment performance, benchmark results.\n"
            "Do NOT use for: Individual student scores. Do NOT use for state FSA/FCAT/FAST results "
            "(use vw_StateAssessmentSummaryBySchoolAndGrade). Do NOT use for subgroup gaps "
            "(use vw_AssessmentGapBySubgroup).\n"
            "Parameters: SchoolYear (required), SchoolID (optional), "
            "AssessmentWindow (optional: BOY, MOY, EOY), "
            "GradeLevel (optional), SubjectArea (optional: ELA, Math, Science, Social Studies).\n"
            "Returns: One row per school/grade/subject/window. Fields: SchoolID, SchoolName, "
            "GradeLevel, SubjectArea, AssessmentWindow, SchoolYear, TotalAssessed, AvgScore, "
            "PctBelowBasic, PctBasic, PctProficient, PctAdvanced, PctProficientOrAbove."
        ),
        "category": "view",
        "domain": "assessment",
        "view_name": "vw_LocalAssessmentResultsBySchoolAndGrade",
        "parameters": "SchoolYear, SchoolID, AssessmentWindow, GradeLevel, SubjectArea",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "view-state-assessment-by-school-grade",
        "title": "vw_StateAssessmentSummaryBySchoolAndGrade — State Assessment Results (FAST/FSA)",
        "content": (
            "This view provides aggregated Florida state assessment results (FAST, FSA, formerly FCAT) "
            "by school and grade level. "
            "Use for: state test scores, FAST results, FSA results, Florida assessment scores, "
            "Achievement Levels 1–5, percent at or above grade level on state test, "
            "state testing performance.\n"
            "Do NOT use for: Local or district benchmark assessments (use "
            "vw_LocalAssessmentResultsBySchoolAndGrade). Do NOT use for subgroup analysis "
            "(use vw_AssessmentGapBySubgroup).\n"
            "Parameters: SchoolYear (required), SchoolID (optional), "
            "GradeLevel (optional), SubjectArea (optional: ELA, Math).\n"
            "Returns: Fields: SchoolID, SchoolName, GradeLevel, SubjectArea, SchoolYear, "
            "TotalTested, PctLevel1 through PctLevel5, PctAtOrAboveGradeLevel."
        ),
        "category": "view",
        "domain": "assessment",
        "view_name": "vw_StateAssessmentSummaryBySchoolAndGrade",
        "parameters": "SchoolYear, SchoolID, GradeLevel, SubjectArea",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "view-assessment-gap-by-subgroup",
        "title": "vw_AssessmentGapBySubgroup — Achievement Gap by Student Subgroup",
        "content": (
            "This view shows assessment proficiency rates broken down by student subgroup categories: "
            "race/ethnicity, economic status, English language learner status, disability status. "
            "Use for: achievement gaps, equity analysis, subgroup proficiency, "
            "how are ELL students doing, special education proficiency rates, "
            "Hispanic student performance, economically disadvantaged results, "
            "gap analysis, performance disparities between groups.\n"
            "Note: Small cell suppression applies — groups with fewer than 10 students return NULL "
            "for proficiency rates to protect student privacy.\n"
            "Do NOT use for: Overall school-level proficiency without subgroup breakdown "
            "(use vw_LocalAssessmentResultsBySchoolAndGrade).\n"
            "Parameters: SchoolYear (required), SchoolID (optional), "
            "GradeLevel (optional), SubjectArea (optional), SubgroupCategory (optional).\n"
            "Returns: Fields: SchoolID, SchoolName, GradeLevel, SubjectArea, SchoolYear, "
            "SubgroupCategory, SubgroupName, GroupCount, ProficiencyRate (NULL if n < 10)."
        ),
        "category": "view",
        "domain": "assessment",
        "view_name": "vw_AssessmentGapBySubgroup",
        "parameters": "SchoolYear, SchoolID, GradeLevel, SubjectArea, SubgroupCategory",
        "role_scope": ADMIN_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "view-performance-vs-benchmark",
        "title": "vw_PerformanceVsBenchmark — Proficiency vs. District Targets",
        "content": (
            "This view compares actual school proficiency rates against district-set benchmark targets. "
            "Use for: Are we meeting our goals? How far above or below target? "
            "benchmark comparison, target attainment, are we on track, gap from goal, "
            "variance from benchmark, school improvement metrics, how close to target.\n"
            "Do NOT use for: Absolute proficiency rates without benchmark context "
            "(use vw_LocalAssessmentResultsBySchoolAndGrade). Do NOT use for trend analysis.\n"
            "Parameters: SchoolYear (required), SchoolID (optional), "
            "GradeLevel (optional), SubjectArea (optional).\n"
            "Returns: Fields: SchoolID, SchoolName, GradeLevel, SubjectArea, SchoolYear, "
            "ActualProficiency, BenchmarkTarget, VarianceFromTarget (+/- pp), "
            "BenchmarkStatus (At/Above Target | Near Target | Below Target)."
        ),
        "category": "view",
        "domain": "assessment",
        "view_name": "vw_PerformanceVsBenchmark",
        "parameters": "SchoolYear, SchoolID, GradeLevel, SubjectArea",
        "role_scope": ADMIN_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "view-longitudinal-proficiency",
        "title": "vw_LongitudinalProficiencyTrend — Year-Over-Year Proficiency Trend",
        "content": (
            "This view provides year-over-year EOY proficiency data to show trends across school years. "
            "Use for: Are we improving? Multi-year trends, year-over-year comparison, "
            "proficiency over time, have scores been going up or down, "
            "historical performance, growth trends, improvement over the years, "
            "how have results changed since last year.\n"
            "Note: Only uses EOY (end-of-year) assessment data for consistent year-over-year comparisons.\n"
            "Do NOT use for: Within-year comparisons (BOY vs. EOY) — use "
            "vw_LocalAssessmentResultsBySchoolAndGrade with AssessmentWindow filter.\n"
            "Parameters: SchoolID (required for school-level), "
            "GradeLevel (optional), SubjectArea (optional).\n"
            "Returns: Fields: SchoolID, SchoolName, GradeLevel, SubjectArea, SchoolYear, "
            "TotalAssessed, ProficiencyRate (% at Level 3+) — ordered by year."
        ),
        "category": "view",
        "domain": "assessment",
        "view_name": "vw_LongitudinalProficiencyTrend",
        "parameters": "SchoolID, GradeLevel, SubjectArea",
        "role_scope": ADMIN_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "view-intervention-summary",
        "title": "vw_InterventionStudentSummary — Intervention and MTSS Summary",
        "content": (
            "This view summarizes students in intervention programs, grouped by school, tier, and program. "
            "Use for: intervention counts, how many students are in Tier 2 or Tier 3, "
            "MTSS numbers, reading intervention students, math intervention enrollment, "
            "intervention program participation, how many students need extra support, "
            "intensive intervention, supplemental support students.\n"
            "Do NOT use for: Individual student intervention records (not available through AI). "
            "Do NOT use for attendance by intervention group (join is complex — describe in text).\n"
            "Parameters: SchoolYear (required), SchoolID (optional), TierLevel (optional: 1, 2, 3).\n"
            "Returns: Fields: SchoolID, SchoolName, SchoolYear, TierLevel, ProgramName, "
            "StudentCount, AvgAttendanceRate."
        ),
        "category": "view",
        "domain": "intervention",
        "view_name": "vw_InterventionStudentSummary",
        "parameters": "SchoolYear, SchoolID, TierLevel",
        "role_scope": ADMIN_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "view-data-quality-flags",
        "title": "vw_DataQualityFlags — Data Quality Issues by School",
        "content": (
            "This view reports known data quality issues in the data warehouse by school and year. "
            "Use for: data quality problems, missing attendance records, attendance rate above 100%, "
            "data errors, data issues at my school, students without attendance data, "
            "data completeness, data validation.\n"
            "Do NOT use for: Student-level data (aggregate counts only).\n"
            "Parameters: SchoolYear (required), SchoolID (optional).\n"
            "Returns: Fields: SchoolID, SchoolName, SchoolYear, IssueCategory, IssueCount."
        ),
        "category": "view",
        "domain": "data-quality",
        "view_name": "vw_DataQualityFlags",
        "parameters": "SchoolYear, SchoolID",
        "role_scope": ADMIN_ROLES,
        "last_updated": TODAY,
    },
]

# ===========================================================================
# CATEGORY: business-rule (12 documents)
# ===========================================================================

BUSINESS_RULE_DOCUMENTS = [
    {
        "id": "rule-chronically-absent",
        "title": "Business Rule: Chronic Absenteeism Definition",
        "content": (
            "Definition: A student is considered chronically absent if they miss 10% or more "
            "of their total enrolled school days in a given period.\n"
            "Calculation: (DaysAbsent / DaysEnrolled) × 100 ≥ 10.0%\n"
            "Applies to: All absence types — excused, unexcused, and suspension days all count.\n"
            "Scope: Calculated per term and per full year; the annual measure uses the EOY view.\n"
            "Source: SUSD Board Policy 5.14; aligns with Florida DOE definition.\n"
            "Alternate names: chronic absence, chronically absent student, high absenteeism, "
            "missing too many days, excessive absences."
        ),
        "category": "business-rule",
        "domain": "attendance",
        "view_name": "vw_AttendanceSummaryBySchoolAndGrade",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-proficiency-levels",
        "title": "Business Rule: Proficiency Level Definitions (Local Assessments)",
        "content": (
            "SUSD uses a 4-level performance scale for local assessments:\n"
            "  Level 1 (Below Basic): Below 40th percentile. Immediate intensive support needed.\n"
            "  Level 2 (Basic): 40th–59th percentile. Supplemental support recommended.\n"
            "  Level 3 (Proficient): 60th–79th percentile. At grade level. Grade-level standard met.\n"
            "  Level 4 (Advanced): 80th percentile and above. Exceeds grade-level standard.\n"
            "Proficient or Above: Levels 3 and 4 combined — the primary district reporting metric.\n"
            "Alternate phrasings: at grade level, meeting standards, grade level proficiency, "
            "percent proficient, achievement levels, performance bands."
        ),
        "category": "business-rule",
        "domain": "assessment",
        "view_name": "vw_LocalAssessmentResultsBySchoolAndGrade",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-state-achievement-levels",
        "title": "Business Rule: Florida State Assessment Achievement Levels",
        "content": (
            "Florida state assessments (FAST, FSA) use Achievement Levels 1–5:\n"
            "  Level 1: Inadequate — significant gaps in skills; urgent support required.\n"
            "  Level 2: Below satisfactory — approaching but not meeting grade level expectations.\n"
            "  Level 3: Satisfactory — meets grade level expectations.\n"
            "  Level 4: Proficient — exceeds grade level expectations.\n"
            "  Level 5: Mastery — outstanding performance well above grade level.\n"
            "At or Above Grade Level: Levels 3, 4, and 5 combined.\n"
            "Note: FAST replaced FSA starting with the 2022-23 school year. "
            "Historic data from FSA is stored using the same level scale for consistency.\n"
            "Alternate names: FAST levels, FSA achievement levels, state scores, state results."
        ),
        "category": "business-rule",
        "domain": "assessment",
        "view_name": "vw_StateAssessmentSummaryBySchoolAndGrade",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-intervention-tiers",
        "title": "Business Rule: MTSS Intervention Tier Definitions",
        "content": (
            "SUSD uses the Multi-Tiered System of Support (MTSS) framework with 3 tiers:\n"
            "  Tier 1 (Universal): Core instruction for all students — not a targeted intervention.\n"
            "  Tier 2 (Strategic/Supplemental): Additional targeted support for at-risk students. "
            "Typically small-group instruction 3–5x per week. Student has not responded adequately "
            "to Tier 1 alone.\n"
            "  Tier 3 (Intensive): Individualized intensive support. 5x per week or more. "
            "Student has not responded to Tier 1 + Tier 2 combined. Often accompanied by "
            "referral process for special services.\n"
            "Note: Tier 1 students are NOT in the intervention database — only Tiers 2 and 3 appear "
            "in the data warehouse intervention tables.\n"
            "Alternate names: RTI, response to intervention, tiered support, intensive intervention, "
            "supplemental support, small group intervention."
        ),
        "category": "business-rule",
        "domain": "intervention",
        "view_name": "vw_InterventionStudentSummary",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-school-year-convention",
        "title": "Business Rule: School Year Convention",
        "content": (
            "SUSD identifies school years by the ending calendar year.\n"
            "Examples:\n"
            "  2025-26 school year → SchoolYear = 2026\n"
            "  2024-25 school year → SchoolYear = 2025\n"
            "  Current school year (2025-26) → use SchoolYear = 2026\n"
            "When a user asks 'this year' or 'current year', always clarify with the "
            "actual school year dates in the response. The current academic year "
            "runs from August 2025 to June 2026 (SchoolYear = 2026)."
        ),
        "category": "business-rule",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-term-definitions",
        "title": "Business Rule: Term Code Definitions (Q1, Q2, Q3, Q4, EOY)",
        "content": (
            "SUSD divides the school year into grading periods (terms):\n"
            "  Q1 (First Quarter): August – October\n"
            "  Q2 (Second Quarter): November – January\n"
            "  Q3 (Third Quarter): February – March\n"
            "  Q4 (Fourth Quarter): April – June\n"
            "  EOY (End of Year): Represents the full school year; used for final annual summaries "
            "and end-of-year state assessment reporting.\n"
            "When users refer to 'first quarter,' 'Q1,' or 'fall term,' map to TermID = 'Q1'.\n"
            "When users ask for 'the whole year' or 'annual,' use EOY.\n"
            "Alternate names: quarter, grading period, marking period, reporting period, semester."
        ),
        "category": "business-rule",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-small-cell-suppression",
        "title": "Business Rule: Small Cell Suppression (Privacy)",
        "content": (
            "Definition: When a subgroup or category contains fewer than 10 students, "
            "the data warehouse returns NULL for rates and percentages in that cell.\n"
            "Purpose: Protects student privacy — small groups can reveal individual student "
            "performance or identity even without showing names.\n"
            "What the AI reports when suppressed: 'Data for this group is not shown because the "
            "group size is below the 10-student reporting threshold. This is a privacy protection.'\n"
            "Applies to: vw_AssessmentGapBySubgroup, other subgroup-level views.\n"
            "FERPA basis: FERPA prohibits disclosure that can reasonably identify a student; "
            "small cell suppression prevents re-identification from aggregate data.\n"
            "Alternate names: data suppression, suppressed data, privacy threshold, n < 10 rule."
        ),
        "category": "business-rule",
        "domain": "assessment",
        "view_name": "vw_AssessmentGapBySubgroup",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-attendance-rate-calc",
        "title": "Business Rule: Attendance Rate Calculation",
        "content": (
            "Formula: AttendanceRate = (DaysPresent / DaysEnrolled) × 100\n"
            "All absence types reduce DaysPresent: excused absences, unexcused absences, "
            "and out-of-school suspensions all count as absent days.\n"
            "In-school suspensions: does NOT reduce DaysPresent (student is on campus).\n"
            "DaysEnrolled: only includes school days during which the student was actively enrolled. "
            "A student who enrolls mid-quarter has fewer DaysEnrolled.\n"
            "Expected range: 0%–100%. Values above 100% indicate a data quality issue "
            "(flagged in vw_DataQualityFlags).\n"
            "District target: 95% or above attendance rate.\n"
            "Alternate names: present rate, average daily attendance, ADA, attendance percentage."
        ),
        "category": "business-rule",
        "domain": "attendance",
        "view_name": "vw_AttendanceSummaryBySchoolAndGrade",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-data-access-ferpa",
        "title": "Business Rule: FERPA Data Access Restrictions",
        "content": (
            "This analytics assistant enforces FERPA (Family Educational Rights and Privacy Act) "
            "data access rules:\n"
            "1. No individual student education records are disclosed through this interface. "
            "Only aggregated or role-scoped summaries are available.\n"
            "2. Teacher access is limited to students on their assigned class roster only.\n"
            "3. School administrators see their school only.\n"
            "4. Questions that would require disclosing identifiable student data "
            "(names, test scores, grades, discipline records, health info for individual students) "
            "will be declined regardless of the requestor's role.\n"
            "5. Small cell suppression applies when group sizes fall below 10 students.\n"
            "If you believe you need access beyond what is provided here, contact the SUSD "
            "Data Privacy Officer.\n"
            "Note: This is not a legal data access system — always consult your FERPA coordinator "
            "for official guidance."
        ),
        "category": "business-rule",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-assessment-window",
        "title": "Business Rule: Assessment Window (BOY, MOY, EOY)",
        "content": (
            "SUSD uses three assessment windows per school year:\n"
            "  BOY (Beginning of Year): August–September. Diagnostic baseline measure.\n"
            "  MOY (Middle of Year): January–February. Progress monitoring checkpoint.\n"
            "  EOY (End of Year): April–May. Summative annual measure; used for state reporting.\n"
            "When users ask about 'spring results,' 'fall results,' 'baseline,' or "
            "'mid-year scores,' map to the appropriate window.\n"
            "Growth: progress from BOY to MOY, or BOY to EOY, shows instructional gains. "
            "Use vw_LongitudinalProficiencyTrend with EOY only for year-over-year trend.\n"
            "Alternate names: testing window, assessment period, diagnostic window, "
            "winter benchmark, spring benchmark."
        ),
        "category": "business-rule",
        "domain": "assessment",
        "view_name": "vw_LocalAssessmentResultsBySchoolAndGrade",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-benchmark-target",
        "title": "Business Rule: District Benchmark Targets",
        "content": (
            "SUSD sets annual proficiency benchmarks by school, grade, and subject area. "
            "Targets are updated each August before the school year begins.\n"
            "BenchmarkTarget: The percentage proficient (Level 3+) the school is expected "
            "to achieve by EOY.\n"
            "BenchmarkStatus values:\n"
            "  'At/Above Target': Actual proficiency ≥ benchmark target.\n"
            "  'Near Target': Actual proficiency within 5 percentage points below target.\n"
            "  'Below Target': Actual proficiency more than 5 percentage points below target.\n"
            "Alternate phrasings: target, goal, benchmark, expected proficiency, meeting the goal, "
            "on track, are we hitting our marks."
        ),
        "category": "business-rule",
        "domain": "assessment",
        "view_name": "vw_PerformanceVsBenchmark",
        "parameters": "",
        "role_scope": ADMIN_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "rule-grade-level-codes",
        "title": "Business Rule: Grade Level Code Conventions",
        "content": (
            "SUSD uses the following GradeLevel codes in all data views:\n"
            "  K = Kindergarten\n"
            "  Grade 1 through Grade 12 (spelled out with 'Grade' prefix)\n"
            "When users say 'kindergartners,' 'kinder,' or 'K students,' use GradeLevel = 'K'.\n"
            "When users say '3rd grade,' 'third grade,' 'Grade 3,' use GradeLevel = 'Grade 3'.\n"
            "When users refer to 'elementary school,' typical grade range is K–5.\n"
            "When users refer to 'middle school,' typical grade range is Grade 6–8.\n"
            "When users refer to 'high school,' typical grade range is Grade 9–12.\n"
            "Note: SUSD has no PreK data in the warehouse currently."
        ),
        "category": "business-rule",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
]

# ===========================================================================
# CATEGORY: domain-overview (5 documents)
# ===========================================================================

DOMAIN_OVERVIEW_DOCUMENTS = [
    {
        "id": "overview-attendance",
        "title": "Domain Overview: Attendance Data",
        "content": (
            "The SUSD attendance data domain tracks daily student attendance across all schools. "
            "Data is captured in the Student Information System (SIS) and loaded nightly to the "
            "data warehouse.\n"
            "Data available: Daily attendance marks (present, excused absent, unexcused absent, "
            "suspension), calculated rates and chronic absenteeism flags, by student, school, "
            "grade level, and term.\n"
            "Data NOT available through this interface: Reason codes for individual student absences, "
            "contact history with parents, teacher-entered absence notes, real-time same-day data.\n"
            "Refresh schedule: Nightly, completing between 2–4 AM. Most recent data reflects "
            "the previous school day.\n"
            "Key views: vw_AttendanceSummaryByStudentAndTerm, vw_AttendanceSummaryBySchoolAndGrade.\n"
            "Who can access: All roles can access attendance summaries. "
            "Teachers see their sections; school admins see their school; district admins see all."
        ),
        "category": "domain-overview",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "overview-assessment",
        "title": "Domain Overview: Assessment Data",
        "content": (
            "The SUSD assessment data domain includes both local/district assessments and "
            "Florida state assessments.\n"
            "Local assessments: i-Ready, STAR Reading/Math, and SUSD benchmark assessments. "
            "Given three times per year (BOY, MOY, EOY). Stored in fact_LocalAssessmentResult.\n"
            "State assessments: FAST ELA and FAST Math (Florida Assessment of Student Thinking). "
            "Given once per year (spring). Stored in fact_StateAssessmentResult.\n"
            "Data NOT available through this interface: Individual student scores or names, "
            "raw item-level response data, teacher gradebook grades.\n"
            "Refresh schedule: Local assessment results load within 48 hours of test completion. "
            "State assessment results load annually after official DOE release (typically July).\n"
            "Key views: vw_LocalAssessmentResultsBySchoolAndGrade, "
            "vw_StateAssessmentSummaryBySchoolAndGrade, vw_AssessmentGapBySubgroup, "
            "vw_PerformanceVsBenchmark, vw_LongitudinalProficiencyTrend.\n"
            "Note: FCAT (Florida Comprehensive Assessment Test) is discontinued. "
            "FSA (Florida Standards Assessment) ran 2014-2023 and is now replaced by FAST."
        ),
        "category": "domain-overview",
        "domain": "assessment",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "overview-intervention",
        "title": "Domain Overview: Intervention and MTSS Data",
        "content": (
            "The SUSD intervention data domain tracks students receiving supplemental academic "
            "support through the Multi-Tiered System of Support (MTSS) framework.\n"
            "Data available: Tier 2 and Tier 3 enrollment by student, school, program, and year. "
            "Intervention program names (reading, math, behavioral). "
            "Average attendance rates for intervention groups.\n"
            "Data NOT available through this interface: Individual progress monitoring scores, "
            "individual student intervention records, specific interventionist assignments.\n"
            "Refresh schedule: Weekly on Fridays. Does not include same-week changes.\n"
            "Key views: vw_InterventionStudentSummary.\n"
            "Note: Tier 1 is universal instruction for all students and does NOT appear in the "
            "intervention data. Only Tier 2 and Tier 3 students are tracked in the warehouse."
        ),
        "category": "domain-overview",
        "domain": "intervention",
        "view_name": "",
        "parameters": "",
        "role_scope": ADMIN_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "overview-data-quality",
        "title": "Domain Overview: Data Quality",
        "content": (
            "The SUSD data warehouse includes automated data quality checks run nightly.\n"
            "Issues tracked: Missing attendance records (students with no marks), "
            "attendance rates above 100% (data entry error), students enrolled in multiple "
            "schools simultaneously (transfer data issues).\n"
            "View available: vw_DataQualityFlags shows issue category and count by school and year.\n"
            "Not shown in this interface: Row-level data issues, specific student records with "
            "quality problems, manual correction history.\n"
            "Escalation: Data quality issues should be reported to the district Data Systems team "
            "at datasystems@susd.edu."
        ),
        "category": "domain-overview",
        "domain": "data-quality",
        "view_name": "",
        "parameters": "",
        "role_scope": ADMIN_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "overview-privacy-scope",
        "title": "Domain Overview: Privacy and Data Scope",
        "content": (
            "The SUSD analytics assistant is designed to provide aggregated, role-scoped "
            "summaries only. This interface does NOT provide access to:\n"
            "- Individual student names, IDs, or identifiable information\n"
            "- Student health records or disability details beyond subgroup aggregates\n"
            "- Discipline records, suspension reasons, or referral details\n"
            "- Teacher evaluation or personnel records\n"
            "- Financial or budgetary information\n"
            "- Real-time or same-day data\n"
            "All data access is role-scoped: teachers see their roster only, "
            "school administrators see their school, district administrators see all schools.\n"
            "Questions that would require disclosing individual student education records "
            "will be declined in accordance with FERPA."
        ),
        "category": "domain-overview",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
]

# ===========================================================================
# CATEGORY: faq (12 documents)
# ===========================================================================

FAQ_DOCUMENTS = [
    {
        "id": "faq-data-refresh",
        "title": "FAQ: When is attendance data refreshed?",
        "content": (
            "Question: When is attendance data updated? How current is the data? Is this real-time?\n"
            "Answer: Attendance data is refreshed nightly, completing between 2:00–4:00 AM. "
            "Data reflects the previous school day. Same-day data is not available. "
            "Assessment data: local assessments load within 48 hours of testing. "
            "State assessment data loads annually after official DOE release.\n"
            "Alternate forms: How old is the data? Is this live data? How soon does attendance update?"
        ),
        "category": "faq",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-who-can-see-what",
        "title": "FAQ: What data can each role access?",
        "content": (
            "Question: What can I see? What data am I authorized to access?\n"
            "Answer:\n"
            "Teacher: Attendance and assessment data for students on your class roster only. "
            "You cannot see other teachers' students or other schools.\n"
            "School Administrator: All attendance, assessment, and intervention data for your school. "
            "All grades, all students at your school. Cannot see other schools.\n"
            "District Administrator: All data for all schools district-wide.\n"
            "Access is determined by your district directory role and cannot be changed through "
            "this interface. Contact your principal or district IT for access questions."
        ),
        "category": "faq",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-individual-student",
        "title": "FAQ: Can I look up an individual student?",
        "content": (
            "Question: Can I see one specific student's data? Can I look up a student by name? "
            "Can I see attendance for just one kid?\n"
            "Answer: No. This interface does not show individual student records by name or "
            "student ID — this is a FERPA protection. "
            "The attendance view for teacher-level access shows summary data by section "
            "using anonymous student keys, not names.\n"
            "For individual student records, use your Student Information System (SIS) directly. "
            "Contact your school's data secretary or front office staff if you need assistance."
        ),
        "category": "faq",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-what-can-assistant-do",
        "title": "FAQ: What can this assistant help with?",
        "content": (
            "Question: What questions can I ask? What does this tool do?\n"
            "Answer: This assistant helps you understand attendance and assessment patterns "
            "across your school or classroom using data from the SUSD data warehouse.\n"
            "Good questions to ask:\n"
            "  - 'What is the attendance rate in Grade 3 at my school this quarter?'\n"
            "  - 'How many students are chronically absent at Palmetto Ridge?'\n"
            "  - 'What is the ELA proficiency rate for Grade 5 compared to last year?'\n"
            "  - 'Are Grade 7 math scores at or above the district benchmark?'\n"
            "  - 'How many students are in Tier 2 intervention this year?'\n"
            "Not supported: Individual student lookup, financial data, discipline records, "
            "gradebook access, real-time data."
        ),
        "category": "faq",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-suppressed-data",
        "title": "FAQ: Why is data suppressed or showing NULL?",
        "content": (
            "Question: Why does the data show 'suppressed' or NULL? Why can't I see the number?\n"
            "Answer: When a student group has fewer than 10 students, rates and percentages are "
            "not shown to protect student privacy. Showing percentages for small groups could "
            "allow identification of individual students, even without showing names.\n"
            "This is a district policy aligned with FERPA (Family Educational Rights and Privacy Act).\n"
            "What you can see: The group count (showing n < 10) but not the rate.\n"
            "If you need the exact data for a specific small group, contact the district "
            "Data Privacy Officer for a formal data request."
        ),
        "category": "faq",
        "domain": "assessment",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-different-assessment-types",
        "title": "FAQ: What is the difference between FAST, FSA, and local assessments?",
        "content": (
            "Question: What assessments does SUSD use? What is FAST? What is FSA? "
            "What are local assessments?\n"
            "Answer:\n"
            "FAST (Florida Assessment of Student Thinking): The current Florida state ELA and Math "
            "test, given once per year in spring for Grades 3–10. Replaced FSA starting 2022-23.\n"
            "FSA (Florida Standards Assessments): Prior state assessment (2014-2023). "
            "Historic results are stored in the warehouse.\n"
            "FCAT: Even older Florida test (discontinued 2014) — not in the data warehouse.\n"
            "Local/District Assessments: SUSD-administered assessments (i-Ready, STAR, benchmarks) "
            "given 3 times per year (BOY, MOY, EOY). These are in a separate view from FAST/FSA.\n"
            "To compare schools, use district assessments (same test, same conditions). "
            "State results are official for AYP/school grade calculations."
        ),
        "category": "faq",
        "domain": "assessment",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-mtss-tier1",
        "title": "FAQ: Why don't I see Tier 1 in the intervention data?",
        "content": (
            "Question: I don't see Tier 1 in the intervention report. Where is it?\n"
            "Answer: Tier 1 is universal core instruction for all students and is NOT tracked "
            "as a separate intervention in the warehouse. Every student receives Tier 1 "
            "by definition — it is not a targeted support program.\n"
            "The intervention data shows only Tiers 2 and 3 — students who have been identified "
            "as needing targeted or intensive supplemental support beyond core instruction.\n"
            "If you want to see total enrollment (all students), refer to the attendance data "
            "which shows TotalEnrollment per school and grade."
        ),
        "category": "faq",
        "domain": "intervention",
        "view_name": "",
        "parameters": "",
        "role_scope": ADMIN_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-school-year-current",
        "title": "FAQ: What school year does 'current' refer to?",
        "content": (
            "Question: When I ask about 'this year' or 'current year,' what does that mean?\n"
            "Answer: The current school year is 2025-26, coded as SchoolYear = 2026 in the database. "
            "SUSD uses the ending calendar year as the school year code.\n"
            "Examples:\n"
            "  'This year' → 2025-26 → SchoolYear = 2026\n"
            "  'Last year' → 2024-25 → SchoolYear = 2025\n"
            "  'Two years ago' → 2023-24 → SchoolYear = 2024\n"
            "Data for the current year is available from the start of school in August 2025. "
            "Summer months (June–August) typically show no school activity data."
        ),
        "category": "faq",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-report-data-issue",
        "title": "FAQ: How do I report a data error?",
        "content": (
            "Question: The data looks wrong. How do I report a problem with the data?\n"
            "Answer: If you believe the data is inaccurate:\n"
            "1. Check if it might be a data refresh timing issue — data is loaded nightly, "
            "not in real-time.\n"
            "2. Verify in your SIS (Student Information System) directly for the most authoritative record.\n"
            "3. If the discrepancy persists, report it to datasystems@susd.edu with:\n"
            "   - Your name and role\n"
            "   - The school and time period in question\n"
            "   - What the data shows vs. what you expected\n"
            "The Data Systems team investigates and corrects warehouse data issues. "
            "Data Quality flags are also visible in the vw_DataQualityFlags view."
        ),
        "category": "faq",
        "domain": "data-quality",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-compare-schools",
        "title": "FAQ: Can I compare two schools?",
        "content": (
            "Question: Can I compare attendance or test scores between two schools? "
            "Which school is doing better?\n"
            "Answer: District administrators can compare schools by leaving the SchoolID filter "
            "blank — the view returns all schools. School administrators can only see their own school.\n"
            "To compare two schools, ask: 'What is the Q1 attendance rate for each school in Grade 5?' "
            "The assistant will return all schools and you can compare the results.\n"
            "Note: Direct 'better' comparisons should be made thoughtfully — schools serve different "
            "student populations. Consider subgroup data and context before drawing conclusions."
        ),
        "category": "faq",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ADMIN_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-what-not-available",
        "title": "FAQ: What data is NOT available through this interface?",
        "content": (
            "Question: What can't this assistant help me with?\n"
            "Answer: The following are NOT available through this assistant:\n"
            "- Individual student records by name or ID\n"
            "- Individual student test scores or grades\n"
            "- Teacher gradebook data\n"
            "- Financial or budget information\n"
            "- Discipline or behavior records\n"
            "- Staff HR records or evaluations\n"
            "- Real-time data (same-day attendance)\n"
            "- Special education records or IEP details\n"
            "- Transportation routing\n"
            "- Parent contact information\n"
            "For these, use your SIS, SPED system, or contact the relevant district department."
        ),
        "category": "faq",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "faq-trust-ai-answers",
        "title": "FAQ: How accurate are the AI responses? Can I trust this data?",
        "content": (
            "Question: How accurate is this? Should I trust what the AI tells me?\n"
            "Answer: The assistant retrieves data directly from the SUSD data warehouse — "
            "it does not make up numbers. When it provides attendance rates or assessment scores, "
            "those numbers come from actual database queries using approved, validated views.\n"
            "However:\n"
            "1. Always verify critical decisions with the Data Systems team or SIS directly.\n"
            "2. The assistant may misinterpret ambiguous questions — read its answer carefully.\n"
            "3. If the assistant says 'I don't have data for that,' take it at face value — "
            "it means the data isn't available through this interface.\n"
            "4. Data is as current as the last nightly load — not same-day.\n"
            "Report any suspicious or incorrect responses to datasystems@susd.edu."
        ),
        "category": "faq",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
]

# ===========================================================================
# CATEGORY: glossary (11 documents)
# ===========================================================================

GLOSSARY_DOCUMENTS = [
    {
        "id": "glossary-chronic-absenteeism",
        "title": "Glossary: Chronic Absenteeism",
        "content": (
            "Term: Chronic Absenteeism\n"
            "Definition: Missing 10% or more of enrolled school days, regardless of reason. "
            "Includes excused and unexcused absences.\n"
            "Threshold: 10% or more of enrolled days = chronically absent flag.\n"
            "Example: 18 school days absent in a 180-day year = 10% = chronically absent.\n"
            "Alternate terms: chronic absence, chronic absentee, excessive absence, "
            "missing too much school, habitually absent, significantly absent."
        ),
        "category": "glossary",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "glossary-proficiency",
        "title": "Glossary: Proficiency / At Grade Level",
        "content": (
            "Term: Proficiency / At Grade Level\n"
            "Definition: For SUSD local assessments, a student is proficient if they score at "
            "Level 3 (Proficient) or Level 4 (Advanced). The metric 'PctProficientOrAbove' "
            "reflects the combined percentage at Levels 3 and 4.\n"
            "For state FAST assessments, 'at or above grade level' means Achievement Levels 3, 4, or 5.\n"
            "Alternate terms: at grade level, meeting standards, grade level expectations, "
            "on grade level, passing, Level 3 or above, proficient rate."
        ),
        "category": "glossary",
        "domain": "assessment",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "glossary-mtss",
        "title": "Glossary: MTSS (Multi-Tiered System of Supports)",
        "content": (
            "Term: MTSS / RTI\n"
            "Definition: Multi-Tiered System of Supports. A framework for providing "
            "differentiated academic and behavioral support to students.\n"
            "Tier 1: Universal core instruction for all students.\n"
            "Tier 2: Targeted supplemental support for at-risk students (group-based).\n"
            "Tier 3: Intensive individualized support for students not responding to Tier 2.\n"
            "Alternate terms: RTI (Response to Intervention), tiered support, "
            "tiered intervention, supplemental support, intensive support, Tier 2 kids, "
            "students in intervention."
        ),
        "category": "glossary",
        "domain": "intervention",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "glossary-fast",
        "title": "Glossary: FAST Assessment (Florida Assessment of Student Thinking)",
        "content": (
            "Term: FAST\n"
            "Full name: Florida Assessment of Student Thinking\n"
            "Description: Florida's current statewide student assessment for ELA and Math, "
            "Grades 3–10. Replaced FSA starting in the 2022-23 school year.\n"
            "Scoring: Achievement Levels 1–5 (see State Assessment Achievement Levels rule).\n"
            "Administered: Once per year, spring (typically April–May).\n"
            "Alternate terms: state test, FAST scores, Florida state assessment, standardized test. "
            "Do NOT confuse with FSA (older test) or FCAT (discontinued 2014)."
        ),
        "category": "glossary",
        "domain": "assessment",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "glossary-boy-moy-eoy",
        "title": "Glossary: BOY / MOY / EOY Assessment Windows",
        "content": (
            "Terms: BOY, MOY, EOY\n"
            "BOY = Beginning of Year. Assessment given in August-September. "
            "Baseline / diagnostic. Also called: fall benchmark, fall assessment, diagnostic screening.\n"
            "MOY = Middle of Year. Assessment given in January-February. "
            "Progress check. Also called: winter benchmark, mid-year screener.\n"
            "EOY = End of Year. Assessment given in April-May. "
            "Summative / final measure. Also called: spring benchmark, spring assessment.\n"
            "In SUSD data warehouse: stored as AssessmentWindow field with values 'BOY', 'MOY', 'EOY'."
        ),
        "category": "glossary",
        "domain": "assessment",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "glossary-attendance-rate",
        "title": "Glossary: Attendance Rate",
        "content": (
            "Term: Attendance Rate\n"
            "Definition: The percentage of enrolled school days a student is present.\n"
            "Formula: (DaysPresent / DaysEnrolled) × 100\n"
            "District target: 95% or above.\n"
            "Interpretation: 90% = missing approximately 18 days per year (chronic threshold).\n"
            "Alternate terms: present rate, attendance percentage, ADA (Average Daily Attendance), "
            "how often students come to school, presence rate, daily attendance."
        ),
        "category": "glossary",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "glossary-ell",
        "title": "Glossary: ELL / EL / ESOL Students",
        "content": (
            "Terms: ELL, EL, ESOL, English Language Learners\n"
            "Definition: Students who are learning English as an additional language and have been "
            "identified as having limited English proficiency.\n"
            "In SUSD data: ELL status appears in the Subgroup dimension as subgroup category "
            "'English Language Learner Status' with values 'ELL' and 'Non-ELL'.\n"
            "Alternate terms: English learners, ESOL students, language learners, "
            "ELL students, English language learners, multilingual learners, MLLs."
        ),
        "category": "glossary",
        "domain": "assessment",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "glossary-ferpa",
        "title": "Glossary: FERPA",
        "content": (
            "Term: FERPA\n"
            "Full name: Family Educational Rights and Privacy Act\n"
            "Description: A federal law that protects the privacy of student education records. "
            "It gives parents rights over their children's records (and the student those rights "
            "at age 18 or when attending post-secondary school).\n"
            "Impact on this system: FERPA prevents disclosure of individually identifiable "
            "student education records. This is why the analytics assistant:\n"
            "  - Does not show individual student names or scores\n"
            "  - Suppresses data for groups with fewer than 10 students\n"
            "  - Enforces role-based data scoping (teachers see only their students)\n"
            "Alternate terms: student privacy law, student data privacy, FERPA compliance."
        ),
        "category": "glossary",
        "domain": "attendance",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "glossary-school-grade",
        "title": "Glossary: Florida School Grade",
        "content": (
            "Term: School Grade / School Rating\n"
            "Definition: An A–F letter grade assigned annually to Florida public schools by the "
            "Florida Department of Education (FDOE) based primarily on FAST assessment performance, "
            "learning growth, and graduation rates.\n"
            "NOT available in this interface: SUSD school grades from FDOE are not loaded into "
            "the data warehouse. Contact the district's Accountability office for school grade data.\n"
            "Do not confuse: School grades (A–F accountability ratings) with student grade levels "
            "(K–12). Do not confuse with individual student grades or GPA (not in this system)."
        ),
        "category": "glossary",
        "domain": "assessment",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "glossary-benchmark",
        "title": "Glossary: Benchmark / Target",
        "content": (
            "Term: Benchmark / Target\n"
            "In SUSD data, 'benchmark' has two meanings:\n"
            "1. Benchmark assessment: A locally-administered test (BOY, MOY, EOY) given to "
            "measure student progress. Example: 'i-Ready benchmark.'\n"
            "2. Benchmark target: A district-set performance goal that a school should reach "
            "by end of year. Example: 'We set a benchmark of 70% proficiency for Grade 5 Math.'\n"
            "The view vw_PerformanceVsBenchmark uses 'benchmark' in the second sense: "
            "comparing actual proficiency rates against annual performance targets.\n"
            "Alternate terms: target, goal, performance goal, expected proficiency, district target."
        ),
        "category": "glossary",
        "domain": "assessment",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
    {
        "id": "glossary-subgroup",
        "title": "Glossary: Subgroup",
        "content": (
            "Term: Subgroup\n"
            "Definition: A defined group of students categorized by a shared characteristic "
            "for reporting purposes. Federal and state accountability systems require schools "
            "to report separately for each subgroup.\n"
            "SUSD subgroup categories:\n"
            "  - Race/Ethnicity (White, Hispanic, Black, Asian, Multiracial, etc.)\n"
            "  - English Language Learner Status (ELL / Non-ELL)\n"
            "  - Economic Status (Economically Disadvantaged / Not)\n"
            "  - Disability Status (Students with Disabilities / Without)\n"
            "Alternate terms: student group, demographic group, population group, "
            "category, achievement gap groups, disaggregated data."
        ),
        "category": "glossary",
        "domain": "assessment",
        "view_name": "",
        "parameters": "",
        "role_scope": ALL_ROLES,
        "last_updated": TODAY,
    },
]

# ===========================================================================
# Combined catalog
# ===========================================================================

FULL_CATALOG = (
    VIEW_DOCUMENTS
    + BUSINESS_RULE_DOCUMENTS
    + DOMAIN_OVERVIEW_DOCUMENTS
    + FAQ_DOCUMENTS
    + GLOSSARY_DOCUMENTS
)

print(f"Total documents in full catalog: {len(FULL_CATALOG)}")
for category in ["view", "business-rule", "domain-overview", "faq", "glossary"]:
    count = sum(1 for d in FULL_CATALOG if d["category"] == category)
    print(f"  {category}: {count}")
```

## Part 2 — Upload the Full Catalog

```python
# scripts/lab04b_upload_catalog.py
"""
Upload all 49 metadata documents to the susd-metadata-v1 AI Search index.
"""
import os, time
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

# Import catalog from part 1
import sys
sys.path.append("scripts")
from lab04b_full_catalog import FULL_CATALOG

load_dotenv(".env.local")

openai_client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version=os.environ["AZURE_OPENAI_API_VERSION"],
)

search_client = SearchClient(
    endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
    index_name="susd-metadata-v1",
    credential=AzureKeyCredential(os.environ["AZURE_SEARCH_API_KEY"]),
)

EMBEDDING_MODEL = os.environ.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small")
BATCH_SIZE = 16


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        response = openai_client.embeddings.create(
            model=EMBEDDING_MODEL, input=batch
        )
        embeddings.extend([item.embedding for item in response.data])
        if i + BATCH_SIZE < len(texts):
            time.sleep(0.5)
    return embeddings


def upload_catalog(documents: list[dict]) -> None:
    print(f"Generating embeddings for {len(documents)} documents...")
    texts = [f"{doc['title']}\n\n{doc['content']}" for doc in documents]
    embeddings = generate_embeddings(texts)

    search_docs = []
    for doc, embedding in zip(documents, embeddings):
        search_docs.append({
            "id": doc["id"],
            "title": doc["title"],
            "content": doc["content"],
            "category": doc["category"],
            "domain": doc["domain"],
            "view_name": doc.get("view_name", ""),
            "parameters": doc.get("parameters", ""),
            "role_scope": doc["role_scope"],
            "last_updated": doc["last_updated"],
            "content_vector": embedding,
        })

    print(f"Uploading {len(search_docs)} documents to susd-metadata-v1...")
    result = search_client.upload_documents(documents=search_docs)
    succeeded = sum(1 for r in result if r.succeeded)
    failed = len(result) - succeeded
    print(f"Upload complete: {succeeded} succeeded, {failed} failed")


if __name__ == "__main__":
    upload_catalog(FULL_CATALOG)
```

## Part 3 — Retrieval Tests

```python
# scripts/lab04b_retrieval_tests.py
"""
Targeted retrieval tests for the full SUSD metadata catalog.
Tests all 5 document categories and security trimming.
"""
import os
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv(".env.local")

openai_client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version=os.environ["AZURE_OPENAI_API_VERSION"],
)
search_client = SearchClient(
    endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
    index_name="susd-metadata-v1",
    credential=AzureKeyCredential(os.environ["AZURE_SEARCH_API_KEY"]),
)

EMBEDDING_MODEL = os.environ.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small")


def hybrid_search(query: str, role: str, top: int = 3) -> list[dict]:
    embedding = openai_client.embeddings.create(
        model=EMBEDDING_MODEL, input=query
    ).data[0].embedding

    vector_query = VectorizedQuery(
        vector=embedding,
        k_nearest_neighbors=50,
        fields="content_vector",
    )
    results = search_client.search(
        search_text=query,
        vector_queries=[vector_query],
        filter=f"role_scope/any(r: r eq '{role}')",
        select=["id", "title", "category", "domain", "view_name"],
        top=top,
    )
    return [{"id": r["id"], "title": r["title"],
             "category": r["category"], "view_name": r.get("view_name", "")}
            for r in results]


TESTS = [
    # --- VIEW tests ---
    {"query": "How many students are chronically absent at my school?",
     "role": "school_admin", "expected_category": "view", "label": "VIEW: chronic absence → attendance view"},
    {"query": "What is the ELA proficiency rate for Grade 5?",
     "role": "school_admin", "expected_category": "view", "label": "VIEW: ELA proficiency → local assessment view"},
    {"query": "Show me year-over-year math trends",
     "role": "district_admin", "expected_category": "view", "label": "VIEW: YOY trend → longitudinal view"},
    {"query": "How many students are in Tier 2 intervention?",
     "role": "school_admin", "expected_category": "view", "label": "VIEW: intervention count → intervention view"},
    {"query": "Are we hitting our proficiency targets?",
     "role": "district_admin", "expected_category": "view", "label": "VIEW: vs target → benchmark view"},

    # --- BUSINESS RULE tests ---
    {"query": "What counts as chronically absent?",
     "role": "teacher", "expected_category": "business-rule", "label": "RULE: chronic absence definition"},
    {"query": "What does proficient mean in SUSD?",
     "role": "teacher", "expected_category": "business-rule", "label": "RULE: proficiency level definition"},
    {"query": "What is the difference between Tier 2 and Tier 3?",
     "role": "school_admin", "expected_category": "business-rule", "label": "RULE: MTSS tier definitions"},

    # --- FAQ tests ---
    {"query": "When is the data updated?",
     "role": "teacher", "expected_category": "faq", "label": "FAQ: data refresh schedule"},
    {"query": "What can I see as a teacher?",
     "role": "teacher", "expected_category": "faq", "label": "FAQ: access scope"},
    {"query": "Can I look up a specific student?",
     "role": "teacher", "expected_category": "faq", "label": "FAQ: individual student lookup"},

    # --- GLOSSARY tests ---
    {"query": "What is BOY testing?",
     "role": "teacher", "expected_category": "glossary", "label": "GLOSSARY: BOY definition"},
    {"query": "What does ELL mean?",
     "role": "school_admin", "expected_category": "glossary", "label": "GLOSSARY: ELL definition"},

    # --- DOMAIN OVERVIEW tests ---
    {"query": "What attendance data is available?",
     "role": "school_admin", "expected_category": "domain-overview", "label": "OVERVIEW: attendance domain"},

    # --- SECURITY TRIMMING tests ---
    {"query": "District-wide achievement gaps by subgroup",
     "role": "teacher", "expected_category": None, "label": "SECURITY: teacher asking district-admin-only content"},
    {"query": "Compare all schools' proficiency rates",
     "role": "teacher", "expected_category": None, "label": "SECURITY: teacher asking cross-school"},
]


def run_tests():
    print("=== Metadata Catalog Retrieval Tests ===\n")
    passed = 0
    failed = 0

    for test in TESTS:
        results = hybrid_search(test["query"], test["role"], top=3)
        top_result = results[0] if results else None

        # Security trimming tests — expect no district_admin-only results
        if test["expected_category"] is None:
            district_only_views = {"vw_AssessmentGapBySubgroup", "vw_PerformanceVsBenchmark",
                                   "vw_LongitudinalProficiencyTrend"}
            returned_restricted = any(
                r.get("view_name") in district_only_views for r in results
            )
            if not returned_restricted:
                print(f"  ✅ PASS  {test['label']}")
                passed += 1
            else:
                print(f"  ❌ FAIL  {test['label']}: returned restricted view")
                failed += 1
        else:
            if top_result and top_result["category"] == test["expected_category"]:
                print(f"  ✅ PASS  {test['label']} → {top_result['title'][:60]}")
                passed += 1
            else:
                got = top_result["category"] if top_result else "none"
                title = top_result["title"][:50] if top_result else "no result"
                print(f"  ❌ FAIL  {test['label']}")
                print(f"           Expected category: {test['expected_category']}")
                print(f"           Got: {got} — {title}")
                failed += 1

    print(f"\n=== Results: {passed}/{passed+failed} passed ===")


if __name__ == "__main__":
    run_tests()
```

## Part 4 — Improve at Least One Gap

After running your retrieval tests, identify one test that failed or one retrieval result that surprised you. Improve the relevant metadata document's content field and re-upload it.

```python
# scripts/lab04b_fix_gap.py
"""
Example: Fix a retrieval gap by improving a metadata document's content.
Document the gap you found and how you fixed it in your lab report.
"""
import os, time
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv(".env.local")

# === FILL IN YOUR GAP HERE ===
# Example: The BOY/MOY/EOY glossary wasn't returning for "What is a fall benchmark?"
DOCUMENT_TO_UPDATE = {
    "id": "glossary-boy-moy-eoy",  # Replace with the document you're fixing
    "title": "Glossary: BOY / MOY / EOY Assessment Windows",
    "content": (
        "Terms: BOY, MOY, EOY — assessment windows in SUSD.\n"
        "BOY = Beginning of Year. Given in August-September. "
        "Baseline / diagnostic. Also called: fall benchmark, fall assessment, "
        "fall diagnostic, diagnostic screening, beginning of year test.\n"
        "MOY = Middle of Year. Given in January-February. "
        "Progress check. Also called: winter benchmark, mid-year screener, "
        "middle of year assessment, January benchmark.\n"
        "EOY = End of Year. Given in April-May. "
        "Summative / final measure. Also called: spring benchmark, spring assessment, "
        "end of year test, final assessment.\n"
        # ADD MORE SYNONYMS or context specific to your identified gap
        "In SUSD data warehouse: AssessmentWindow field = 'BOY', 'MOY', or 'EOY'."
    ),
    "category": "glossary",
    "domain": "assessment",
    "view_name": "",
    "parameters": "",
    "role_scope": ["teacher", "school_admin", "district_admin"],
    "last_updated": str(__import__("datetime").date.today()),
}

# Generate new embedding and re-upload
openai_client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version=os.environ["AZURE_OPENAI_API_VERSION"],
)
search_client = SearchClient(
    endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
    index_name="susd-metadata-v1",
    credential=AzureKeyCredential(os.environ["AZURE_SEARCH_API_KEY"]),
)

embedding = openai_client.embeddings.create(
    model=os.environ.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small"),
    input=f"{DOCUMENT_TO_UPDATE['title']}\n\n{DOCUMENT_TO_UPDATE['content']}"
).data[0].embedding

DOCUMENT_TO_UPDATE["content_vector"] = embedding
result = search_client.merge_or_upload_documents(documents=[DOCUMENT_TO_UPDATE])
print(f"Update {'succeeded' if result[0].succeeded else 'FAILED'} for {DOCUMENT_TO_UPDATE['id']}")
```

## Lab Completion Checklist

- [ ] `lab04b_full_catalog.py` created — all 49 documents (9 view + 12 business-rule + 5 domain-overview + 12 faq + 11 glossary)
- [ ] All documents uploaded to `susd-metadata-v1` with 0 failures
- [ ] Retrieval test script run — at least 13/16 tests passing
- [ ] Security trimming verified: teacher queries do not return district-admin-only views
- [ ] At least one retrieval gap identified and documented in lab report
- [ ] Gap fix applied and re-tested — improvement verified
- [ ] Lab report: document the gap you found, what you changed, and the before/after retrieval result

*Next: Week 04 Checklist → Week 05*
