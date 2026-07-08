# Week 03 Completion Checklist

**Week:** 3 — RAG Architecture and Azure AI Search  
**Modules:** 05, 06 | **Labs:** 03a, 03b

## Module 05 — RAG Architecture

- [ ] Read Module 05 in full
- [ ] Can explain why RAG solves the problem Lab 02b left open
- [ ] Can describe all five RAG pipeline stages by name
- [ ] Understands why the district analytics assistant uses two retrieval paths (metadata + SQL)
- [ ] Can explain chunking and knows the right strategy for structured metadata
- [ ] Can name all four retrieval types and when to use hybrid
- [ ] Can describe all six RAG failure modes and their mitigations
- [ ] Understands what "grounded" means and how citations are enforced
- [ ] Understands why sending all data to the model is worse than RAG (FERPA + cost)
- [ ] Completed Module 05 reflection questions

## Module 06 — Azure AI Search

- [ ] Read Module 06 in full
- [ ] Can describe the role of AI Search in the analytics assistant (metadata only, not student data)
- [ ] Understands the index schema fields and why each field type was chosen
- [ ] Can explain how `role_scope` enables security trimming
- [ ] Can explain the difference between BM25 keyword and vector components in hybrid search
- [ ] Understands what semantic re-ranking adds and when to use it
- [ ] Knows the difference between Basic and Standard tier capabilities
- [ ] Understands the ingestion pattern (push documents directly, no indexer needed for metadata)
- [ ] Completed Module 06 reflection questions

## Lab 03a — Build the AI Search Index

- [ ] Index `susd-metadata-v1` created in Python or .NET without errors
- [ ] All 15 metadata documents authored (9 view descriptions + 4 business rules + 2 domain overviews)
- [ ] Embeddings generated for all documents using `text-embedding-3-small`
- [ ] All documents uploaded successfully (0 failures)
- [ ] Search Test 1 (attendance, school_admin) returns correct view description as top result
- [ ] Search Test 2 (attendance, teacher) returns teacher-scoped result
- [ ] Search Test 3 (definition) returns "chronically absent" business rule as top result
- [ ] Search Test 4 (security trimming) verified — district-only views not returned for teacher
- [ ] Search Test 5 (domain filter) verified — only intervention documents returned
- [ ] Lab report section completed for Lab 03a

## Lab 03b — RAG Pipeline

- [ ] `db_helper.py` written with read-only approved view functions
- [ ] SQL connectivity verified (queries return synthetic data)
- [ ] RAG pipeline (`lab03b_rag_pipeline.py`) runs end-to-end without errors
- [ ] All five pipeline stages implemented and visible in code
- [ ] All 10 Lab 02b questions re-run through RAG pipeline
- [ ] Token usage logged for each RAG query
- [ ] Comparison table completed (Lab 02b vs. Lab 03b scores)
- [ ] Q1 (Grade 3 attendance): verified real data returned with grounded answer
- [ ] Q6, Q7, Q8, Q10: verified refusals still correct with RAG
- [ ] At least one unexpected finding documented in lab report
- [ ] Lab report section completed for Lab 03b

## Week 03 Knowledge Check

1. **(Module 05)** At which stage in the RAG pipeline should role-based data scoping be enforced? What prevents the SQL query from returning data outside the user's authorized scope?

2. **(Module 05)** A teacher asks "Which school district-wide has the lowest ELA proficiency?" and receives a district-level comparison answer that includes all schools. Is this a RAG failure? Which failure mode? How do you fix it?

3. **(Module 06)** Why does the `susd-metadata-v1` index not contain attendance rates or assessment scores? What would the FERPA concern be if it did?

4. **(Lab 03a)** After running your security trimming test: if a teacher queries for "district-wide cross-school comparison," what documents should the AI Search index return? What should it NOT return?

5. **(Lab 03b)** Compare your Lab 02b total score to your Lab 03b total score. Which questions improved the most with RAG? Which did not improve? Why?

## Time Log (Optional)

| Activity | Estimated | Actual |
|----------|-----------|--------|
| Module 05 | 2.5 hrs | |
| Module 06 | 2.5 hrs | |
| Lab 03a | 2.5 hrs | |
| Lab 03b | 3 hrs | |
| **Total** | **10.5 hrs** | |

*When all items above are checked, proceed to Week 04.*
