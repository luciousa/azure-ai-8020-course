# Module 03 — Azure OpenAI Fundamentals

**Week:** 2 | **Estimated time:** 2.5–3 hours  
**Prerequisites:** Lab 01a complete (working Azure OpenAI deployment)  
**Builds toward:** Lab 02a (first OpenAI call), all subsequent modules

## Learning Objectives

By the end of this module you will be able to:

1. Explain Azure OpenAI model families and choose the right model for chat vs. embeddings.
2. Describe the chat completions API request structure: messages array, role types, max tokens, temperature.
3. Explain what tokens are and why the token budget matters for this use case.
4. Configure content filtering policies and interpret content filter results.
5. Authenticate to Azure OpenAI using an API key (POC) and describe the managed identity path (production).
6. Read token usage from API responses and estimate cost.

## The Azure OpenAI Service Model

Azure OpenAI is **not** the same as calling `api.openai.com`. It is OpenAI models deployed inside Microsoft's Azure datacenters, with:

- Microsoft's security and compliance controls applied
- Data residency in your chosen Azure region
- Customer data not used for model training (with standard Azure OpenAI agreement)
- Integration with Azure RBAC and private networking
- Content filtering policies configurable per deployment

This distinction matters for FERPA: data sent to Azure OpenAI under your district's Microsoft agreement stays within the agreement boundary. Data sent to public OpenAI endpoints is subject to different terms.

## Model Families

### Chat Completions Models

| Model | Context Window | Best For | Cost Signal |
|-------|---------------|----------|-------------|
| `gpt-4o` | 128k tokens | High-quality answers, complex reasoning | Higher |
| `gpt-4o-mini` | 128k tokens | Good quality, faster, much lower cost | Lower |
| `gpt-4` | 8k / 32k | Older model; gpt-4o is preferred | Higher |

**For this course:** Use `gpt-4o-mini` in labs. The quality difference for structured Q&A with retrieved context is small. Use `gpt-4o` for the capstone or when answer quality is the evaluation focus.

### Embedding Models

| Model | Dimensions | Best For |
|-------|-----------|----------|
| `text-embedding-3-small` | 1536 | Fast, cost-effective, strong retrieval quality |
| `text-embedding-3-large` | 3072 | Marginally better quality; higher cost and storage |
| `text-embedding-ada-002` | 1536 | Legacy; prefer text-embedding-3-small for new work |

**For this course:** Use `text-embedding-3-small`. Existing indexes built with `ada-002` are not compatible — re-embed if switching.

## API Concepts

### The Messages Array

Every chat completions request contains a list of messages. Each message has a **role** and **content**:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a district analytics assistant for Sunlake Unified School District. ..."
    },
    {
      "role": "user",
      "content": "What is the attendance rate for Grade 3 at Palmetto Ridge Elementary this term?"
    }
  ]
}
```

| Role | Purpose |
|------|---------|
| `system` | Sets the assistant's persona, rules, and context. Sent on every request. |
| `user` | The current user's question or input. |
| `assistant` | Prior assistant responses — used in multi-turn conversations. |

**For the analytics assistant:** The system message is where you inject the user's role, data scope, retrieved metadata, and grounding instructions. This is the most important part of your prompt design.

### Tokens

A **token** is roughly 3/4 of a word (75 tokens ≈ 100 words in English). The model processes input and output as token sequences.

**Why tokens matter:**
- Every model has a **maximum context length** (e.g., GPT-4o: 128k tokens).
- You are billed per token (input + output separately).
- Retrieved SQL query results returned as text consume tokens. A result set with 50 rows × 10 columns can easily use 2,000–5,000 tokens.

**Token budget for the analytics assistant:**

| Component | Approximate Token Budget |
|-----------|------------------------|
| System prompt (role, rules, grounding instructions) | 500–800 |
| Retrieved metadata context (AI Search results) | 800–1,500 |
| SQL query results (summarized, not raw rows) | 500–2,000 |
| User question | 50–200 |
| Response | 300–800 |
| **Total** | **2,150–5,300** |

Well within the 128k limit. However, avoid returning raw query result rows — summarize or aggregate in SQL before passing to the model.

### Key Request Parameters

```json
{
  "model": "gpt-4o-mini",
  "messages": [...],
  "temperature": 0.1,
  "max_tokens": 800,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0
}
```

| Parameter | What It Controls | Analytics Assistant Setting |
|-----------|-----------------|----------------------------|
| `temperature` | Randomness (0 = deterministic, 1 = creative) | **0.0–0.2** — factual answers must be consistent |
| `max_tokens` | Maximum response length | 600–1000 for structured answers |
| `top_p` | Nucleus sampling threshold | Leave at 1.0 with low temperature |
| `frequency_penalty` | Penalty for token repetition | 0.0 (no penalty needed) |
| `presence_penalty` | Penalty for topic repetition | 0.0 |

> **Rule:** For factual analytics assistants, keep `temperature` at 0.0–0.2. Higher temperatures produce more varied — and less reliable — answers.

### Response Structure

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The attendance rate for Grade 3 at Palmetto Ridge Elementary in Q1 2025-26 was 94.2%, based on data from the district attendance system..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 843,
    "completion_tokens": 127,
    "total_tokens": 970
  }
}
```

**Always read:**
- `choices[0].message.content` — the answer
- `choices[0].finish_reason` — `"stop"` = normal completion; `"length"` = truncated (increase `max_tokens`)
- `usage.total_tokens` — log this for cost monitoring and optimization

## Content Filtering

Azure OpenAI applies content filtering by default to every request. The filter evaluates:

| Category | Examples |
|----------|---------|
| Hate | Discriminatory content targeting groups |
| Violence | Graphic or harmful violent content |
| Sexual | Explicit sexual content |
| Self-harm | Content encouraging self-harm |
| Jailbreak | Prompts attempting to bypass safety controls |

For district use, the relevant risk is **jailbreak attempts** — a user trying to extract data outside their authorized scope by manipulating the prompt.

**Content filter response header:**

```json
"content_filter_results": {
  "hate": { "filtered": false, "severity": "safe" },
  "self_harm": { "filtered": false, "severity": "safe" },
  "sexual": { "filtered": false, "severity": "safe" },
  "violence": { "filtered": false, "severity": "safe" },
  "jailbreak": { "detected": false, "filtered": false }
}
```

If `"filtered": true`, the request or response was blocked. Log this event — it may indicate a user attempting to misuse the system.

## Authentication Approaches

### POC / Lab: API Key

```csharp
// .NET — API key authentication
using Azure;
using Azure.AI.OpenAI;

var client = new AzureOpenAIClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!),
    new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_OPENAI_API_KEY")!)
);
```

```python
# Python — API key authentication
from openai import AzureOpenAI
client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version="2025-01-01-preview",
)
```

### Production: Managed Identity

```csharp
// .NET — Managed Identity (no API key)
using Azure.Identity;

var client = new AzureOpenAIClient(
    new Uri(Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!),
    new DefaultAzureCredential()  // picks up managed identity in Azure, dev credentials locally
);
```

```python
# Python — Managed Identity
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
)
client = AzureOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    azure_ad_token_provider=token_provider,
    api_version="2025-01-01-preview",
)
```

**Required RBAC role:** `Cognitive Services OpenAI User` on the Azure OpenAI resource.

## Making Your First Chat Completion Call

### .NET

```csharp
var chatClient = client.GetChatClient("gpt-4o-mini");

var completion = await chatClient.CompleteChatAsync(
    new List<ChatMessage>
    {
        new SystemChatMessage("""
            You are a district analytics assistant for Sunlake Unified School District.
            Answer only questions about district data. Be factual and concise.
            If you cannot answer from the provided context, say so clearly.
            """),
        new UserChatMessage(
            "What attendance data do you have access to?")
    },
    new ChatCompletionOptions
    {
        Temperature = 0.1f,
        MaxOutputTokenCount = 600,
    }
);

Console.WriteLine(completion.Value.Content[0].Text);
Console.WriteLine($"\nTokens used: {completion.Value.Usage.TotalTokenCount}");
```

### Python

```python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {
            "role": "system",
            "content": (
                "You are a district analytics assistant for Sunlake Unified School District. "
                "Answer only questions about district data. Be factual and concise. "
                "If you cannot answer from the provided context, say so clearly."
            )
        },
        {
            "role": "user",
            "content": "What attendance data do you have access to?"
        }
    ],
    temperature=0.1,
    max_tokens=600,
)

print(response.choices[0].message.content)
print(f"\nTokens used: {response.usage.total_tokens}")
```

## Generating Embeddings

Embeddings convert text into a vector (a list of floats). Similar texts produce similar vectors — the basis for semantic search.

### .NET

```csharp
var embeddingClient = client.GetEmbeddingClient("text-embedding-3-small");

EmbeddingCollection embeddings = await embeddingClient.GenerateEmbeddingsAsync(
    new List<string> { "Grade 3 reading proficiency rate" });

float[] vector = embeddings[0].ToFloats().ToArray();
Console.WriteLine($"Embedding dimensions: {vector.Length}");  // 1536
```

### Python

```python
embed_client = client  # same client, different deployment

response = client.embeddings.create(
    model="text-embedding-3-small",
    input="Grade 3 reading proficiency rate",
)
vector = response.data[0].embedding
print(f"Embedding dimensions: {len(vector)}")  # 1536
```

## Cost Awareness

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| gpt-4o-mini | ~$0.00015 | ~$0.00060 |
| gpt-4o | ~$0.00250 | ~$0.01000 |
| text-embedding-3-small | ~$0.00002 | — |

**Example:** 1,000 questions per day at 1,000 tokens each (input + output):
- `gpt-4o-mini`: ~$0.75/day
- `gpt-4o`: ~$12.50/day

For a district POC with 50 users, `gpt-4o-mini` is appropriate. Switch to `gpt-4o` selectively for complex analytical reasoning.

## Responsible AI Defaults

Azure OpenAI includes built-in Responsible AI controls:

1. **Content filtering** — on by default, described above.
2. **Data handling** — customer data is not used for model training under the standard Azure OpenAI agreement (verify your district's agreement).
3. **No model fine-tuning on student data** — even if fine-tuning is available, this course explicitly prohibits training on student records.
4. **Audit logging** — enable Azure Monitor diagnostic logs on the Azure OpenAI resource to capture request/response metadata (not content by default; content logging is opt-in and requires additional data processing review).

## Common Errors and What They Mean

| Error Code | Meaning | Action |
|-----------|---------|--------|
| 401 Unauthorized | Wrong API key or Entra ID token | Verify key or token scope |
| 403 Forbidden | Correct credentials, no permission | Check RBAC role assignment |
| 404 Not Found | Deployment name wrong or deleted | Check deployment name in Azure portal |
| 429 Too Many Requests | Rate limit exceeded | Implement exponential backoff; consider PTU tier |
| 400 Bad Request / content_filter | Prompt or response blocked | Review content filter result category |
| 503 Service Unavailable | Transient overload | Retry with backoff |

## Reflection Questions

1. A teacher's question contains the phrase "tell me which student is performing worst in my class." What content filter categories might fire? What should happen?
2. You observe `finish_reason: "length"` in responses. What two changes could you make?
3. Why should `temperature` be 0.1 for a factual analytics assistant rather than 0.7?
4. What is the difference between embedding the user's question and embedding a metadata document?

## Assessment Task

Write a short .NET or Python program that:
1. Sends a system prompt identifying the assistant as a district analytics tool.
2. Asks two questions: one in scope (district attendance) and one out of scope (today's weather).
3. Logs the token usage for each call.
4. Prints whether the answer is grounded (manually assess: does the answer acknowledge it only knows what it was told?).

Document your observations in the lab report template.

## References

- [Azure OpenAI chat completions API reference](https://learn.microsoft.com/azure/ai-services/openai/reference)
- [Azure OpenAI models — availability by region](https://learn.microsoft.com/azure/ai-services/openai/concepts/models)
- [Azure OpenAI content filtering](https://learn.microsoft.com/azure/ai-services/openai/concepts/content-filter)
- [Azure OpenAI data privacy FAQ](https://learn.microsoft.com/azure/ai-services/openai/faq)
- [Azure.AI.OpenAI .NET SDK changelog](https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/openai/Azure.AI.OpenAI/CHANGELOG.md)
- [openai Python SDK](https://github.com/openai/openai-python)

*Next: Module 04 — Prompt Engineering for Analytics Assistants*
