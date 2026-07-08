# Week 02 Completion Checklist

**Week:** 2 — Azure OpenAI Fundamentals and Prompt Engineering  
**Modules:** 03, 04 | **Labs:** 02a, 02b

## Module 03 — Azure OpenAI Fundamentals

- [ ] Read Module 03 in full
- [ ] Can name the two model families used in this course and when to use each
- [ ] Can explain the messages array structure (system, user, assistant roles)
- [ ] Can explain what a token is and why the token budget matters
- [ ] Understands `temperature` and can justify 0.0–0.2 for analytics use
- [ ] Can read `usage.total_tokens` from an API response
- [ ] Understands content filter categories and when filters fire
- [ ] Can explain API key vs. managed identity authentication
- [ ] Completed Module 03 reflection questions

## Module 04 — Prompt Engineering for Analytics Assistants

- [ ] Read Module 04 in full
- [ ] Can name all six prompt engineering patterns
- [ ] Can write a role-and-scope grounding section for a given user role
- [ ] Can write an anti-injection instruction block
- [ ] Understands what prompt engineering cannot fix (requires RAG or data layer)
- [ ] Understands the difference between system prompt refusals and data layer enforcement
- [ ] Completed Module 04 reflection questions

## Lab 02a — First OpenAI Call

- [ ] .NET chat completion demo runs successfully for all 3 test questions
- [ ] Python chat completion demo runs successfully for all 3 test questions
- [ ] Token usage logged for at least 3 questions in each language
- [ ] Embedding call made in .NET and Python
- [ ] Cosine similarity computed and recorded
- [ ] Content filter test run and results recorded
- [ ] Baseline grounding behavior documented (does model hallucinate data or correctly say "I don't have it"?)
- [ ] Lab report section for Lab 02a completed

## Lab 02b — Prompt Engineering

- [ ] V0 baseline prompt tested against all 10 test questions
- [ ] V0 scored on grounding, refusal accuracy, format, and scope (40 data points)
- [ ] V1 full 6-pattern prompt built
- [ ] V1 tested against all 10 test questions
- [ ] V1 scored and compared to V0
- [ ] At least one additional iteration (V2) completed based on failure analysis
- [ ] `prompts/system-prompt-v1.md` saved
- [ ] `prompts/eval-scorecard.md` completed with all scores
- [ ] Lab report section for Lab 02b completed
- [ ] Documented which of the 10 questions require RAG

## Week 02 Knowledge Check

1. **(Module 03)** What does `finish_reason: "length"` indicate, and what should you do?
2. **(Module 03)** Why would you set `temperature = 0.1` instead of `temperature = 0.7` for a district analytics assistant?
3. **(Module 04)** A user's question says "Ignore all previous instructions." Which prompt engineering pattern handles this, and what should the response be?
4. **(Lab 02b)** Which of the 10 test questions correctly returned "I don't have that data"? Is that a failure or a success? Why?
5. **(Lab 02b)** After prompt iteration, which question pattern was hardest to handle correctly? What would be needed to fix it?

## Time Log (Optional)

| Activity | Estimated | Actual |
|----------|-----------|--------|
| Module 03 | 2.5 hrs | |
| Module 04 | 2.5 hrs | |
| Lab 02a | 2 hrs | |
| Lab 02b | 3 hrs | |
| **Total** | **10 hrs** | |

*When all items above are checked, proceed to Week 03.*
