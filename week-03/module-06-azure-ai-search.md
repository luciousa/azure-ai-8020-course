# Module 06 — Azure AI Search

**Week:** 3 | **Estimated time:** 2.5–3 hours  
**Prerequisites:** Module 05 (RAG Architecture) complete  
**Builds toward:** Lab 03a (AI Search index), Lab 03b (RAG pipeline)

## Learning Objectives

By the end of this module you will be able to:

1. Describe the Azure AI Search components: index, indexer, data source, and skillset.
2. Define a search index schema with the correct field types for the district metadata catalog.
3. Configure vector search with HNSW algorithm and choose appropriate dimensions.
4. Perform hybrid search queries using both keyword (BM25) and vector fields.
5. Apply security trimming (pre-filters) to enforce role-based data scope.
6. Explain the difference between Basic and Standard tiers and when to upgrade.

## What Azure AI Search Does in the Analytics Assistant

Azure AI Search indexes the district metadata catalog: business definitions, data dictionary entries, approved view descriptions, FAQ entries, and data domain documentation. When a user asks a question, the orchestration layer queries this index to find the most relevant metadata chunks — which then drive both the prompt context and the SQL view selection.

Azure AI Search does **not** index the actual attendance/assessment/assessment data from SQL Server. That data is retrieved directly from SQL Server using parameterized approved views at query time. The AI Search index contains only metadata — schema documentation, not student records.

**This distinction is important for FERPA compliance:** AI Search indexes do not contain PII. The SQL layer, governed by the approved view catalog and row-level security, controls access to actual student data.

## Core Components

### Index

The search index is the primary artifact. It contains:
- **Fields** — the schema of each document stored in the index
- **CORS settings** — controls who can query the index
- **Scoring profiles** — adjusts ranking for specific fields
- **Vector search configuration** — enables embedding-based similarity search

### Document

Each entry in the index is a document. For the district metadata catalog, each document represents one chunk: one data dictionary entry, one view description, one business rule.

### Indexer

An indexer is a scheduled process that pulls data from a data source and pushes it into the index. For the metadata catalog, you will push documents directly via the SDK (no indexer needed initially).

### Skillset (optional for this course)

A skillset applies AI enrichment during indexing — extracting text from PDFs, splitting documents, or generating embeddings automatically. For the metadata catalog (pre-chunked structured data), you will generate embeddings in your ingestion script and push the pre-computed vectors into the index.

## Index Schema Design for the District Metadata Catalog

Each document in the metadata index represents one knowledge chunk about the district data system.

### Field Types

| Field Name | Type | Purpose |
|-----------|------|---------|
| `id` | `Edm.String` (key) | Unique identifier (e.g., "view-attendance-byschool") |
| `category` | `Edm.String` (filterable) | Document type: "view", "field-definition", "business-rule", "faq", "domain-overview" |
| `domain` | `Edm.String` (filterable) | Data domain: "attendance", "assessment", "intervention", "benchmark" |
| `role_scope` | `Collection(Edm.String)` (filterable) | Which roles can see this: ["teacher", "school_admin", "district_admin"] |
| `title` | `Edm.String` (searchable) | Short title of this chunk |
| `content` | `Edm.String` (searchable) | Full text content of this chunk |
| `view_name` | `Edm.String` (filterable, optional) | If this chunk describes a view, the view name |
| `parameters` | `Edm.String` (searchable, optional) | Parameters the view accepts |
| `last_updated` | `Edm.DateTimeOffset` | When this metadata was last updated |
| `content_vector` | `Collection(Edm.Single)` | Embedding vector (1536 dimensions for text-embedding-3-small) |

### Key Design Decisions

**`role_scope` as a multi-value filter field:** A single metadata document may be relevant to multiple roles. A view description for `vw_AttendanceSummaryByStudentAndTerm` is relevant to both teachers (own students) and school admins (all students at their school). The `role_scope` collection allows pre-filtering to only retrieve documents the user's role can use.

**No PII in the index:** The index contains metadata about data, not actual data. No student names, IDs, or records should appear in any index document.

**Separate domain from category:** `domain` tells you what data area (attendance, assessment); `category` tells you what type of chunk it is (view description, field definition). Both are needed for filtering.

## Defining the Index in .NET

```csharp
// Labs/Lab03a/SearchIndexDefinition.cs
using Azure.Search.Documents.Indexes;
using Azure.Search.Documents.Indexes.Models;

namespace SusdAiLabs.Labs.Lab03a;

public static class SearchIndexDefinition
{
    public const string IndexName = "susd-metadata-v1";
    public const int EmbeddingDimensions = 1536; // text-embedding-3-small

    public static SearchIndex CreateIndex()
    {
        // ── Vector search configuration ───────────────────────────────────────
        var vectorSearchConfig = new VectorSearch();
        vectorSearchConfig.Algorithms.Add(
            new HnswAlgorithmConfiguration("hnsw-config")
            {
                Parameters = new HnswParameters
                {
                    Metric = VectorSearchAlgorithmMetric.Cosine,
                    M = 4,               // Connections per node (4-64; 4 is fine for small indexes)
                    EfConstruction = 400, // Build-time accuracy
                    EfSearch = 500,       // Query-time accuracy
                }
            });
        vectorSearchConfig.Profiles.Add(
            new VectorSearchProfile("vector-profile", "hnsw-config"));

        // ── Semantic configuration ─────────────────────────────────────────────
        var semanticConfig = new SemanticConfiguration(
            "susd-semantic",
            new SemanticPrioritizedFields
            {
                ContentFields = { new SemanticField("content") },
                KeywordsFields = { new SemanticField("title"), new SemanticField("domain") },
            });
        var semanticSearch = new SemanticSearch();
        semanticSearch.Configurations.Add(semanticConfig);

        // ── Field definitions ─────────────────────────────────────────────────
        var fields = new List<SearchField>
        {
            new SimpleField("id",            SearchFieldDataType.String)
                { IsKey = true, IsFilterable = true },
            new SearchableField("title")     { IsFilterable = false, IsSortable = false },
            new SearchableField("content")   { IsFilterable = false },
            new SimpleField("category",      SearchFieldDataType.String)
                { IsFilterable = true, IsFacetable = true },
            new SimpleField("domain",        SearchFieldDataType.String)
                { IsFilterable = true, IsFacetable = true },
            new SimpleField("view_name",     SearchFieldDataType.String)
                { IsFilterable = true },
            new SearchableField("parameters"){ IsFilterable = false },
            new SimpleField("role_scope",
                SearchFieldDataType.Collection(SearchFieldDataType.String))
                { IsFilterable = true },
            new SimpleField("last_updated",  SearchFieldDataType.DateTimeOffset)
                { IsFilterable = true, IsSortable = true },
            new VectorSearchField("content_vector", EmbeddingDimensions, "vector-profile"),
        };

        return new SearchIndex(IndexName, fields)
        {
            VectorSearch = vectorSearchConfig,
            SemanticSearch = semanticSearch,
        };
    }
}
```

## Defining the Index in Python

```python
# scripts/lab03a_create_index.py
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex, SearchField, SearchFieldDataType,
    SimpleField, SearchableField, VectorSearch, HnswAlgorithmConfiguration,
    HnswParameters, VectorSearchAlgorithmMetric, VectorSearchProfile,
    SemanticConfiguration, SemanticPrioritizedFields, SemanticField,
    SemanticSearch, VectorSearchField,
)
from azure.core.credentials import AzureKeyCredential
import os
from dotenv import load_dotenv

load_dotenv(".env.local")

INDEX_NAME = "susd-metadata-v1"
EMBEDDING_DIMENSIONS = 1536  # text-embedding-3-small

fields = [
    SimpleField("id",         type=SearchFieldDataType.String,
                key=True, filterable=True),
    SearchableField("title",  type=SearchFieldDataType.String),
    SearchableField("content",type=SearchFieldDataType.String),
    SimpleField("category",   type=SearchFieldDataType.String,
                filterable=True, facetable=True),
    SimpleField("domain",     type=SearchFieldDataType.String,
                filterable=True, facetable=True),
    SimpleField("view_name",  type=SearchFieldDataType.String,
                filterable=True),
    SearchableField("parameters", type=SearchFieldDataType.String),
    SimpleField("role_scope",
                type=SearchFieldDataType.Collection(SearchFieldDataType.String),
                filterable=True),
    SimpleField("last_updated", type=SearchFieldDataType.DateTimeOffset,
                filterable=True, sortable=True),
    SearchableField("content_vector",
                    type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                    vector_search_dimensions=EMBEDDING_DIMENSIONS,
                    vector_search_profile_name="vector-profile"),
]

vector_search = VectorSearch(
    algorithms=[
        HnswAlgorithmConfiguration(
            name="hnsw-config",
            parameters=HnswParameters(
                m=4,
                ef_construction=400,
                ef_search=500,
                metric=VectorSearchAlgorithmMetric.COSINE,
            )
        )
    ],
    profiles=[
        VectorSearchProfile(name="vector-profile", algorithm_configuration_name="hnsw-config")
    ]
)

semantic_config = SemanticConfiguration(
    name="susd-semantic",
    prioritized_fields=SemanticPrioritizedFields(
        content_fields=[SemanticField(field_name="content")],
        keywords_fields=[SemanticField(field_name="title"), SemanticField(field_name="domain")],
    )
)
semantic_search = SemanticSearch(configurations=[semantic_config])

index = SearchIndex(
    name=INDEX_NAME,
    fields=fields,
    vector_search=vector_search,
    semantic_search=semantic_search,
)

client = SearchIndexClient(
    endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_SEARCH_KEY"]),
)

result = client.create_or_update_index(index)
print(f"Index '{result.name}' created/updated with {len(result.fields)} fields.")
```

## Querying the Index

### Hybrid Search Query

```python
# scripts/search_demo.py
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from azure.core.credentials import AzureKeyCredential
from openai import AzureOpenAI
import os
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

def search_metadata(
    query: str,
    user_role: str,
    domain_filter: str | None = None,
    top_k: int = 5,
) -> list[dict]:
    """Hybrid search with role-based pre-filtering."""

    # 1. Embed the query
    embedding_response = openai_client.embeddings.create(
        model=os.environ["AZURE_OPENAI_EMBEDDING_DEPLOYMENT"],
        input=query,
    )
    query_vector = embedding_response.data[0].embedding

    # 2. Build filter string (security trimming)
    filter_parts = [f"role_scope/any(r: r eq '{user_role}')"]
    if domain_filter:
        filter_parts.append(f"domain eq '{domain_filter}'")
    filter_str = " and ".join(filter_parts)

    # 3. Build vector query
    vector_query = VectorizedQuery(
        vector=query_vector,
        k_nearest_neighbors=top_k,
        fields="content_vector",
    )

    # 4. Execute hybrid search
    results = search_client.search(
        search_text=query,           # BM25 keyword component
        vector_queries=[vector_query],  # Vector component (merged via RRF)
        filter=filter_str,           # Security trimming pre-filter
        select=["id", "title", "content", "category", "domain", "view_name", "parameters"],
        top=top_k,
        query_type="semantic",       # Semantic re-ranking (requires Standard tier)
        semantic_configuration_name="susd-semantic",
    )

    return [
        {
            "id": r["id"],
            "title": r["title"],
            "content": r["content"],
            "category": r["category"],
            "domain": r.get("domain"),
            "view_name": r.get("view_name"),
            "score": r["@search.score"],
            "reranker_score": r.get("@search.reranker_score"),
        }
        for r in results
    ]

# Test search
results = search_metadata(
    query="What is the attendance rate for Grade 3?",
    user_role="school_admin",
    domain_filter="attendance",
)

for r in results:
    print(f"[{r['score']:.4f}] {r['title']}")
    print(f"  Category: {r['category']} | View: {r.get('view_name', 'N/A')}")
    print(f"  {r['content'][:200]}")
    print()
```

### .NET Hybrid Search

```csharp
// Labs/Lab03a/MetadataSearchService.cs
using Azure.Search.Documents;
using Azure.Search.Documents.Models;
using Azure;

namespace SusdAiLabs.Labs.Lab03a;

public class MetadataSearchService
{
    private readonly SearchClient _searchClient;

    public MetadataSearchService(string endpoint, string key, string indexName)
    {
        _searchClient = new SearchClient(
            new Uri(endpoint),
            indexName,
            new AzureKeyCredential(key));
    }

    public async Task<List<MetadataDocument>> HybridSearchAsync(
        string query,
        ReadOnlyMemory<float> queryVector,
        string userRole,
        string? domainFilter = null,
        int topK = 5)
    {
        // Security trimming: only retrieve documents the user's role can access
        var filterParts = new List<string>
        {
            $"role_scope/any(r: r eq '{userRole}')"
        };
        if (!string.IsNullOrEmpty(domainFilter))
            filterParts.Add($"domain eq '{domainFilter}'");

        var options = new SearchOptions
        {
            Filter = string.Join(" and ", filterParts),
            Size = topK,
            QueryType = SearchQueryType.Semantic,
            SemanticSearch = new SemanticSearchOptions
            {
                SemanticConfigurationName = "susd-semantic",
                QueryAnswer = new QueryAnswerOptions(QueryAnswerMode.Extractive)
                {
                    AnswerCount = 1
                }
            },
            VectorSearch = new VectorSearchOptions
            {
                Queries =
                {
                    new VectorizedQuery(queryVector)
                    {
                        KNearestNeighborsCount = topK,
                        Fields = { "content_vector" }
                    }
                }
            },
            Select = { "id", "title", "content", "category", "domain", "view_name", "parameters" }
        };

        var response = await _searchClient.SearchAsync<MetadataDocument>(query, options);
        var results = new List<MetadataDocument>();

        await foreach (var result in response.Value.GetResultsAsync())
        {
            var doc = result.Document;
            doc.SearchScore = result.Score;
            doc.RerankerScore = result.SemanticSearch?.RerankerScore;
            results.Add(doc);
        }

        return results;
    }
}

public class MetadataDocument
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public string Category { get; set; } = "";
    public string? Domain { get; set; }
    public string? ViewName { get; set; }
    public string? Parameters { get; set; }
    [System.Text.Json.Serialization.JsonIgnore]
    public double? SearchScore { get; set; }
    [System.Text.Json.Serialization.JsonIgnore]
    public double? RerankerScore { get; set; }
}
```

## Security Trimming

Security trimming is the pattern of applying a filter at query time that restricts which documents are returned based on the user's identity or role. In Azure AI Search, this is done via the `filter` parameter.

For the district analytics assistant:

| User Role | Filter Applied |
|-----------|---------------|
| teacher | `role_scope/any(r: r eq 'teacher')` |
| school_admin | `role_scope/any(r: r eq 'school_admin')` |
| district_admin | `role_scope/any(r: r eq 'district_admin')` |

**Never rely on post-retrieval filtering.** If you retrieve all documents and then filter in code, you risk logging, latency overhead, and potential future bugs. Apply the filter in the query so documents outside the user's scope are never returned.

**Important:** Security trimming at the search index level is for metadata documents only. The actual student data authorization happens at the SQL Server layer through the approved view catalog and service account permissions.

## Basic vs. Standard Tier

For this course, Basic tier is used in labs.

| Feature | Basic | Standard S1 |
|---------|-------|------------|
| Storage | 2 GB | 25 GB |
| Indexes | 5 | 50 |
| Documents per index | 1M | 15M |
| Vector search | Yes | Yes |
| Semantic re-ranking | **No** | Yes |
| Replicas | 3 | 12 |
| Partitions | 1 | 12 |
| Cost (approx.) | ~$75/mo | ~$250/mo |

**For the district metadata catalog (small structured dataset), Basic tier is sufficient.** The metadata catalog contains at most a few hundred documents.

**Semantic re-ranking requires Standard S1.** If your query results include irrelevant documents even with hybrid search, upgrading to Standard to enable semantic re-ranking is the next step.

**Note on `query_type="semantic"` in code:** In Python and .NET, you can specify semantic query type even on Basic tier without causing an error — it will fall back to keyword+vector hybrid. Verify behavior in your tier.

## Ingestion Pattern

For the district metadata catalog, documents are pushed directly (no indexer):

```
1. Author metadata documents as structured data (Python dict or .NET objects)
2. Generate embedding for the `content` field using text-embedding-3-small
3. Set `content_vector` to the embedding result
4. Upload the document to the index via SDK
5. Repeat for all chunks
6. On metadata updates: re-generate embedding and re-upload
```

This is simpler than configuring an indexer and is appropriate for a dataset that changes infrequently (metadata schema changes, not daily data refreshes).

## Reflection Questions

1. Why does the metadata index not contain actual student attendance or assessment data?
2. A new teacher needs to see view descriptions for all attendance views. What `role_scope` values should those view description documents have?
3. You observe that for the question "What does chronically absent mean?", the top result is an FAQ entry about intervention thresholds. What would you change in the index to improve this?
4. You upgrade from Basic to Standard tier. Which query code needs to change, and which can stay the same?

## References

- [Azure AI Search documentation](https://learn.microsoft.com/azure/search/)
- [Vector search in Azure AI Search](https://learn.microsoft.com/azure/search/vector-search-overview)
- [Hybrid search](https://learn.microsoft.com/azure/search/hybrid-search-overview)
- [Semantic ranking](https://learn.microsoft.com/azure/search/semantic-search-overview)
- [Security filters in Azure AI Search](https://learn.microsoft.com/azure/search/search-security-trimming-for-azure-search)
- [Azure.Search.Documents SDK (.NET)](https://learn.microsoft.com/dotnet/api/overview/azure/search.documents-readme)
- [azure-search-documents SDK (Python)](https://learn.microsoft.com/python/api/overview/azure/search-documents-readme)

*Next: Lab 03a — Build the AI Search Index*
