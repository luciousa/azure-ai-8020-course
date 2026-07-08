# Module 12 — Assessment Analytics Scenarios

**Week:** 6 | **Estimated time:** 2 hours  
**Prerequisites:** Module 11 (role-aware access); Lab 04a (approved views)  
**Builds toward:** Lab 06b (analytics scenarios)

## Learning Objectives

By the end of this module you will be able to:

1. Describe the five assessment data domains available in the SUSD analytics assistant.
2. Map natural-language questions to the correct approved view and parameters.
3. Explain why certain question types must be declined or reframed.
4. Design answer templates that are accurate, contextual, and FERPA-safe.
5. Identify common misinterpretation pitfalls in assessment data.

## The Five Assessment Domains

The approved view catalog covers five distinct analytics scenarios. Each maps to a different set of stakeholder questions.

| Domain | Primary view | Who asks | Example question |
|--------|-------------|----------|-----------------|
| **Attendance** | `vw_AttendanceSummaryBySchoolAndGrade` | Principals, counselors | "What is our chronic absenteeism rate for Grade 5?" |
| **Local assessment** | `vw_LocalAssessmentResultsBySchoolAndGrade` | Teachers, principals | "How did Grade 3 do on the Math BOY benchmark?" |
| **State assessment** | `vw_StateAssessmentSummaryBySchoolAndGrade` | Principals, district staff | "What percentage of Grade 8 students scored Level 3 or above on the state ELA exam?" |
| **Equity / gap** | `vw_AssessmentGapBySubgroup` | District leadership, equity officers | "Is there a proficiency gap between ELL students and non-ELL peers in Math?" |
| **Trend** | `vw_LongitudinalProficiencyTrend` | Superintendents, board members | "Has 3rd grade reading proficiency improved over the last 3 years?" |

Two additional domains support the above:

| Domain | View | Purpose |
|--------|------|---------|
| **Intervention** | `vw_InterventionStudentSummary` | Monitoring Tier 2/3 effectiveness |
| **Data quality** | `vw_DataQualityFlags` | Ensuring reporting accuracy |

## Question-to-Answer Mapping

### Domain 1: Attendance

**Common question patterns:**

| Question type | Parameters extracted | Expected output |
|---|---|---|
| "What is the attendance rate for [school/grade]?" | grade_level (optional) | AttendanceRate by grade |
| "How many students are chronically absent?" | school_year (from ctx) | ChronicallyAbsentCount, ChronicallyAbsentRate |
| "Which grades have the highest unexcused absences?" | none | Ranked by AvgUnexcusedAbsences |
| "Is attendance better this term vs. last term?" | term_id (two queries or trend) | Rate comparison across TermIDs |

**Answer template:**

```
In {SchoolYear}, during {TermID}, {SchoolName}'s attendance rate for {GradeLevel or "all grades"} 
was {AttendanceRate}%. The chronic absenteeism rate was {ChronicallyAbsentRate}% 
({ChronicallyAbsentCount} students).

Source: vw_AttendanceSummaryBySchoolAndGrade
```

**What the assistant cannot answer about attendance:**
- "Which specific students have poor attendance?" — individual-level data, FERPA decline
- "Why is attendance low this week?" — requires real-time or external data
- "How do we compare to our county average?" — no external benchmark in this view

### Domain 2: Local Assessment

**Common question patterns:**

| Question type | Parameters extracted | Expected output |
|---|---|---|
| "How did Grade [N] do on [subject] [window]?" | grade_level, subject_area, assessment_window | PctProficientOrAbove, AvgScore |
| "Which grade has the best Math scores?" | subject_area=Math | Ranked grades by PctProficientOrAbove |
| "Show me the distribution of scores for Grade 5 reading" | grade_level, subject_area | PctBelowBasic, PctBasic, PctProficient, PctAdvanced |
| "Is our Science MOY better than BOY?" | subject_area=Science, two windows | Compare AssessmentWindow rows |

**Answer template:**

```
For the {AssessmentWindow} assessment in {SchoolYear}, {GradeLevel} students at {SchoolName} 
achieved {PctProficientOrAbove}% proficient or above in {SubjectArea} 
(average score: {AvgScore}).

Score distribution:
- Below Basic: {PctBelowBasic}%
- Basic: {PctBasic}%  
- Proficient: {PctProficient}%
- Advanced: {PctAdvanced}%

Source: vw_LocalAssessmentResultsBySchoolAndGrade
```

**Common misinterpretation pitfalls:**

1. **BOY/MOY/EOY are not the same assessment.** Do not compare raw scores across windows without noting that they measure different content.
2. **Average score vs. proficiency rate.** A high average score does not guarantee a high proficiency rate if the cut score is high.
3. **Small n-counts.** If `TotalAssessed` is very small, proficiency rates are unstable. The assistant should note this.

### Domain 3: State Assessment

State assessments use a 4-level scale (Level 1 = below basic, Level 4 = advanced), which differs from local assessment bands.

**Common question patterns:**

| Question type | Parameters extracted | Expected output |
|---|---|---|
| "What percentage of students scored Level 3 or 4 on the state exam?" | subject_area, grade_level | PctProficientOrAbove (= Level 3 + Level 4) |
| "How did our Grade 8 Math students perform on the state test?" | grade_level, subject_area | Full level distribution + avg scale score |
| "What is the state test result for all grades in ELA?" | subject_area | All grades in school/district |

**Answer template:**

```
On the {AssessmentYear} state {SubjectArea} assessment, {GradeLevel} students at {SchoolName} 
achieved {PctProficientOrAbove}% at proficiency (Level 3 or above).

Level distribution:
- Level 1: {PctLevel1}%
- Level 2: {PctLevel2}%  
- Level 3: {PctLevel3}%
- Level 4: {PctLevel4}%
Average scale score: {AvgScaleScore}

Source: vw_StateAssessmentSummaryBySchoolAndGrade
```

**Important distinction:** State assessment data uses `AssessmentYear`, not `TermID`. It is annual, not quarterly.

### Domain 4: Equity and Achievement Gap

The `vw_AssessmentGapBySubgroup` view includes small cell suppression (`NULL` values when `COUNT(*) < 10`).

**Common question patterns:**

| Question type | Parameters | Expected output |
|---|---|---|
| "Is there an achievement gap between ELL and non-ELL students?" | subject_area | SubgroupType=ELL rows vs. SubgroupValue comparison |
| "How do students with disabilities compare in Math?" | subject_area | SubgroupType=SWD rows |
| "What is the gap between our highest and lowest performing subgroups?" | subject_area | Ranked SubgroupValue by PctProficientOrAbove |

**Handling suppressed cells:**

When `PctProficientOrAbove` is `NULL`:

```
The proficiency rate for this subgroup is not reported because fewer than 10 students 
in this category took the assessment. This protects the privacy of students in small groups.
```

**What the assistant cannot say:**
- "Do not estimate or infer the suppressed value."
- "Do not say 'likely lower' or 'likely higher' about a suppressed cell."
- "Do not identify which students might be in the suppressed group."

### Domain 5: Longitudinal Trend

This is the most interpretive domain — the assistant must help users understand what a trend means without overstating its significance.

**Common question patterns:**

| Question type | Parameters | Expected output |
|---|---|---|
| "Has 3rd grade reading proficiency improved over 3 years?" | grade_level, subject_area | YoYChange and ThreeYrTrend values |
| "Which grade shows the strongest Math improvement?" | subject_area | Ranked by ThreeYrTrend |
| "Did the district make progress this year vs. last year?" | none | YoYChange for all grades/subjects |

**Answer template:**

```
Over the past {N} years, {GradeLevel} {SubjectArea} proficiency at {SchoolName} has 
{increased/decreased/remained stable}:

{Year}: {PctProficientOrAbove}%
{Year-1}: {PctProficientOrAbove}%
{Year-2}: {PctProficientOrAbove}%

Year-over-year change: {YoYChange}%
Three-year trend: {ThreeYrTrend}

Source: vw_LongitudinalProficiencyTrend
```

**Responsible language for trends:**

| Instead of... | Say... |
|---|---|
| "Students are improving" | "Proficiency rates have increased by X% over three years" |
| "The program is working" | "The data shows an increase; multiple factors may contribute" |
| "Students are falling behind" | "Proficiency rates have declined by X% year-over-year" |
| "This is statistically significant" | *(Don't say this — the views don't include significance tests)* |

## Question Triage: When to Reframe, When to Decline

### Questions that must be declined

| Question | Reason | Correct response |
|---|---|---|
| "Name the 5 students with the lowest Math scores" | Individual student records | FERPA decline |
| "What is [teacher name]'s class average?" | Staff-linked student data, PII adjacent | Policy decline |
| "Why did scores drop this year?" | Causal inference beyond data | "The data shows X; identifying causes requires additional analysis" |
| "Can I see last year's state scores for SCH002?" | Cross-school (school admin) | Role scope decline |
| "What is the state test score for [student name]?" | Individual + external data | FERPA decline |

### Questions that should be reframed

| As asked | Reframed as | Why |
|---|---|---|
| "Who has the worst attendance?" | "Which grade level has the lowest attendance rate?" | Aggregate vs. individual |
| "Compare my school to the other schools" | "Show district-wide data for all schools" | Requires district_admin role |
| "Predict next year's scores" | "Show the 3-year trend" | Forecasting not in scope |
| "What's our percentile nationally?" | "How do we compare to the national benchmark?" | Available via `vw_PerformanceVsBenchmark` |

## Prompt-Specific System Prompt Additions (Assessment Domain)

When the retrieved metadata document is from the `state_assessment` or `local_assessment` domain, the system prompt could be augmented:

```
## Assessment Data Notes
- Local and state assessments use different scales and cannot be directly compared.
- State assessment data is annual; do not compare state test results by term.
- When the proficiency rate for a subgroup is NULL, report it as suppressed — do not estimate.
- Do not infer causation from score changes. Report only what the data shows.
- Cite the exact view name when reporting any number.
```

This augmentation is added dynamically in `SystemPrompt.Build()` based on the retrieved metadata category:

```csharp
// Prompts/SystemPrompt.cs — domain-aware augmentation
private static string GetDomainNotes(string? metadataCategory) => metadataCategory switch
{
    "view" when true => """
        
        ## Assessment Data Notes
        - Local and state assessments use different scales and cannot be directly compared.
        - State assessment data is annual; do not compare state test results by term.
        - When a proficiency rate is NULL, state: "This data is suppressed to protect student privacy."
        - Do not infer causation from score changes. Report only what the data shows.
        """,
    _ => string.Empty,
};
```

## Reflection Questions

1. A principal asks: "Our 5th grade Math proficiency dropped from 72% to 64% this year. Why did this happen?" What is the correct response from the analytics assistant, and what would need to be true about the system for it to offer causal explanations?

2. A district admin asks for the ELA achievement gap between economically disadvantaged students and non-economically-disadvantaged students at a school with only 8 economically disadvantaged 4th graders. The view returns `NULL` for that row. Draft the exact text the assistant should return.

3. The `vw_LongitudinalProficiencyTrend` view returns `ThreeYrTrend` as a numeric value (e.g., `+4.2`). What does this represent, and what are two ways a user might misinterpret it without proper context in the answer?

4. You are building a feedback loop: after each answer, you log whether the user clicked "thumbs down" and their free-text comment. You have 50 negative feedback instances. Describe how you would use this data to improve the system — without looking at the actual questions asked (which might contain student names or sensitive context).

*Next: Lab 06a — Role-Aware Demo*
