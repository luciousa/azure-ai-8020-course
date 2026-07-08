# Week 07 Completion Checklist

**Week:** 7 — Security, Evaluation, and Safety  
**Modules:** 13, 14 | **Labs:** 07a, 07b

## Module 13 — Security, Privacy, and FERPA

- [ ] Read Module 13 in full
- [ ] Can define "education record" under FERPA and explain what counts as one
- [ ] Can distinguish between aggregate data (not an education record) and individual data (is)
- [ ] Can name all 8 FERPA requirement → technical control mappings in the SUSD architecture
- [ ] Can explain what does and does not go to Azure OpenAI in a query
- [ ] Can name the 5 most common FERPA violations in AI analytics systems
- [ ] Understands the school official exception and its limits
- [ ] Can describe the minimum required controls for production (all 4 categories)
- [ ] Understands what should and should not be included in operational logs
- [ ] Knows the correct format for logging: role/school/view/tokens — NOT question/answer text
- [ ] Completed Module 13 reflection questions

## Module 14 — Evaluation, Hallucination Detection, and Safety

- [ ] Read Module 14 in full
- [ ] Can define all 4 evaluation dimensions (groundedness, accuracy, scope safety, quality)
- [ ] Can explain why hallucination is especially dangerous in K-12 analytics reporting
- [ ] Can describe the 3 most common failure modes and their fixes
- [ ] Knows how to add an empty-SQL guard in both Python and .NET
- [ ] Understands the Azure AI Evaluation SDK's built-in evaluators
- [ ] Understands when to use LLM-as-judge vs. ground-truth evaluation
- [ ] Knows the 5 production readiness thresholds (and which 2 are non-negotiable)
- [ ] Completed Module 14 reflection questions

## Lab 07a — FERPA Review

- [ ] PII column scan completed with zero findings
- [ ] All 9 approved views confirmed present in the development database
- [ ] Layer 1 (auth): no-token, invalid-token, and expired-token tests all returned 401
- [ ] Layer 2 (metadata filter): teacher cannot see admin-only view in search results
- [ ] Layer 3 (SQL scope): school admin response contains only SCH001 data
- [ ] Scenario 1 (individual name in question): no student name in response
- [ ] Scenario 2 (individual score request): no individual score returned
- [ ] Scenario 3 (suppressed cell): response correctly explains suppression with reason
- [ ] Scenario 4 (cross-scope): school admin sees only own school
- [ ] Scenario 5 (prompt injection): no unauthorized query executed
- [ ] Scenario 6 (debug placeholder check): zero debug role patterns in codebase
- [ ] SQL service account tests: SELECT on views allowed; SELECT on dim_Student denied; write denied
- [ ] Log format verified: role/school/view/tokens logged; question text NOT logged
- [ ] FERPA Compliance Evidence Document completed and signed off
- [ ] Lab report completed (5 questions)

## Lab 07b — Evaluation Test Set

- [ ] Ground truth SQL queries (GT-01 through GT-06) executed and recorded
- [ ] All 30 evaluation test cases defined in `eval_test_set.py`
- [ ] Scoring script (`run_full_evaluation.py`) implemented with all 4 dimensions
- [ ] Evaluation run completed against the live pipeline
- [ ] All 6 Category C (FERPA decline) cases correctly declined
- [ ] All 4 Category D (role boundary) cases correctly handled
- [ ] Suppressed cell case (E01) returned correct suppression language
- [ ] No-data case (E02) returned "no data" response without fabricating a number
- [ ] `eval_outputs.json` generated
- [ ] Azure AI Evaluation SDK run completed (`run_azure_eval.py`)
- [ ] Manual vs. Azure comparison table completed for 6 cases
- [ ] `eval_dashboard.py` output generated and saved
- [ ] Lab report completed (5 questions)

## Week 07 Knowledge Check

1. **(Module 13)** A developer proposes adding response caching to improve performance. They argue: "The cache key is the question text, so if two users ask the same question, they get the same answer." Why is this a FERPA and scope violation? How would you fix the cache key to make caching safe?

2. **(Module 14)** Your evaluation run shows that 4 of the 6 Category C (FERPA decline) cases scored 0 on groundedness because the pipeline returned `is_grounded=False` with a decline message. Your team argues these should be scored separately from "real" groundedness failures. Design a modified scoring approach that distinguishes between "correctly declined (score=1)" and "incorrectly not grounded (score=0)."

3. **(Lab 07a)** The prompt injection test (Scenario 5) passed — the pipeline didn't try to query `dim_Student`. Identify the exact line of code in the `ViewRegistry` that provides the defense, and explain what would happen if the LLM returned `dim_Student` as the selected view.

4. **(Lab 07b)** You run the full 30-case evaluation and find: groundedness = 0.87, factual accuracy = 0.93, scope safety = 0.97, response quality = 0.84. The scope safety score of 0.97 means one case failed. Under the production thresholds from Module 14, can the system go to production? What must you do first?

5. **(Modules 13–14)** You are presenting the evaluation results to the district's data privacy officer. They ask: "What's the difference between your evaluation tests and a real security audit?" Write a 3-sentence answer that accurately describes what your evaluation tests cover, what they don't cover, and what a real security audit would add.

## Time Log (Optional)

| Activity | Estimated | Actual |
|----------|-----------|--------|
| Module 13 | 3.0 hrs | |
| Module 14 | 2.5 hrs | |
| Lab 07a | 2.5 hrs | |
| Lab 07b | 3.0 hrs | |
| **Total** | **11.0 hrs** | |

*When all items above are checked, proceed to Week 08.*
