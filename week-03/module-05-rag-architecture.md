# Module 05 — RAG Architecture

**Week:** 3 | **Estimated time:** 2.5–3 hours  
**Prerequisites:** Modules 01–04 complete; Lab 02b complete  
**Builds toward:** Lab 03a (AI Search index), Lab 03b (RAG pipeline)

## Learning Objectives

By the end of this module you will be able to:

1. Define RAG (Retrieval-Augmented Generation) and explain why it is the correct architecture for this use case.
2. Describe the five stages of the RAG pipeline: question → embed → retrieve → augment → generate.
3. Explain chunking strategies and choose the right one for district metadata documents.
4. Describe the four types of retrieval: keyword, vector, hybrid, and semantic re-ranking.
5. Identify the six RAG failure modes and explain how each is mitigated.
6. Explain what "grounding" means and how citations are enforced.

## Why RAG Solves the Problem Lab 02b Left Open

In Lab 02b, four of the ten test questions scored 0 on grounding even with a well-engineered prompt — because no data was provided. The model correctly said "I don't have that data." This is working as intended.

RAG solves this by adding a retrieval step before generation:

```
WITHOUT RAG:
  User question → [LLM] → Answer (may hallucinate)

WITH RAG:
  User question → [Embed] → [Search index] → [Relevant chunks] → [LLM with context] → Grounded answer
```

The LLM no longer needs to "know" district data from training. It only needs to read and reason over what is retrieved. This is why:

- Data currency is not a problem: retrieve from live SQL → always current
- Data accuracy is not a problem: retrieved data comes from the source of truth
- FERPA scope control is possible: only retrieve what the user is authorized to see
- Hallucination risk drops dramatically: the model has real numbers to cite

## The Five RAG Pipeline Stages

### Stage 1: Question Understanding

The user's question is received. Before retrieval, the application may:

- **Classify the question type:** Is this about attendance, assessment, or intervention?
- **Extract entities:** Which school? Which grade? Which year?
- **Resolve role scope:** What data is this user authorized to retrieve?

For the district analytics assistant, question classification determines which approved view(s) to query and which metadata index entries to retrieve.

### Stage 2: Embed the Question

The question (and optionally detected entities) are converted to an embedding vector using `text-embedding-3-small`. This vector represents the semantic meaning of the question.

```
"What is the attendance rate for Grade 3?"
     ↓ text-embedding-3-small
[0.0142, -0.0831, 0.1203, ... (1536 floats)]
```

### Stage 3: Retrieve

The question vector is compared against indexed document vectors. The most semantically similar document chunks are returned.

**Two retrieval paths for the analytics assistant:**

| Retrieval Path | What is Searched | Why |
|---------------|-----------------|-----|
| **Metadata index** (AI Search) | Business definitions, data dictionary, approved view catalog | Find which view or domain the question maps to |
| **SQL query** (via approved view) | Actual attendance/assessment/intervention numbers | Get the real data to include in the prompt |

Both paths run in parallel. The metadata index tells the system *how* to answer (which view, which fields). The SQL query provides the *data* to answer.

### Stage 4: Augment the Prompt

The retrieved chunks are inserted into the system prompt before it is sent to Azure OpenAI.

```
[System prompt: role, rules, format]
+
[Retrieved metadata: "vw_AttendanceSummaryBySchoolAndGrade — returns attendance rate, 
                      chronically absent count, by school and grade level"]
+
[Retrieved SQL result: "SCH001, Grade 3, Q1 2025-26, AttendanceRate=89.3%, 
                         ChronicallyAbsent=12"]
+
[User question: "What is the attendance rate for Grade 3 at Palmetto Ridge this term?"]
→ Azure OpenAI
```

### Stage 5: Generate

Azure OpenAI reads the augmented prompt and generates a grounded answer. Because the real numbers are in the context, the model can cite them accurately.

```
Answer: The attendance rate for Grade 3 at Palmetto Ridge Elementary in Q1 2025-26 
        was 89.3%, which is 5.7 percentage points below the 95% district target. 
        Twelve of 87 students (13.8%) were chronically absent during this period.
        
Data source: District attendance system — Palmetto Ridge Elementary, Grade 3, 
             Q1 2025-26 (data as of [refresh date])
Confidence: HIGH
```

## Chunking Strategies

Before documents are indexed in AI Search, they must be split into chunks — pieces small enough to be relevant but large enough to contain meaningful context.

### For the District Metadata Catalog

District metadata documents are short and structured. Each chunk should be one logical unit:

| Document Type | Recommended Chunk | Chunk Size |
|--------------|-------------------|-----------|
| Data dictionary entry (single field definition) | 1 entry per chunk | 100–300 tokens |
| Approved view description | 1 view per chunk | 200–500 tokens |
| Business rule or glossary term | 1 term per chunk | 100–300 tokens |
| FAQ about data | 1 Q&A pair per chunk | 150–400 tokens |

**Do not chunk by character count alone for metadata.** A 1,500-character chunk that cuts a view definition in half is worse than two 600-character chunks that each represent complete entries.

### Chunk Overlap

For longer documents (not typical in the metadata catalog), use overlapping chunks so context is not lost at boundaries:

```
Document: [Block 1][Block 2][Block 3]
Chunk 1:  [====Block 1====|==Block 2 start==]
Chunk 2:         [==Block 1 end==|====Block 2====|==Block 3 start==]
Chunk 3:                         [==Block 2 end==|====Block 3====]
```

For the analytics assistant metadata catalog, overlap is minimal — entries are self-contained.

## Four Retrieval Types

### 1. Keyword Search (BM25)

Classic full-text search. Fast, explainable, no embedding required. Works well for exact term matches ("chronically absent," "state assessment").

**Weakness:** Misses semantic synonyms. "Attendance rate" and "presence percentage" are the same concept but may not match.

### 2. Vector Search

Semantic search using embeddings. Finds conceptually similar documents even if exact words differ.

**Weakness:** Can retrieve semantically related but factually different documents. "ELA" and "math" are both about assessment but are different subjects.

### 3. Hybrid Search (Recommended)

Combines BM25 keyword score with vector similarity score using Reciprocal Rank Fusion (RRF). This outperforms either alone across diverse query types.

```
Hybrid score = RRF(keyword_rank, vector_rank)
```

**For the analytics assistant, always use hybrid search.** District questions include both exact terminology (view names, school IDs) and semantic concepts (performance, engagement, proficiency).

### 4. Semantic Re-ranking

An additional AI model layer that re-reads the top-k retrieved chunks and re-ranks them by true relevance to the question. Available in Azure AI Search Standard tier and above.

**When to use:** Add semantic re-ranking when hybrid search results include irrelevant chunks that share keywords with the query. For a well-structured metadata catalog, it may not add significant value — measure before committing.

## Context Window Management

The retrieved chunks must fit in the LLM's context window alongside the system prompt, user question, and expected response.

**Token budget for retrieved context:**

| Component | Budget |
|-----------|--------|
| System prompt | ~700 tokens |
| Retrieved metadata (2–3 chunks) | ~800 tokens |
| SQL query result (summarized rows) | ~600 tokens |
| User question | ~100 tokens |
| Expected response | ~500 tokens |
| Safety buffer | ~300 tokens |
| **Total** | **~3,000 tokens** |

Well under the 128k context limit. However, avoid returning raw SQL result sets with individual student rows — aggregate in SQL and pass only the summary.

**Chunking rule for SQL results:** If a query would return more than 20 rows of raw data, add aggregation in the view or stored procedure so the result is a summary, not a record list.

## Six RAG Failure Modes

| Failure Mode | Description | Mitigation |
|-------------|-------------|------------|
| **Irrelevant retrieval** | Retrieved chunks don't match the question | Hybrid search; tune chunk design; add query expansion |
| **Missing retrieval** | Relevant chunk exists but is not retrieved | Check index completeness; increase `top_k`; improve chunk content |
| **Lost in the middle** | LLM ignores chunks in the middle of a long context | Keep context concise; put most relevant chunks first |
| **Hallucination despite context** | LLM ignores retrieved data and invents numbers | Strengthen grounding instructions; lower temperature; enforce citation |
| **Context conflict** | Two retrieved chunks contradict each other | Deduplicate index; version-stamp data; add recency signal |
| **Scope leak** | Retrieved chunks include data outside the user's authorized scope | Apply security trimming at index query time; pre-filter by school/role |

For the district analytics assistant, **scope leak** is the highest-risk failure mode. If a teacher's question retrieves attendance data for the whole district instead of their school, FERPA implications apply.

## Grounding and Citations

An answer is **grounded** when every factual claim can be traced to a retrieved source.

**Enforcing grounding in the prompt:**

```
Rules for citing data:
- Every number you state must be traceable to the retrieved context provided above.
- If you cite a percentage, state where it came from (school, grade, time period, data source).
- If a number is not in the retrieved context, do not estimate or approximate — say "that data was not provided."
- Include a "Data source:" line at the end of every factual answer.
```

**Verifying grounding in evaluation (Week 7):**
For each answer in your test set, check: does the answer contain numbers? Are all those numbers present in the retrieved context? If a number appears in the answer but not in the context, it is a hallucination.

## The Analytics Assistant RAG Architecture (Specific to This Course)

```
User Question (from teacher/school admin/district admin)
  │
  ▼
[.NET API — Orchestration Layer]
  │
  ├─► [1. Classify question type]
  │     (attendance / assessment / intervention / benchmark)
  │
  ├─► [2. Embed question] → text-embedding-3-small
  │
  ├─► [3a. Search metadata index] → AI Search hybrid search
  │     Returns: approved view description, query parameters, domain context
  │
  ├─► [3b. Execute approved view] → SQL Server (read-only service account)
  │     Parameterized: school, grade, year, term — from step 3a and user role
  │     Returns: aggregated summary rows (not individual student records)
  │
  ├─► [4. Assemble augmented prompt]
  │     System prompt + user context + metadata chunks + SQL summary + question
  │
  └─► [5. Generate] → Azure OpenAI (gpt-4o-mini or gpt-4o)
        Returns: grounded answer with data source citation
```

**Note on Stage 3a → 3b flow:** The metadata retrieval step is not just for answering questions — it drives the *which view to query* decision. The AI identifies from the metadata which `vw_*` view is relevant, extracts the required parameters from the question and user context, then queries that specific view. This is the approved view catalog pattern in action.

## RAG vs. Sending All Data to the Model

A common beginner mistake is to query all available data and send it to the model in one large context. This is tempting with GPT-4o's 128k context window.

**Do not do this for district student data:**

| Approach | Token Cost | Latency | FERPA Risk | Scalability |
|----------|-----------|---------|-----------|-------------|
| Send all data | Very high | High | High (over-disclosure) | Poor |
| RAG (retrieve what's needed) | Low | Lower | Controlled | Good |

With RAG, a teacher asking about Grade 3 attendance retrieves only Grade 3 attendance data for their school — not all school data for all grades.

## Reflection Questions

1. In the five-stage RAG pipeline, at which stage does role-based data scoping happen? What ensures it is enforced?
2. A user asks "Which school has the worst attendance district-wide?" and is a teacher. What should the retrieval step return, and why?
3. You observe that for some questions, the AI retrieves the correct metadata chunk (view description) but the SQL query returns no rows. What are three possible causes?
4. Why is hybrid search preferred over pure vector search for the district metadata catalog?

## References

- [RAG with Azure AI Search — Microsoft Learn](https://learn.microsoft.com/azure/search/retrieval-augmented-generation-overview)
- [RAG best practices — Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/concepts/retrieval-augmented-generation)
- [Reciprocal Rank Fusion in Azure AI Search](https://learn.microsoft.com/azure/search/hybrid-search-ranking)
- [Text chunking strategies](https://learn.microsoft.com/azure/search/cognitive-search-concept-document-cracking)
- [Grounding and citations in Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/concepts/prompt-engineering)

*Next: Module 06 — Azure AI Search*
