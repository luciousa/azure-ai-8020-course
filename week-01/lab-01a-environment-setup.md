# Lab 01a — Environment Setup

**Week:** 1 | **Estimated time:** 3–4 hours  
**Type:** Setup lab — complete once; all subsequent labs depend on this  
**Prerequisites:** Module 01 and Module 02 complete; Azure subscription with Owner or Contributor access

## Lab Objectives

By the end of this lab you will have:

1. An Azure resource group with all required services provisioned.
2. A working Azure OpenAI deployment (chat + embeddings).
3. A working Azure AI Search index (empty; populated in Lab 03a).
4. A local development environment with .NET 10 SDK and Python 3.11+.
5. The synthetic K-12 database (`SunlakeUnifiedDW`) restored to a local SQL Server instance.
6. Verified connectivity to all services from both .NET and Python.

**⚠️ POC Configuration Warning:** This lab uses public endpoints and API keys for simplicity. Week 7 and Week 8 cover the production security hardening steps (private endpoints, managed identity, no API keys).

## Prerequisites Checklist

Before starting, confirm the following:

- [ ] Azure subscription with ability to create resources in East US or East US 2
- [ ] Azure OpenAI resource access approved (requires Microsoft approval — submit request at least 2 business days early at https://aka.ms/oai/access)
- [ ] .NET SDK to be installed (target: .NET 10; fallback: .NET 8)
- [ ] Python 3.11+ to be installed
- [ ] SQL Server 2019+ or SQL Server Express available (local or lab VM)
- [ ] Azure CLI installed (`az --version` should return ≥ 2.55)
- [ ] Git installed

## Part 1 — Provision Azure Resources

### Step 1.1 — Create Resource Group

```bash
# Set these variables to your values
RESOURCE_GROUP="rg-susd-ai-poc"
LOCATION="eastus"
YOUR_ALIAS="your-initials"  # e.g., "lds" — used to make resource names unique

az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"
```

### Step 1.2 — Provision Azure OpenAI Service

> **Note:** Azure OpenAI is not available in all regions. East US and East US 2 reliably support GPT-4o and text-embedding-3-small as of 2025-26.

```bash
AOAI_NAME="aoai-susd-${YOUR_ALIAS}"

az cognitiveservices account create \
  --name "$AOAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --kind OpenAI \
  --sku S0 \
  --location "$LOCATION" \
  --yes
```

**Create model deployments:**

```bash
# Chat model (gpt-4o-mini is cost-effective for labs; swap to gpt-4o for production)
az cognitiveservices account deployment create \
  --name "$AOAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "gpt-4o-mini" \
  --model-name "gpt-4o-mini" \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard

# Embedding model
az cognitiveservices account deployment create \
  --name "$AOAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "text-embedding-3-small" \
  --model-name "text-embedding-3-small" \
  --model-version "1" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard
```

**Retrieve endpoint and key:**

```bash
# Endpoint
az cognitiveservices account show \
  --name "$AOAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.endpoint" -o tsv

# API Key (save this — you will store it in Key Vault in production)
az cognitiveservices account keys list \
  --name "$AOAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "key1" -o tsv
```

### Step 1.3 — Provision Azure AI Search

```bash
SEARCH_NAME="srch-susd-${YOUR_ALIAS}"

az search service create \
  --name "$SEARCH_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --sku basic \
  --location "$LOCATION" \
  --partition-count 1 \
  --replica-count 1
```

> **Why Basic tier?** Basic supports semantic ranker (required for Week 3) and is the minimum billable tier. Free tier does not support semantic ranker. Basic is approximately $75/month for lab use.

**Retrieve admin key:**

```bash
az search admin-key show \
  --service-name "$SEARCH_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "primaryKey" -o tsv
```

### Step 1.4 — Provision Azure Key Vault (Optional for POC — Required for Production)

```bash
KV_NAME="kv-susd-${YOUR_ALIAS}"

az keyvault create \
  --name "$KV_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --enable-soft-delete true \
  --soft-delete-retention-days 7

# Store your secrets
az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "AzureOpenAI-ApiKey" \
  --value "<your-openai-api-key>"

az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "AzureSearch-AdminKey" \
  --value "<your-search-admin-key>"

az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "SqlServer-ConnectionString" \
  --value "Server=localhost;Database=SunlakeUnifiedDW;User Id=sa;Password=<password>;TrustServerCertificate=True"
```

### Step 1.5 — Record Your Configuration

Create a file called `.env.local` in your project root (add to `.gitignore`):

```ini
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://<your-resource>.search.windows.net
AZURE_SEARCH_ADMIN_KEY=<your-key>
AZURE_SEARCH_INDEX_NAME=district-metadata-index

# SQL Server (synthetic database)
SQL_CONNECTION_STRING=Server=localhost;Database=SunlakeUnifiedDW;User Id=sa;Password=<password>;TrustServerCertificate=True

# Lab mode flag
LAB_MODE=true
```

**⚠️ Never commit `.env.local` to source control.**

## Part 2 — Local Development Environment

### Step 2.1 — Install .NET 10 SDK

```bash
# Verify existing .NET installation
dotnet --list-sdks

# If .NET 10 is not listed, download from:
# https://dot.net/download
# Select .NET 10 (or .NET 8 LTS if your organization requires it)

# After installation, verify:
dotnet --version
# Expected: 10.x.x (or 8.x.x for .NET 8 path)
```

> **For .NET 8 compatibility:** All code in this course works on .NET 8.0. In every project file, you will see a comment: `<!-- For .NET 8 compatibility: change TargetFramework to net8.0 -->`.
>
> ⚠️ **.NET 6 is End of Life** (November 2024). Do not start new development on .NET 6.

### Step 2.2 — Create the .NET Lab Project

```bash
mkdir susd-ai-labs
cd susd-ai-labs
dotnet new webapi --name SusdAiLabs --framework net10.0
cd SusdAiLabs
```

**Update `SusdAiLabs.csproj`:**

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <!-- .NET 10 primary target -->
    <TargetFramework>net10.0</TargetFramework>
    <!-- For .NET 8 compatibility: change to net8.0 — all packages below work unchanged -->
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Azure.AI.OpenAI"             Version="2.*" />
    <PackageReference Include="Azure.Search.Documents"       Version="11.*" />
    <PackageReference Include="Azure.Security.KeyVault.Secrets" Version="4.*" />
    <PackageReference Include="Azure.Identity"              Version="1.*" />
    <PackageReference Include="Microsoft.Data.SqlClient"    Version="5.*" />
    <PackageReference Include="Dapper"                      Version="2.*" />
    <!-- OpenTelemetry + Azure Monitor (preferred telemetry in .NET 10) -->
    <PackageReference Include="Azure.Monitor.OpenTelemetry.AspNetCore" Version="1.*" />
    <!-- dotenv for lab local config loading -->
    <PackageReference Include="DotNetEnv"                   Version="3.*" />
  </ItemGroup>
</Project>
```

```bash
dotnet restore
dotnet build
```

### Step 2.3 — Install Python Environment

```bash
# Verify Python version
python --version
# Expected: 3.11.x or higher

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate

# Install required packages
pip install openai azure-search-documents azure-identity \
            pyodbc pandas python-dotenv jupyter ipykernel \
            azure-ai-evaluation
```

**Verify package versions:**

```python
import openai
import azure.search.documents
print(f"openai: {openai.__version__}")
print(f"azure-search-documents: {azure.search.documents.__version__}")
```

## Part 3 — Synthetic SQL Server Database Setup

### Step 3.1 — SQL Server Prerequisites

For labs, use one of:
- SQL Server 2019+ Developer Edition (free for dev/test)
- SQL Server Express (free, 10GB limit — sufficient for this course)
- Docker: `docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=Lab!Password1' -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest`

### Step 3.2 — Create Database and Schema

Run the following SQL in SQL Server Management Studio (SSMS) or Azure Data Studio:

```sql
-- Create the lab database
CREATE DATABASE SunlakeUnifiedDW
    COLLATE SQL_Latin1_General_CP1_CI_AS;
GO

USE SunlakeUnifiedDW;
GO

-- Reference: see resources/synthetic-schema.md for all DDL
-- Run the CREATE TABLE statements from synthetic-schema.md in this order:
-- 1. dim_SchoolYear
-- 2. dim_Term
-- 3. dim_School
-- 4. dim_GradeLevel
-- 5. dim_Staff
-- 6. dim_Student
-- 7. dim_Course
-- 8. dim_AssessmentTest
-- 9. dim_Subgroup
-- 10. dim_Program
-- 11. dim_Date (populated by step 3.3)
-- 12. fact_Enrollment
-- 13. fact_Attendance
-- 14. fact_GradeRecord
-- 15. fact_CourseSchedule
-- 16. fact_LocalAssessmentResult
-- 17. fact_StateAssessmentResult
-- 18. fact_InterventionMonitoring
-- 19. fact_PerformanceBenchmark
```

### Step 3.3 — Populate dim_Date

```sql
-- Populate dim_Date for 2022-08-01 through 2026-06-30
DECLARE @StartDate DATE = '2022-08-01';
DECLARE @EndDate   DATE = '2026-06-30';
DECLARE @Current   DATE = @StartDate;

WHILE @Current <= @EndDate
BEGIN
    INSERT INTO dim_Date (DateKey, FullDate, IsSchoolDay, DayOfWeek, Month, Quarter, Year)
    VALUES (
        CAST(FORMAT(@Current, 'yyyyMMdd') AS INT),
        @Current,
        CASE WHEN DATEPART(WEEKDAY, @Current) NOT IN (1, 7) THEN 1 ELSE 0 END,
        DATENAME(WEEKDAY, @Current),
        MONTH(@Current),
        DATEPART(QUARTER, @Current),
        YEAR(@Current)
    );
    SET @Current = DATEADD(DAY, 1, @Current);
END;
```

### Step 3.4 — Run Synthetic Data Generator

The Python data generator creates ~500 students, ~90,000 attendance records, and ~4,000 assessment records with realistic K-12 distributions.

Save this as `scripts/generate_synthetic_data.py`:

```python
"""
Synthetic K-12 data generator for SunlakeUnifiedDW.
All data is fictional. Seeds are fixed for reproducibility.
"""
import random
import pyodbc
import os
from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv(".env.local")

CONN_STR = os.environ["SQL_CONNECTION_STRING"]
random.seed(42)  # Fixed seed — reproducible across lab environments

# ── Helpers ──────────────────────────────────────────────────────────────────

FIRST_NAMES_M = ["James","Marcus","Carlos","Kevin","Andre","Miguel","Tyler","Devon","Omar","Jaylen"]
FIRST_NAMES_F = ["Maria","Sofia","Angela","Linda","Amara","Jasmine","Destiny","Aaliyah","Maya","Priya"]
LAST_NAMES = ["Sanchez","Thompson","Johnson","Nguyen","Rivera","Brown","Kim","Gomez","Williams","Davis",
              "Martinez","Garcia","Robinson","Lewis","Jackson","White","Harris","Clark","Moore","Young"]

ETHNICITIES = [
    ("W","White",0.42),("H","Hispanic",0.28),("B","Black/African American",0.18),
    ("A","Asian",0.06),("MR","Multiracial",0.04),("I","American Indian",0.01),("U","Unknown",0.01)
]

def pick_ethnicity():
    r = random.random()
    cumulative = 0.0
    for code, label, prob in ETHNICITIES:
        cumulative += prob
        if r <= cumulative:
            return code, label
    return "U", "Unknown"

def weighted_bool(p_true: float) -> bool:
    return random.random() < p_true

def date_range(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)

# ── Main generation ───────────────────────────────────────────────────────────

def generate_students(cursor, n=500):
    students = []
    for i in range(1, n + 1):
        gender = random.choice(["M","F","M","F","F"])  # slight female skew
        fn = random.choice(FIRST_NAMES_F if gender == "F" else FIRST_NAMES_M)
        ln = random.choice(LAST_NAMES)
        eth_code, eth_label = pick_ethnicity()
        is_ell = weighted_bool(0.22 if eth_code == "H" else 0.04)
        is_ese = weighted_bool(0.15)
        is_frl = weighted_bool(0.48)
        birth_year = random.randint(2010, 2017)
        birth_date = date(birth_year, random.randint(1,12), random.randint(1,28))
        cursor.execute("""
            INSERT INTO dim_Student
            (StudentKey,StudentID,FirstName,LastName,DateOfBirth,GenderCode,
             EthnicityCode,EthnicityLabel,IsELL,IsESE,IsFreeReducedLunch,
             IsHomeless,IsMigrant,IsFosterCare,IsActive,EnrollmentDate)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, i, f"STU{i:08d}", fn, ln, birth_date, gender,
             eth_code, eth_label, int(is_ell), int(is_ese), int(is_frl),
             int(weighted_bool(0.03)), int(weighted_bool(0.02)),
             int(weighted_bool(0.01)), 1, date(2022, 8, 15))
        students.append(i)
    print(f"  ✓ {n} students created")
    return students

def generate_enrollment(cursor, students):
    """Assign each student to a school and grade for 2025-26."""
    school_grade_map = {
        1: list(range(2, 8)),    # SCH001 K-5 (GradeLevelKey 2-7)
        2: list(range(8, 11)),   # SCH002 6-8
        3: list(range(11, 15)),  # SCH003 9-12
        4: list(range(1, 8)),    # SCH004 PK-5
        5: list(range(2, 11)),   # SCH005 K-8
        6: list(range(8, 11)),   # SCH006 6-8
        7: list(range(2, 8)),    # SCH007 K-5
        8: list(range(11, 15)),  # SCH008 9-12
    }
    enrolled = []
    for sk in students:
        school_key = random.choice(list(school_grade_map.keys()))
        grade_key = random.choice(school_grade_map[school_key])
        cursor.execute("""
            INSERT INTO fact_Enrollment
            (StudentKey,SchoolKey,GradeLevelKey,SchoolYearKey,EnrollDate,IsCurrentEnroll)
            VALUES (?,?,?,4,?,1)
        """, sk, school_key, grade_key, date(2025, 8, 11))
        enrolled.append((sk, school_key, grade_key))
    print(f"  ✓ {len(enrolled)} enrollment records created")
    return enrolled

def generate_attendance(cursor, enrolled):
    """Generate attendance for 2025-26 Q1-Q2 (Aug 2025 – Jan 2026)."""
    school_days = [d for d in date_range(date(2025, 8, 11), date(2026, 1, 9))
                   if d.weekday() < 5]  # Mon-Fri only
    records = 0
    for sk, school_key, _ in enrolled:
        chronic_risk = weighted_bool(0.12)  # ~12% at chronic risk
        for d in school_days:
            dk = int(d.strftime("%Y%m%d"))
            # Determine term
            term_key = 101 if d <= date(2025, 10, 10) else 102
            if chronic_risk:
                code = random.choices(["P","A","E","T"], weights=[82,10,6,2])[0]
            else:
                code = random.choices(["P","A","E","T"], weights=[96,2,1.5,0.5])[0]
            is_present = int(code == "P")
            is_absent = int(code in ("A","E"))
            is_excused = int(code == "E")
            is_tardy = int(code == "T")
            cursor.execute("""
                INSERT INTO fact_Attendance
                (StudentKey,SchoolKey,DateKey,TermKey,AttendanceCode,
                 IsPresent,IsAbsent,IsExcused,IsTardy)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, sk, school_key, dk, term_key, code,
                 is_present, is_absent, is_excused, is_tardy)
            records += 1
    print(f"  ✓ {records:,} attendance records created")

def generate_local_assessments(cursor, enrolled):
    """Generate BOY and MOY local assessment results."""
    # Assessment keys: 1=READ-G3-BOY, 2=READ-G3-MOY, 4=MATH-G4-BOY, 5=MATH-G4-MOY, 10=MATH-G3-MOY
    grade_assessments = {
        5: [(1, date(2025,8,20)), (2, date(2026,1,14))],   # Grade 3 ELA
        6: [(4, date(2025,8,20)), (5, date(2026,1,14))],   # Grade 4 Math
        5: [(10, date(2026,1,14))],                         # Grade 3 Math MOY
    }
    records = 0
    for sk, school_key, grade_key in enrolled:
        assessments = grade_assessments.get(grade_key, [])
        for assess_key, admin_date in assessments:
            # Simulate score distribution
            pct = max(0, min(100, random.gauss(66, 18)))
            level = 1 if pct < 50 else 2 if pct < 70 else 3 if pct < 85 else 4
            is_prof = int(pct >= 70)
            dq_flag = None
            if random.random() < 0.03:
                dq_flag = random.choice(["MISSING","PARTIAL","SUSPECTED_ERROR"])
            cursor.execute("""
                INSERT INTO fact_LocalAssessmentResult
                (StudentKey,AssessmentKey,SchoolKey,SchoolYearKey,AdminDate,
                 PercentScore,PerformanceLevel,IsProficient,DataQualityFlag)
                VALUES (?,?,?,4,?,?,?,?,?)
            """, sk, assess_key, school_key, admin_date,
                 round(pct, 2), level, is_prof, dq_flag)
            records += 1
    print(f"  ✓ {records:,} local assessment records created")

def generate_interventions(cursor, enrolled):
    """Put ~15% of students in Tier 2 or Tier 3 interventions."""
    records = 0
    for sk, school_key, grade_key in enrolled:
        if weighted_bool(0.15):
            tier = 3 if weighted_bool(0.25) else 2
            prog_key = 2 if tier == 2 else 3
            status = random.choice(["ON_TRACK","AT_RISK","OFF_TRACK"])
            cursor.execute("""
                INSERT INTO fact_InterventionMonitoring
                (StudentKey,ProgramKey,SchoolKey,SchoolYearKey,EntryDate,
                 CurrentTier,ProgressStatus,LastProgressDate)
                VALUES (?,?,?,4,?,?,?,?)
            """, sk, prog_key, school_key, date(2025,9,1),
                 tier, status, date(2025,11,1))
            records += 1
    print(f"  ✓ {records} intervention records created")

# ── Run ───────────────────────────────────────────────────────────────────────

def main():
    print("Connecting to SunlakeUnifiedDW...")
    conn = pyodbc.connect(CONN_STR)
    conn.autocommit = False
    cursor = conn.cursor()

    print("\n[1/5] Generating students...")
    students = generate_students(cursor)

    print("\n[2/5] Generating enrollment...")
    enrolled = generate_enrollment(cursor, students)

    print("\n[3/5] Generating attendance (this may take 2-3 minutes)...")
    generate_attendance(cursor, enrolled)

    print("\n[4/5] Generating local assessment results...")
    generate_local_assessments(cursor, enrolled)

    print("\n[5/5] Generating intervention records...")
    generate_interventions(cursor, enrolled)

    conn.commit()
    print("\n✅ Synthetic data generation complete!")
    print("   Run SELECT COUNT(*) FROM fact_Attendance to verify.")

if __name__ == "__main__":
    main()
```

Run the generator:

```bash
python scripts/generate_synthetic_data.py
```

Expected output:
```
Connecting to SunlakeUnifiedDW...
[1/5] Generating students...
  ✓ 500 students created
[2/5] Generating enrollment...
  ✓ 500 enrollment records created
[3/5] Generating attendance (this may take 2-3 minutes)...
  ✓ 88,500 attendance records created
[4/5] Generating local assessment results...
  ✓ ~1,200 local assessment records created
[5/5] Generating intervention records...
  ✓ ~75 intervention records created

✅ Synthetic data generation complete!
```

## Part 4 — Verify Connectivity

### Step 4.1 — .NET Connectivity Test

Create `VerifyConnectivity.cs`:

```csharp
using Azure;
using Azure.AI.OpenAI;
using Azure.Search.Documents;
using Microsoft.Data.SqlClient;
using DotNetEnv;

Env.Load(".env.local");

Console.WriteLine("=== SUSD AI Lab - Connectivity Check ===\n");

// 1. Azure OpenAI
try
{
    var aoaiEndpoint = new Uri(Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!);
    var aoaiKey = new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_OPENAI_API_KEY")!);
    var client = new AzureOpenAIClient(aoaiEndpoint, aoaiKey);
    var chatClient = client.GetChatClient(
        Environment.GetEnvironmentVariable("AZURE_OPENAI_CHAT_DEPLOYMENT")!);

    var completion = await chatClient.CompleteChatAsync(
        [new UserChatMessage("Say: CONNECTIVITY OK")]);

    Console.WriteLine($"✅ Azure OpenAI: {completion.Value.Content[0].Text}");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Azure OpenAI: {ex.Message}");
}

// 2. Azure AI Search
try
{
    var searchEndpoint = new Uri(Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT")!);
    var searchKey = new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_SEARCH_ADMIN_KEY")!);
    var searchClient = new SearchIndexClient(searchEndpoint, searchKey);
    var indexes = searchClient.GetIndexNames().ToList();
    Console.WriteLine($"✅ Azure AI Search: connected. Indexes: [{string.Join(", ", indexes)}]");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Azure AI Search: {ex.Message}");
}

// 3. SQL Server
try
{
    await using var conn = new SqlConnection(
        Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING")!);
    await conn.OpenAsync();
    var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT COUNT(*) FROM dim_School WHERE IsActive = 1";
    var count = (int)(await cmd.ExecuteScalarAsync())!;
    Console.WriteLine($"✅ SQL Server: connected. Active schools: {count}");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ SQL Server: {ex.Message}");
}

Console.WriteLine("\n=== Check Complete ===");
```

Run:

```bash
dotnet run --project SusdAiLabs
```

Expected:
```
=== SUSD AI Lab - Connectivity Check ===

✅ Azure OpenAI: CONNECTIVITY OK
✅ Azure AI Search: connected. Indexes: []
✅ SQL Server: connected. Active schools: 8

=== Check Complete ===
```

### Step 4.2 — Python Connectivity Test

Create `scripts/verify_connectivity.py`:

```python
"""Verify connectivity to all three services from Python."""
import os
from dotenv import load_dotenv

load_dotenv(".env.local")

print("=== SUSD AI Lab - Python Connectivity Check ===\n")

# 1. Azure OpenAI
try:
    from openai import AzureOpenAI
    client = AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        api_version=os.environ["AZURE_OPENAI_API_VERSION"],
    )
    resp = client.chat.completions.create(
        model=os.environ["AZURE_OPENAI_CHAT_DEPLOYMENT"],
        messages=[{"role": "user", "content": "Say: CONNECTIVITY OK"}],
        max_tokens=20,
    )
    print(f"✅ Azure OpenAI: {resp.choices[0].message.content}")
except Exception as e:
    print(f"❌ Azure OpenAI: {e}")

# 2. Azure AI Search
try:
    from azure.search.documents.indexes import SearchIndexClient
    from azure.core.credentials import AzureKeyCredential
    sc = SearchIndexClient(
        endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
        credential=AzureKeyCredential(os.environ["AZURE_SEARCH_ADMIN_KEY"]),
    )
    indexes = list(sc.list_index_names())
    print(f"✅ Azure AI Search: connected. Indexes: {indexes}")
except Exception as e:
    print(f"❌ Azure AI Search: {e}")

# 3. SQL Server
try:
    import pyodbc
    conn = pyodbc.connect(os.environ["SQL_CONNECTION_STRING"])
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM dim_Student WHERE IsActive = 1")
    count = cursor.fetchone()[0]
    print(f"✅ SQL Server: connected. Active students: {count}")
except Exception as e:
    print(f"❌ SQL Server: {e}")

print("\n=== Check Complete ===")
```

```bash
python scripts/verify_connectivity.py
```

## Part 5 — Create Approved Views

Run the view creation statements from `resources/synthetic-schema.md` against `SunlakeUnifiedDW`:

```sql
-- Run each CREATE OR ALTER VIEW statement from resources/synthetic-schema.md
-- Order:
-- 1. vw_AttendanceSummaryByStudentAndTerm
-- 2. vw_AttendanceSummaryBySchoolAndGrade
-- 3. vw_LocalAssessmentResultsBySchoolAndGrade
-- 4. vw_StateAssessmentSummaryBySchoolAndGrade
-- 5. vw_AssessmentGapBySubgroup
-- 6. vw_PerformanceVsBenchmark
-- 7. vw_LongitudinalProficiencyTrend
-- 8. vw_InterventionStudentSummary
-- 9. vw_DataQualityFlags

-- Verify
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME;
```

Expected: 9 view names returned.

## Lab Completion Checklist

- [ ] Azure resource group created
- [ ] Azure OpenAI service provisioned with `gpt-4o-mini` and `text-embedding-3-small` deployments
- [ ] Azure AI Search provisioned (Basic tier)
- [ ] `.env.local` created and populated (not committed to git)
- [ ] .NET 10 (or .NET 8) SDK installed; `dotnet build` succeeds
- [ ] Python 3.11+ installed; all packages installed
- [ ] `SunlakeUnifiedDW` database created with all tables
- [ ] `dim_Date` populated for 2022–2026
- [ ] Synthetic data generated (500 students, 88k+ attendance records)
- [ ] All 9 views created successfully
- [ ] .NET connectivity check: all 3 services ✅
- [ ] Python connectivity check: all 3 services ✅

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Azure OpenAI 403 | API key wrong or resource name typo | Re-run `az cognitiveservices account keys list` |
| Azure OpenAI 404 on deployment | Deployment name mismatch | Check `AZURE_OPENAI_CHAT_DEPLOYMENT` matches what you created |
| AI Search 401 | Wrong key (query key vs. admin key) | Use admin key for index creation; use query key for search only |
| SQL Server connection refused | SQL Server not running or port blocked | Start SQL Server service; check Windows Firewall for port 1433 |
| `pyodbc.InterfaceError` | ODBC driver not installed | Install "ODBC Driver 18 for SQL Server" from Microsoft |
| `dotnet restore` fails | .NET 10 SDK not in PATH | Restart terminal after SDK install |
| Azure OpenAI access denied | Azure OpenAI access not yet approved | Request access at https://aka.ms/oai/access (2 business days) |

## Cost Estimate

| Resource | Tier | Approx. Monthly Cost (Lab Use) |
|----------|------|-------------------------------|
| Azure OpenAI (gpt-4o-mini) | S0 | ~$5–20 for lab volume |
| Azure OpenAI (text-embedding-3-small) | S0 | <$2 for lab volume |
| Azure AI Search | Basic | ~$75 |
| Azure Key Vault | Standard | <$5 |
| **Total** | | **~$85–100/month** |

> **Cost tip:** Delete the resource group when not actively working to avoid unnecessary charges. Recreate it when starting a new lab session. Use `az group delete --name rg-susd-ai-poc --yes --no-wait` to tear down.

## Security Observations (Record in Lab Report)

1. What is the difference between using an API key vs. a managed identity for Azure OpenAI authentication?
2. Why is the `.gitignore` entry for `.env.local` more important in an educational setting than in a commercial project?
3. The synthetic data generator uses `random.seed(42)`. Why does a fixed seed matter for a lab environment?

*Next: Module 03 — Azure OpenAI Fundamentals*
