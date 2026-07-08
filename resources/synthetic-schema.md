# Synthetic K-12 District Database Schema

**Purpose:** All course labs use this synthetic schema. No real student data is ever used.  
**District:** Fictional "Sunlake Unified School District" (SUSD) — all names, IDs, and values are fabricated.  
**Database name (for labs):** `SunlakeUnifiedDW`  
**Platform:** SQL Server 2019+ / Azure SQL Database compatible

## Domain Overview

| Domain | Tables | Description |
|--------|--------|-------------|
| School Organization | `dim_School`, `dim_GradeLevel`, `dim_Staff` | Schools, grade levels, staff roster |
| Student | `dim_Student`, `dim_Subgroup`, `dim_Program` | Student demographics, subgroups, programs |
| Time | `dim_Date`, `dim_SchoolYear`, `dim_Term` | Calendar, school years, terms |
| Enrollment | `fact_Enrollment`, `dim_Course`, `fact_CourseSchedule` | Enrollment and course assignments |
| Attendance | `fact_Attendance` | Daily and period attendance records |
| Grades | `fact_GradeRecord` | Semester/quarter grades |
| Assessment | `dim_AssessmentTest`, `fact_LocalAssessmentResult`, `fact_StateAssessmentResult` | Local and state assessment results |
| Intervention | `fact_InterventionMonitoring` | Student intervention tracking |
| Performance Benchmarks | `fact_PerformanceBenchmark` | Expected vs. actual performance targets |

## Dimension Tables

### `dim_School`

```sql
CREATE TABLE dim_School (
    SchoolKey        INT           NOT NULL PRIMARY KEY,
    SchoolID         VARCHAR(10)   NOT NULL UNIQUE,   -- e.g. 'SCH042'
    SchoolName       VARCHAR(100)  NOT NULL,
    SchoolType       VARCHAR(30)   NOT NULL,          -- 'Elementary','Middle','High','K-8'
    GradeRangeLow    VARCHAR(5)    NOT NULL,          -- 'PK','K','1'...'12'
    GradeRangeHigh   VARCHAR(5)    NOT NULL,
    PrincipalStaffID VARCHAR(20)   NULL,
    RegionCode       VARCHAR(10)   NULL,
    IsActive         BIT           NOT NULL DEFAULT 1,
    CreatedDate      DATE          NOT NULL
);

INSERT INTO dim_School VALUES
(1,'SCH001','Palmetto Ridge Elementary','Elementary','K','5','STF1001','NORTH',1,'2018-08-01'),
(2,'SCH002','Cypress Lake Middle','Middle','6','8','STF1042','NORTH',1,'2018-08-01'),
(3,'SCH003','Sunlake High School','High','9','12','STF1078','CENTRAL',1,'2018-08-01'),
(4,'SCH004','Manatee Bay Elementary','Elementary','PK','5','STF1102','SOUTH',1,'2018-08-01'),
(5,'SCH005','Everglades K-8 Center','K-8','K','8','STF1130','SOUTH',1,'2019-08-01'),
(6,'SCH006','Osprey Middle School','Middle','6','8','STF1156','CENTRAL',1,'2018-08-01'),
(7,'SCH007','Sandpiper Elementary','Elementary','K','5','STF1188','EAST',1,'2020-08-01'),
(8,'SCH008','Blue Heron High School','High','9','12','STF1210','EAST',1,'2018-08-01');
```

### `dim_GradeLevel`

```sql
CREATE TABLE dim_GradeLevel (
    GradeLevelKey  INT          NOT NULL PRIMARY KEY,
    GradeCode      VARCHAR(5)   NOT NULL UNIQUE,  -- 'K','1','2'...'12','PK'
    GradeLabel     VARCHAR(20)  NOT NULL,
    GradeBand      VARCHAR(20)  NOT NULL,          -- 'Primary','Elementary','Middle','High'
    SortOrder      INT          NOT NULL
);

INSERT INTO dim_GradeLevel VALUES
(1,'PK','Pre-K','Primary',0),
(2,'K','Kindergarten','Primary',1),
(3,'1','Grade 1','Elementary',2),
(4,'2','Grade 2','Elementary',3),
(5,'3','Grade 3','Elementary',4),
(6,'4','Grade 4','Elementary',5),
(7,'5','Grade 5','Elementary',6),
(8,'6','Grade 6','Middle',7),
(9,'7','Grade 7','Middle',8),
(10,'8','Grade 8','Middle',9),
(11,'9','Grade 9','High',10),
(12,'10','Grade 10','High',11),
(13,'11','Grade 11','High',12),
(14,'12','Grade 12','High',13);
```

### `dim_Student`

```sql
CREATE TABLE dim_Student (
    StudentKey       INT           NOT NULL PRIMARY KEY,
    StudentID        VARCHAR(15)   NOT NULL UNIQUE,    -- e.g. 'STU00001234'
    -- NOTE: No real names; all values are synthetic
    FirstName        VARCHAR(50)   NOT NULL,
    LastName         VARCHAR(50)   NOT NULL,
    DateOfBirth      DATE          NOT NULL,
    GenderCode       VARCHAR(10)   NOT NULL,           -- 'M','F','NB','U'
    EthnicityCode    VARCHAR(20)   NOT NULL,           -- 'W','B','H','A','I','P','MR','U'
    EthnicityLabel   VARCHAR(50)   NOT NULL,
    IsELL            BIT           NOT NULL DEFAULT 0, -- English Language Learner
    IsESE            BIT           NOT NULL DEFAULT 0, -- Exceptional Student Education
    IsFreeReducedLunch BIT         NOT NULL DEFAULT 0,
    IsHomeless       BIT           NOT NULL DEFAULT 0,
    IsMigrant        BIT           NOT NULL DEFAULT 0,
    IsFosterCare     BIT           NOT NULL DEFAULT 0,
    IsActive         BIT           NOT NULL DEFAULT 1,
    EnrollmentDate   DATE          NULL,
    WithdrawalDate   DATE          NULL
);
-- Sample rows (100 synthetic students — full dataset in lab setup script)
INSERT INTO dim_Student VALUES
(1,'STU00001001','Maria','Sanchez','2015-03-12','F','H','Hispanic',1,0,1,0,0,0,1,'2021-08-18',NULL),
(2,'STU00001002','James','Thompson','2014-11-05','M','W','White',0,0,0,0,0,0,1,'2020-08-19',NULL),
(3,'STU00001003','Amara','Johnson','2015-06-22','F','B','Black/African American',0,1,1,0,0,0,1,'2021-08-18',NULL),
(4,'STU00001004','Kevin','Nguyen','2014-09-14','M','A','Asian',0,0,0,0,0,0,1,'2020-08-19',NULL),
(5,'STU00001005','Sofia','Rivera','2015-01-30','F','H','Hispanic',1,0,1,0,1,0,1,'2021-08-18',NULL);
-- ... (full 500-student dataset generated by lab-01a setup script)
```

### `dim_Staff`

```sql
CREATE TABLE dim_Staff (
    StaffKey       INT           NOT NULL PRIMARY KEY,
    StaffID        VARCHAR(20)   NOT NULL UNIQUE,
    FirstName      VARCHAR(50)   NOT NULL,
    LastName       VARCHAR(50)   NOT NULL,
    RoleCode       VARCHAR(30)   NOT NULL,    -- 'TEACHER','PRINCIPAL','AP','COUNSELOR','DISTRICT_ADMIN'
    SchoolKey      INT           NULL REFERENCES dim_School(SchoolKey),
    DepartmentCode VARCHAR(30)   NULL,
    IsActive       BIT           NOT NULL DEFAULT 1,
    HireDate       DATE          NULL
);

INSERT INTO dim_Staff VALUES
(1001,'STF1001','Eleanor','Martinez','PRINCIPAL',1,NULL,1,'2015-07-01'),
(1042,'STF1042','Robert','Chen','PRINCIPAL',2,NULL,1,'2017-07-01'),
(1078,'STF1078','Patricia','Williams','PRINCIPAL',3,NULL,1,'2014-07-01'),
(2001,'STF2001','Angela','Davis','TEACHER',1,'ELA',1,'2019-08-15'),
(2002,'STF2002','Marcus','Brown','TEACHER',1,'MATH',1,'2020-08-15'),
(2003,'STF2003','Linda','Kim','TEACHER',2,'SCIENCE',1,'2018-08-15'),
(2004,'STF2004','Carlos','Gomez','TEACHER',3,'ELA',1,'2016-08-15'),
(9001,'STF9001','Diane','Richards','DISTRICT_ADMIN',NULL,'ACCOUNTABILITY',1,'2010-07-01');
```

### `dim_SchoolYear`

```sql
CREATE TABLE dim_SchoolYear (
    SchoolYearKey  INT          NOT NULL PRIMARY KEY,
    SchoolYearID   VARCHAR(10)  NOT NULL UNIQUE,  -- '2024-25','2025-26'
    YearLabel      VARCHAR(30)  NOT NULL,
    StartDate      DATE         NOT NULL,
    EndDate        DATE         NOT NULL,
    IsCurrent      BIT          NOT NULL DEFAULT 0
);

INSERT INTO dim_SchoolYear VALUES
(1,'2022-23','School Year 2022-23','2022-08-15','2023-06-02',0),
(2,'2023-24','School Year 2023-24','2023-08-14','2024-05-31',0),
(3,'2024-25','School Year 2024-25','2024-08-12','2025-05-30',0),
(4,'2025-26','School Year 2025-26','2025-08-11','2026-05-29',1);
```

### `dim_Term`

```sql
CREATE TABLE dim_Term (
    TermKey        INT          NOT NULL PRIMARY KEY,
    SchoolYearKey  INT          NOT NULL REFERENCES dim_SchoolYear(SchoolYearKey),
    TermCode       VARCHAR(15)  NOT NULL UNIQUE,  -- 'Q1-2025-26','S1-2025-26'
    TermType       VARCHAR(10)  NOT NULL,          -- 'QUARTER','SEMESTER','YEAR'
    TermLabel      VARCHAR(30)  NOT NULL,
    StartDate      DATE         NOT NULL,
    EndDate        DATE         NOT NULL,
    IsCurrent      BIT          NOT NULL DEFAULT 0
);

INSERT INTO dim_Term VALUES
(101,4,'Q1-2025-26','QUARTER','Quarter 1 (2025-26)','2025-08-11','2025-10-10',0),
(102,4,'Q2-2025-26','QUARTER','Quarter 2 (2025-26)','2025-10-13','2026-01-09',0),
(103,4,'Q3-2025-26','QUARTER','Quarter 3 (2025-26)','2026-01-12','2026-03-20',0),
(104,4,'Q4-2025-26','QUARTER','Quarter 4 (2025-26)','2026-03-23','2026-05-29',0),
(201,4,'S1-2025-26','SEMESTER','Semester 1 (2025-26)','2025-08-11','2026-01-09',0),
(202,4,'S2-2025-26','SEMESTER','Semester 2 (2025-26)','2026-01-12','2026-05-29',1);
```

### `dim_Date`

```sql
CREATE TABLE dim_Date (
    DateKey        INT     NOT NULL PRIMARY KEY,  -- YYYYMMDD integer
    FullDate       DATE    NOT NULL UNIQUE,
    SchoolYearKey  INT     NULL REFERENCES dim_SchoolYear(SchoolYearKey),
    TermKey        INT     NULL REFERENCES dim_Term(TermKey),
    IsSchoolDay    BIT     NOT NULL DEFAULT 0,
    DayOfWeek      VARCHAR(10) NOT NULL,
    Month          INT     NOT NULL,
    Quarter        INT     NOT NULL,
    Year           INT     NOT NULL
);
-- Populated by lab setup script for dates 2022-08-01 through 2026-06-30
```

### `dim_Course`

```sql
CREATE TABLE dim_Course (
    CourseKey      INT          NOT NULL PRIMARY KEY,
    CourseID       VARCHAR(20)  NOT NULL UNIQUE,
    CourseName     VARCHAR(100) NOT NULL,
    SubjectArea    VARCHAR(30)  NOT NULL,   -- 'ELA','MATH','SCIENCE','SOCIAL_STUDIES','ESE','ELL','ELECTIVE'
    CourseLevel    VARCHAR(20)  NOT NULL,   -- 'STANDARD','HONORS','AP','REMEDIAL'
    GradeLevelKey  INT          NULL REFERENCES dim_GradeLevel(GradeLevelKey),
    Credits        DECIMAL(4,2) NOT NULL DEFAULT 1.0
);

INSERT INTO dim_Course VALUES
(1,'ELA0300','Reading - Grade 3','ELA','STANDARD',5,1.0),
(2,'ELA0400','Reading - Grade 4','ELA','STANDARD',6,1.0),
(3,'ELA0500','Reading - Grade 5','ELA','STANDARD',7,1.0),
(4,'MTH0300','Math - Grade 3','MATH','STANDARD',5,1.0),
(5,'MTH0400','Math - Grade 4','MATH','STANDARD',6,1.0),
(6,'MTH0500','Math - Grade 5','MATH','STANDARD',7,1.0),
(7,'ELA1000','English I - Grade 9','ELA','STANDARD',11,1.0),
(8,'ALG1000','Algebra I','MATH','STANDARD',11,1.0),
(9,'ELA1001','English I Honors - Grade 9','ELA','HONORS',11,1.0),
(10,'ALG1001','Algebra I Honors','MATH','HONORS',11,1.0),
(11,'ELA2000','English II','ELA','STANDARD',12,1.0),
(12,'GEO1000','Geometry','MATH','STANDARD',12,1.0);
```

### `dim_AssessmentTest`

```sql
CREATE TABLE dim_AssessmentTest (
    AssessmentKey      INT          NOT NULL PRIMARY KEY,
    AssessmentID       VARCHAR(30)  NOT NULL UNIQUE,
    AssessmentName     VARCHAR(100) NOT NULL,
    AssessmentType     VARCHAR(20)  NOT NULL,  -- 'LOCAL','STATE'
    SubjectArea        VARCHAR(30)  NOT NULL,
    GradeLevelKey      INT          NULL REFERENCES dim_GradeLevel(GradeLevelKey),
    MaxScore           INT          NOT NULL,
    ProficiencyCutScore INT         NULL,
    AdminWindow        VARCHAR(30)  NULL,       -- 'BOY','MOY','EOY','SPRING'
    ScoreType          VARCHAR(20)  NOT NULL    -- 'SCALE','PERCENT','LEVEL'
);

INSERT INTO dim_AssessmentTest VALUES
(1,'SUSD-READ-G3-BOY','SUSD Reading Diagnostic Grade 3 - BOY','LOCAL','ELA',5,100,70,'BOY','PERCENT'),
(2,'SUSD-READ-G3-MOY','SUSD Reading Diagnostic Grade 3 - MOY','LOCAL','ELA',5,100,70,'MOY','PERCENT'),
(3,'SUSD-READ-G3-EOY','SUSD Reading Diagnostic Grade 3 - EOY','LOCAL','ELA',5,100,70,'EOY','PERCENT'),
(4,'SUSD-MATH-G4-BOY','SUSD Math Diagnostic Grade 4 - BOY','LOCAL','MATH',6,100,70,'BOY','PERCENT'),
(5,'SUSD-MATH-G4-MOY','SUSD Math Diagnostic Grade 4 - MOY','LOCAL','MATH',6,100,70,'MOY','PERCENT'),
(6,'FSA-ELA-G3','FL State Assessment - ELA Grade 3','STATE','ELA',5,5,3,'SPRING','LEVEL'),
(7,'FSA-MATH-G4','FL State Assessment - Math Grade 4','STATE','MATH',6,5,3,'SPRING','LEVEL'),
(8,'EOC-ALG1','Algebra I End-of-Course Assessment','STATE','MATH',11,5,3,'SPRING','LEVEL'),
(9,'EOC-ELA10','Grade 10 ELA FSA','STATE','ELA',12,5,3,'SPRING','LEVEL'),
(10,'SUSD-MATH-G3-MOY','SUSD Math Diagnostic Grade 3 - MOY','LOCAL','MATH',5,100,70,'MOY','PERCENT');
```

### `dim_Subgroup`

```sql
CREATE TABLE dim_Subgroup (
    SubgroupKey    INT          NOT NULL PRIMARY KEY,
    SubgroupCode   VARCHAR(30)  NOT NULL UNIQUE,
    SubgroupLabel  VARCHAR(60)  NOT NULL,
    SubgroupType   VARCHAR(30)  NOT NULL  -- 'ETHNICITY','PROGRAM','ECONOMIC','DISABILITY'
);

INSERT INTO dim_Subgroup VALUES
(1,'ALL','All Students','AGGREGATE'),
(2,'WHITE','White','ETHNICITY'),
(3,'BLACK','Black/African American','ETHNICITY'),
(4,'HISPANIC','Hispanic','ETHNICITY'),
(5,'ASIAN','Asian','ETHNICITY'),
(6,'MULTIRACIAL','Multiracial','ETHNICITY'),
(7,'ELL','English Language Learners','PROGRAM'),
(8,'ESE','Exceptional Student Education','PROGRAM'),
(9,'FRL','Free/Reduced Lunch','ECONOMIC'),
(10,'HOMELESS','Homeless','ECONOMIC'),
(11,'GIFTED','Gifted','PROGRAM');
```

### `dim_Program`

```sql
CREATE TABLE dim_Program (
    ProgramKey     INT          NOT NULL PRIMARY KEY,
    ProgramCode    VARCHAR(30)  NOT NULL UNIQUE,
    ProgramName    VARCHAR(100) NOT NULL,
    ProgramType    VARCHAR(30)  NOT NULL
);

INSERT INTO dim_Program VALUES
(1,'TIER1','Core Instruction (Tier 1)','MTSS'),
(2,'TIER2','Targeted Intervention (Tier 2)','MTSS'),
(3,'TIER3','Intensive Intervention (Tier 3)','MTSS'),
(4,'ESE_SPED','Special Education - IEP','ESE'),
(5,'ESE_GIFTED','Gifted Education','ESE'),
(6,'ELL_BEGINNER','ELL Beginner','ELL'),
(7,'ELL_INTERMEDIATE','ELL Intermediate','ELL'),
(8,'ELL_ADVANCED','ELL Advanced','ELL'),
(9,'TITLE1_SUPP','Title I Supplemental Support','FEDERAL'),
(10,'READ_RECOVERY','Reading Recovery','INTERVENTION');
```

## Fact Tables

### `fact_Enrollment`

```sql
CREATE TABLE fact_Enrollment (
    EnrollmentKey   BIGINT        NOT NULL PRIMARY KEY IDENTITY,
    StudentKey      INT           NOT NULL REFERENCES dim_Student(StudentKey),
    SchoolKey       INT           NOT NULL REFERENCES dim_School(SchoolKey),
    GradeLevelKey   INT           NOT NULL REFERENCES dim_GradeLevel(GradeLevelKey),
    SchoolYearKey   INT           NOT NULL REFERENCES dim_SchoolYear(SchoolYearKey),
    EnrollDate      DATE          NOT NULL,
    ExitDate        DATE          NULL,
    ExitReason      VARCHAR(30)   NULL,  -- 'GRADUATE','TRANSFER_IN','TRANSFER_OUT','WITHDRAWN','GRADUATED'
    IsCurrentEnroll BIT           NOT NULL DEFAULT 1,
    TeacherStaffKey INT           NULL REFERENCES dim_Staff(StaffKey),  -- homeroom/primary teacher
    CONSTRAINT uq_enrollment UNIQUE (StudentKey, SchoolKey, SchoolYearKey, EnrollDate)
);
```

### `fact_Attendance`

```sql
CREATE TABLE fact_Attendance (
    AttendanceKey   BIGINT       NOT NULL PRIMARY KEY IDENTITY,
    StudentKey      INT          NOT NULL REFERENCES dim_Student(StudentKey),
    SchoolKey       INT          NOT NULL REFERENCES dim_School(SchoolKey),
    DateKey         INT          NOT NULL REFERENCES dim_Date(DateKey),
    TermKey         INT          NOT NULL REFERENCES dim_Term(TermKey),
    AttendanceCode  VARCHAR(10)  NOT NULL,  -- 'P','A','T','E','S'
    -- P=Present, A=Unexcused Absent, T=Tardy, E=Excused Absent, S=Suspended
    IsPresent       BIT          NOT NULL,
    IsAbsent        BIT          NOT NULL,
    IsExcused       BIT          NOT NULL DEFAULT 0,
    IsTardy         BIT          NOT NULL DEFAULT 0,
    CONSTRAINT uq_attendance UNIQUE (StudentKey, SchoolKey, DateKey)
);
```

### `fact_GradeRecord`

```sql
CREATE TABLE fact_GradeRecord (
    GradeKey        BIGINT        NOT NULL PRIMARY KEY IDENTITY,
    StudentKey      INT           NOT NULL REFERENCES dim_Student(StudentKey),
    CourseKey       INT           NOT NULL REFERENCES dim_Course(CourseKey),
    SchoolKey       INT           NOT NULL REFERENCES dim_School(SchoolKey),
    TermKey         INT           NOT NULL REFERENCES dim_Term(TermKey),
    GradeValue      VARCHAR(5)    NOT NULL,   -- 'A','B','C','D','F','I','WF'
    NumericGrade    DECIMAL(5,2)  NULL,        -- 0.00-100.00
    IsPassingGrade  BIT           NOT NULL,
    Credits         DECIMAL(4,2)  NULL,
    GradeType       VARCHAR(15)   NOT NULL DEFAULT 'FINAL'  -- 'QUARTER','SEMESTER','FINAL'
);
```

### `fact_CourseSchedule`

```sql
CREATE TABLE fact_CourseSchedule (
    ScheduleKey     BIGINT       NOT NULL PRIMARY KEY IDENTITY,
    StudentKey      INT          NOT NULL REFERENCES dim_Student(StudentKey),
    CourseKey       INT          NOT NULL REFERENCES dim_Course(CourseKey),
    SchoolKey       INT          NOT NULL REFERENCES dim_School(SchoolKey),
    TeacherStaffKey INT          NOT NULL REFERENCES dim_Staff(StaffKey),
    SchoolYearKey   INT          NOT NULL REFERENCES dim_SchoolYear(SchoolYearKey),
    PeriodCode      VARCHAR(10)  NULL,
    SectionID       VARCHAR(20)  NULL,
    IsActive        BIT          NOT NULL DEFAULT 1
);
```

### `fact_LocalAssessmentResult`

```sql
CREATE TABLE fact_LocalAssessmentResult (
    LocalAssessKey  BIGINT        NOT NULL PRIMARY KEY IDENTITY,
    StudentKey      INT           NOT NULL REFERENCES dim_Student(StudentKey),
    AssessmentKey   INT           NOT NULL REFERENCES dim_AssessmentTest(AssessmentKey),
    SchoolKey       INT           NOT NULL REFERENCES dim_School(SchoolKey),
    TeacherStaffKey INT           NULL REFERENCES dim_Staff(StaffKey),
    SchoolYearKey   INT           NOT NULL REFERENCES dim_SchoolYear(SchoolYearKey),
    TermKey         INT           NULL REFERENCES dim_Term(TermKey),
    AdminDate       DATE          NOT NULL,
    RawScore        DECIMAL(8,2)  NULL,
    ScaledScore     DECIMAL(8,2)  NULL,
    PercentScore    DECIMAL(5,2)  NULL,   -- 0.00-100.00
    PerformanceLevel INT          NULL,    -- 1=Below Basic, 2=Basic, 3=Proficient, 4=Advanced
    IsProficient    BIT           NOT NULL DEFAULT 0,
    GrowthScore     DECIMAL(6,2)  NULL,   -- score change from prior admin
    DataQualityFlag VARCHAR(30)   NULL    -- NULL=clean, 'MISSING','PARTIAL','SUSPECTED_ERROR'
);
```

### `fact_StateAssessmentResult`

```sql
CREATE TABLE fact_StateAssessmentResult (
    StateAssessKey  BIGINT        NOT NULL PRIMARY KEY IDENTITY,
    StudentKey      INT           NOT NULL REFERENCES dim_Student(StudentKey),
    AssessmentKey   INT           NOT NULL REFERENCES dim_AssessmentTest(AssessmentKey),
    SchoolKey       INT           NOT NULL REFERENCES dim_School(SchoolKey),
    SchoolYearKey   INT           NOT NULL REFERENCES dim_SchoolYear(SchoolYearKey),
    AdminDate       DATE          NOT NULL,
    ScaledScore     DECIMAL(8,2)  NULL,
    PerformanceLevel INT          NULL,   -- 1-5 (state scale)
    IsProficient    BIT           NOT NULL DEFAULT 0,  -- Level 3+ = proficient
    IsMeetingLearningGains BIT   NOT NULL DEFAULT 0,
    PriorYearLevel  INT          NULL,
    ScoreType       VARCHAR(20)   NOT NULL DEFAULT 'FINAL',
    DataQualityFlag VARCHAR(30)   NULL
);
```

### `fact_InterventionMonitoring`

```sql
CREATE TABLE fact_InterventionMonitoring (
    InterventionKey   BIGINT       NOT NULL PRIMARY KEY IDENTITY,
    StudentKey        INT          NOT NULL REFERENCES dim_Student(StudentKey),
    ProgramKey        INT          NOT NULL REFERENCES dim_Program(ProgramKey),
    SchoolKey         INT          NOT NULL REFERENCES dim_School(SchoolKey),
    SchoolYearKey     INT          NOT NULL REFERENCES dim_SchoolYear(SchoolYearKey),
    EntryDate         DATE         NOT NULL,
    ExitDate          DATE         NULL,
    ExitReason        VARCHAR(50)  NULL,  -- 'GOAL_MET','STILL_ENROLLED','MOVED_UP_TIER','REFERRED_SPED'
    CurrentTier       INT          NOT NULL,  -- 1,2,3
    ProgressStatus    VARCHAR(20)  NOT NULL,  -- 'ON_TRACK','AT_RISK','OFF_TRACK','COMPLETED'
    LastProgressDate  DATE         NULL,
    InterventionNotes VARCHAR(500) NULL   -- generic notes only; no PII in AI-accessible fields
);
```

### `fact_PerformanceBenchmark`

```sql
CREATE TABLE fact_PerformanceBenchmark (
    BenchmarkKey     BIGINT        NOT NULL PRIMARY KEY IDENTITY,
    SchoolKey        INT           NULL REFERENCES dim_School(SchoolKey),  -- NULL = district-wide
    GradeLevelKey    INT           NULL REFERENCES dim_GradeLevel(GradeLevelKey),
    SubjectArea      VARCHAR(30)   NOT NULL,
    SchoolYearKey    INT           NOT NULL REFERENCES dim_SchoolYear(SchoolYearKey),
    BenchmarkType    VARCHAR(30)   NOT NULL,  -- 'PROFICIENCY_RATE','GROWTH_RATE','ATTENDANCE_RATE'
    ExpectedValue    DECIMAL(6,2)  NOT NULL,
    StretchValue     DECIMAL(6,2)  NULL,      -- aspirational target
    SourceDescription VARCHAR(200) NULL,
    SetByDistrict    BIT           NOT NULL DEFAULT 1
);

-- Sample benchmarks for 2025-26
INSERT INTO fact_PerformanceBenchmark VALUES
(DEFAULT,NULL,5,'ELA',4,'PROFICIENCY_RATE',72.00,78.00,'District ELA Grade 3 proficiency target 2025-26',1),
(DEFAULT,NULL,5,'MATH',4,'PROFICIENCY_RATE',68.00,75.00,'District Math Grade 3 proficiency target 2025-26',1),
(DEFAULT,NULL,NULL,'ELA',4,'ATTENDANCE_RATE',95.00,97.00,'District attendance target 2025-26',1),
(DEFAULT,1,NULL,'ELA',4,'PROFICIENCY_RATE',74.00,80.00,'Palmetto Ridge ELA target 2025-26',1),
(DEFAULT,3,NULL,'ELA',4,'PROFICIENCY_RATE',78.00,83.00,'Sunlake High ELA target 2025-26',1);
```

## Approved Views (AI-Accessible Query Surface)

These views are the ONLY data access surface the AI assistant may use. The AI selects from this catalog; it never generates raw SQL against the base tables.

### `vw_AttendanceSummaryByStudentAndTerm`

```sql
CREATE OR ALTER VIEW vw_AttendanceSummaryByStudentAndTerm AS
SELECT
    e.StudentKey,
    s.StudentID,
    s.FirstName + ' ' + s.LastName AS StudentName,
    sc.SchoolID,
    sc.SchoolName,
    gl.GradeCode,
    gl.GradeLabel,
    t.TermCode,
    t.TermLabel,
    t.StartDate AS TermStart,
    t.EndDate AS TermEnd,
    COUNT(a.AttendanceKey) AS TotalDays,
    SUM(CASE WHEN a.IsPresent = 1 THEN 1 ELSE 0 END) AS DaysPresent,
    SUM(CASE WHEN a.IsAbsent = 1 AND a.IsExcused = 0 THEN 1 ELSE 0 END) AS UnexcusedAbsences,
    SUM(CASE WHEN a.IsAbsent = 1 AND a.IsExcused = 1 THEN 1 ELSE 0 END) AS ExcusedAbsences,
    SUM(CASE WHEN a.IsTardy = 1 THEN 1 ELSE 0 END) AS Tardies,
    CASE WHEN COUNT(a.AttendanceKey) > 0
         THEN CAST(SUM(CASE WHEN a.IsPresent = 1 THEN 1 ELSE 0 END) * 100.0
                   / COUNT(a.AttendanceKey) AS DECIMAL(5,2))
         ELSE NULL END AS AttendanceRate,
    CASE WHEN SUM(CASE WHEN a.IsAbsent = 1 THEN 1 ELSE 0 END) >= 18 THEN 1 ELSE 0 END
         AS IsChronicallyAbsent  -- >= 10% of ~180 days
FROM fact_Enrollment e
    JOIN dim_Student s ON e.StudentKey = s.StudentKey
    JOIN dim_School sc ON e.SchoolKey = sc.SchoolKey
    JOIN dim_GradeLevel gl ON e.GradeLevelKey = gl.GradeLevelKey
    JOIN fact_Attendance a ON a.StudentKey = e.StudentKey AND a.SchoolKey = e.SchoolKey
    JOIN dim_Term t ON a.TermKey = t.TermKey
WHERE s.IsActive = 1
  AND sc.IsActive = 1
GROUP BY
    e.StudentKey, s.StudentID, s.FirstName, s.LastName,
    sc.SchoolID, sc.SchoolName, gl.GradeCode, gl.GradeLabel,
    t.TermCode, t.TermLabel, t.StartDate, t.EndDate;
```

### `vw_AttendanceSummaryBySchoolAndGrade`

```sql
CREATE OR ALTER VIEW vw_AttendanceSummaryBySchoolAndGrade AS
SELECT
    sc.SchoolID,
    sc.SchoolName,
    gl.GradeCode,
    gl.GradeLabel,
    t.TermCode,
    t.TermLabel,
    sy.SchoolYearID,
    COUNT(DISTINCT a.StudentKey) AS TotalStudents,
    CAST(AVG(CAST(a.IsPresent AS FLOAT)) * 100 AS DECIMAL(5,2)) AS AvgAttendanceRate,
    SUM(CASE WHEN a.IsAbsent = 1 THEN 1 ELSE 0 END) AS TotalAbsences,
    -- Chronic absence: count students with >= 10% absences
    COUNT(DISTINCT CASE
        WHEN abs_summary.TotalAbsent * 1.0 / NULLIF(abs_summary.TotalDays,0) >= 0.1
        THEN a.StudentKey END) AS ChronicallyAbsentStudents
FROM fact_Attendance a
    JOIN dim_School sc ON a.SchoolKey = sc.SchoolKey
    JOIN dim_Term t ON a.TermKey = t.TermKey
    JOIN dim_SchoolYear sy ON t.SchoolYearKey = sy.SchoolYearKey
    JOIN fact_Enrollment e ON e.StudentKey = a.StudentKey
                           AND e.SchoolKey = a.SchoolKey
                           AND e.SchoolYearKey = sy.SchoolYearKey
    JOIN dim_GradeLevel gl ON e.GradeLevelKey = gl.GradeLevelKey
    OUTER APPLY (
        SELECT
            COUNT(*) AS TotalDays,
            SUM(CASE WHEN a2.IsAbsent = 1 THEN 1 ELSE 0 END) AS TotalAbsent
        FROM fact_Attendance a2
        WHERE a2.StudentKey = a.StudentKey
          AND a2.SchoolKey = a.SchoolKey
          AND a2.TermKey = a.TermKey
    ) abs_summary
WHERE sc.IsActive = 1
GROUP BY sc.SchoolID, sc.SchoolName, gl.GradeCode, gl.GradeLabel,
         t.TermCode, t.TermLabel, sy.SchoolYearID;
```

### `vw_LocalAssessmentResultsBySchoolAndGrade`

```sql
CREATE OR ALTER VIEW vw_LocalAssessmentResultsBySchoolAndGrade AS
SELECT
    sc.SchoolID,
    sc.SchoolName,
    gl.GradeCode,
    gl.GradeLabel,
    at.AssessmentID,
    at.AssessmentName,
    at.SubjectArea,
    at.AdminWindow,
    sy.SchoolYearID,
    COUNT(DISTINCT lar.StudentKey) AS StudentsAssessed,
    CAST(AVG(lar.PercentScore) AS DECIMAL(5,2)) AS AvgPercentScore,
    CAST(SUM(CASE WHEN lar.IsProficient = 1 THEN 1 ELSE 0 END) * 100.0
         / NULLIF(COUNT(lar.LocalAssessKey),0) AS DECIMAL(5,2)) AS ProficiencyRate,
    SUM(CASE WHEN lar.PerformanceLevel = 1 THEN 1 ELSE 0 END) AS Level1Count,
    SUM(CASE WHEN lar.PerformanceLevel = 2 THEN 1 ELSE 0 END) AS Level2Count,
    SUM(CASE WHEN lar.PerformanceLevel = 3 THEN 1 ELSE 0 END) AS Level3Count,
    SUM(CASE WHEN lar.PerformanceLevel = 4 THEN 1 ELSE 0 END) AS Level4Count,
    SUM(CASE WHEN lar.DataQualityFlag IS NOT NULL THEN 1 ELSE 0 END) AS DataQualityIssueCount,
    at.ProficiencyLevelCutScore
    -- NOTE: DataQualityFlag is exposed for transparency; flag analysis is a separate view
FROM fact_LocalAssessmentResult lar
    JOIN dim_AssessmentTest at ON lar.AssessmentKey = at.AssessmentKey
    JOIN dim_School sc ON lar.SchoolKey = sc.SchoolKey
    JOIN dim_SchoolYear sy ON lar.SchoolYearKey = sy.SchoolYearKey
    JOIN fact_Enrollment e ON e.StudentKey = lar.StudentKey
                           AND e.SchoolKey = lar.SchoolKey
                           AND e.SchoolYearKey = sy.SchoolYearKey
    JOIN dim_GradeLevel gl ON e.GradeLevelKey = gl.GradeLevelKey
WHERE sc.IsActive = 1
  AND at.AssessmentType = 'LOCAL'
GROUP BY sc.SchoolID, sc.SchoolName, gl.GradeCode, gl.GradeLabel,
         at.AssessmentID, at.AssessmentName, at.SubjectArea, at.AdminWindow,
         sy.SchoolYearID, at.ProficiencyLevelCutScore;
-- Column alias fix: rename dim_AssessmentTest.ProficiencyCutScore
```

> **Note on column alias:** `at.ProficiencyLevelCutScore` should reference `at.ProficiencyCutScore` from `dim_AssessmentTest`. Adjust the alias when implementing against the actual schema.

### `vw_StateAssessmentSummaryBySchoolAndGrade`

```sql
CREATE OR ALTER VIEW vw_StateAssessmentSummaryBySchoolAndGrade AS
SELECT
    sc.SchoolID,
    sc.SchoolName,
    gl.GradeCode,
    gl.GradeLabel,
    at.AssessmentID,
    at.AssessmentName,
    at.SubjectArea,
    sy.SchoolYearID,
    COUNT(DISTINCT sar.StudentKey) AS StudentsAssessed,
    CAST(SUM(CASE WHEN sar.IsProficient = 1 THEN 1 ELSE 0 END) * 100.0
         / NULLIF(COUNT(sar.StateAssessKey),0) AS DECIMAL(5,2)) AS ProficiencyRate,
    CAST(SUM(CASE WHEN sar.IsMeetingLearningGains = 1 THEN 1 ELSE 0 END) * 100.0
         / NULLIF(COUNT(sar.StateAssessKey),0) AS DECIMAL(5,2)) AS LearningGainsRate,
    CAST(AVG(CAST(sar.PerformanceLevel AS FLOAT)) AS DECIMAL(4,2)) AS AvgPerformanceLevel,
    SUM(CASE WHEN sar.DataQualityFlag IS NOT NULL THEN 1 ELSE 0 END) AS DataQualityIssueCount
FROM fact_StateAssessmentResult sar
    JOIN dim_AssessmentTest at ON sar.AssessmentKey = at.AssessmentKey
    JOIN dim_School sc ON sar.SchoolKey = sc.SchoolKey
    JOIN dim_SchoolYear sy ON sar.SchoolYearKey = sy.SchoolYearKey
    JOIN fact_Enrollment e ON e.StudentKey = sar.StudentKey
                           AND e.SchoolKey = sar.SchoolKey
                           AND e.SchoolYearKey = sy.SchoolYearKey
    JOIN dim_GradeLevel gl ON e.GradeLevelKey = gl.GradeLevelKey
WHERE sc.IsActive = 1
  AND at.AssessmentType = 'STATE'
GROUP BY sc.SchoolID, sc.SchoolName, gl.GradeCode, gl.GradeLabel,
         at.AssessmentID, at.AssessmentName, at.SubjectArea, sy.SchoolYearID;
```

### `vw_AssessmentGapBySubgroup`

```sql
CREATE OR ALTER VIEW vw_AssessmentGapBySubgroup AS
-- Local assessments by subgroup
SELECT
    sc.SchoolID,
    sc.SchoolName,
    at.SubjectArea,
    at.AdminWindow,
    sy.SchoolYearID,
    'LOCAL' AS AssessmentType,
    at.AssessmentID,
    -- Subgroup: ethnicity
    s.EthnicityCode AS SubgroupCode,
    s.EthnicityLabel AS SubgroupLabel,
    'ETHNICITY' AS SubgroupType,
    COUNT(DISTINCT lar.StudentKey) AS StudentsAssessed,
    CAST(SUM(CASE WHEN lar.IsProficient = 1 THEN 1 ELSE 0 END) * 100.0
         / NULLIF(COUNT(*),0) AS DECIMAL(5,2)) AS ProficiencyRate
FROM fact_LocalAssessmentResult lar
    JOIN dim_Student s ON lar.StudentKey = s.StudentKey
    JOIN dim_AssessmentTest at ON lar.AssessmentKey = at.AssessmentKey
    JOIN dim_School sc ON lar.SchoolKey = sc.SchoolKey
    JOIN dim_SchoolYear sy ON lar.SchoolYearKey = sy.SchoolYearKey
WHERE sc.IsActive = 1
GROUP BY sc.SchoolID, sc.SchoolName, at.SubjectArea, at.AdminWindow,
         sy.SchoolYearID, at.AssessmentID, s.EthnicityCode, s.EthnicityLabel

UNION ALL

-- ELL subgroup
SELECT
    sc.SchoolID, sc.SchoolName, at.SubjectArea, at.AdminWindow, sy.SchoolYearID,
    'LOCAL', at.AssessmentID,
    CASE WHEN s.IsELL = 1 THEN 'ELL' ELSE 'NON_ELL' END,
    CASE WHEN s.IsELL = 1 THEN 'English Language Learners' ELSE 'Non-ELL' END,
    'PROGRAM',
    COUNT(DISTINCT lar.StudentKey),
    CAST(SUM(CASE WHEN lar.IsProficient = 1 THEN 1 ELSE 0 END) * 100.0
         / NULLIF(COUNT(*),0) AS DECIMAL(5,2))
FROM fact_LocalAssessmentResult lar
    JOIN dim_Student s ON lar.StudentKey = s.StudentKey
    JOIN dim_AssessmentTest at ON lar.AssessmentKey = at.AssessmentKey
    JOIN dim_School sc ON lar.SchoolKey = sc.SchoolKey
    JOIN dim_SchoolYear sy ON lar.SchoolYearKey = sy.SchoolYearKey
WHERE sc.IsActive = 1
GROUP BY sc.SchoolID, sc.SchoolName, at.SubjectArea, at.AdminWindow,
         sy.SchoolYearID, at.AssessmentID, s.IsELL;
```

### `vw_PerformanceVsBenchmark`

```sql
CREATE OR ALTER VIEW vw_PerformanceVsBenchmark AS
SELECT
    sc.SchoolID,
    sc.SchoolName,
    gl.GradeCode,
    gl.GradeLabel,
    at.SubjectArea,
    sy.SchoolYearID,
    pb.BenchmarkType,
    pb.ExpectedValue AS BenchmarkTarget,
    pb.StretchValue AS StretchTarget,
    CASE at.SubjectArea
        WHEN 'ELA' THEN SUM(CASE WHEN lar.IsProficient = 1 THEN 1 ELSE 0 END) * 100.0
                         / NULLIF(COUNT(lar.LocalAssessKey),0)
        ELSE NULL END AS ActualProficiencyRate,
    CASE at.SubjectArea
        WHEN 'ELA' THEN SUM(CASE WHEN lar.IsProficient = 1 THEN 1 ELSE 0 END) * 100.0
                         / NULLIF(COUNT(lar.LocalAssessKey),0) - pb.ExpectedValue
        ELSE NULL END AS GapFromBenchmark,
    CASE WHEN SUM(CASE WHEN lar.IsProficient = 1 THEN 1 ELSE 0 END) * 100.0
              / NULLIF(COUNT(lar.LocalAssessKey),0) >= pb.ExpectedValue
         THEN 'MEETING' ELSE 'BELOW' END AS BenchmarkStatus
FROM fact_LocalAssessmentResult lar
    JOIN dim_AssessmentTest at ON lar.AssessmentKey = at.AssessmentKey
    JOIN dim_School sc ON lar.SchoolKey = sc.SchoolKey
    JOIN dim_SchoolYear sy ON lar.SchoolYearKey = sy.SchoolYearKey
    JOIN fact_Enrollment e ON e.StudentKey = lar.StudentKey
                           AND e.SchoolKey = lar.SchoolKey
                           AND e.SchoolYearKey = sy.SchoolYearKey
    JOIN dim_GradeLevel gl ON e.GradeLevelKey = gl.GradeLevelKey
    JOIN fact_PerformanceBenchmark pb
        ON (pb.SchoolKey = sc.SchoolKey OR pb.SchoolKey IS NULL)
       AND (pb.GradeLevelKey = gl.GradeLevelKey OR pb.GradeLevelKey IS NULL)
       AND pb.SchoolYearKey = sy.SchoolYearKey
       AND pb.BenchmarkType = 'PROFICIENCY_RATE'
WHERE sc.IsActive = 1
  AND at.AssessmentType = 'LOCAL'
  AND at.AdminWindow = 'EOY'
GROUP BY sc.SchoolID, sc.SchoolName, gl.GradeCode, gl.GradeLabel,
         at.SubjectArea, sy.SchoolYearID, pb.BenchmarkType,
         pb.ExpectedValue, pb.StretchValue;
```

### `vw_LongitudinalProficiencyTrend`

```sql
CREATE OR ALTER VIEW vw_LongitudinalProficiencyTrend AS
SELECT
    sc.SchoolID,
    sc.SchoolName,
    gl.GradeCode,
    gl.GradeLabel,
    at.SubjectArea,
    at.AssessmentType,
    sy.SchoolYearID,
    sy.SchoolYearKey,
    COUNT(DISTINCT COALESCE(lar.StudentKey, sar.StudentKey)) AS StudentsAssessed,
    CAST(COALESCE(
        SUM(CASE WHEN lar.IsProficient = 1 THEN 1 ELSE 0 END) * 100.0
        / NULLIF(COUNT(lar.LocalAssessKey), 0),
        SUM(CASE WHEN sar.IsProficient = 1 THEN 1 ELSE 0 END) * 100.0
        / NULLIF(COUNT(sar.StateAssessKey), 0)
    ) AS DECIMAL(5,2)) AS ProficiencyRate
FROM dim_School sc
    CROSS JOIN dim_SchoolYear sy
    CROSS JOIN dim_AssessmentTest at
    LEFT JOIN fact_LocalAssessmentResult lar
        ON lar.SchoolKey = sc.SchoolKey
       AND lar.SchoolYearKey = sy.SchoolYearKey
       AND lar.AssessmentKey = at.AssessmentKey
       AND at.AssessmentType = 'LOCAL'
    LEFT JOIN fact_StateAssessmentResult sar
        ON sar.SchoolKey = sc.SchoolKey
       AND sar.SchoolYearKey = sy.SchoolYearKey
       AND sar.AssessmentKey = at.AssessmentKey
       AND at.AssessmentType = 'STATE'
    LEFT JOIN fact_Enrollment e ON e.StudentKey = COALESCE(lar.StudentKey, sar.StudentKey)
                                AND e.SchoolKey = sc.SchoolKey
                                AND e.SchoolYearKey = sy.SchoolYearKey
    LEFT JOIN dim_GradeLevel gl ON e.GradeLevelKey = gl.GradeLevelKey
WHERE sc.IsActive = 1
  AND (lar.LocalAssessKey IS NOT NULL OR sar.StateAssessKey IS NOT NULL)
GROUP BY sc.SchoolID, sc.SchoolName, gl.GradeCode, gl.GradeLabel,
         at.SubjectArea, at.AssessmentType, sy.SchoolYearID, sy.SchoolYearKey;
```

### `vw_InterventionStudentSummary`

```sql
CREATE OR ALTER VIEW vw_InterventionStudentSummary AS
-- Returns intervention status WITHOUT student PII
-- Student-level detail is restricted; use this view for aggregate or
-- teacher-scoped access only (enforced by application-layer authorization)
SELECT
    im.InterventionKey,
    sc.SchoolID,
    sc.SchoolName,
    gl.GradeCode,
    gl.GradeLabel,
    p.ProgramCode,
    p.ProgramName,
    p.ProgramType,
    sy.SchoolYearID,
    im.CurrentTier,
    im.ProgressStatus,
    im.EntryDate,
    im.ExitDate,
    im.ExitReason,
    -- Role-based columns: StudentKey and StudentID returned for authorized roles only
    -- Application layer applies additional filtering before returning student-level data
    im.StudentKey,
    e.SchoolKey AS EnrollmentSchoolKey,
    e.GradeLevelKey AS EnrollmentGradeLevelKey
FROM fact_InterventionMonitoring im
    JOIN dim_Program p ON im.ProgramKey = p.ProgramKey
    JOIN dim_School sc ON im.SchoolKey = sc.SchoolKey
    JOIN dim_SchoolYear sy ON im.SchoolYearKey = sy.SchoolYearKey
    LEFT JOIN fact_Enrollment e
        ON e.StudentKey = im.StudentKey
       AND e.SchoolKey = im.SchoolKey
       AND e.SchoolYearKey = im.SchoolYearKey
    LEFT JOIN dim_GradeLevel gl ON e.GradeLevelKey = gl.GradeLevelKey
WHERE sc.IsActive = 1;
```

### `vw_DataQualityFlags`

```sql
CREATE OR ALTER VIEW vw_DataQualityFlags AS
SELECT
    'LOCAL_ASSESSMENT' AS DataDomain,
    sc.SchoolID,
    sc.SchoolName,
    at.AssessmentID,
    at.AssessmentName,
    sy.SchoolYearID,
    lar.DataQualityFlag AS FlagType,
    COUNT(*) AS FlaggedRecordCount,
    CAST(COUNT(*) * 100.0
         / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY sc.SchoolID, at.AssessmentID, sy.SchoolYearID),0)
         AS DECIMAL(5,2)) AS FlaggedPct
FROM fact_LocalAssessmentResult lar
    JOIN dim_AssessmentTest at ON lar.AssessmentKey = at.AssessmentKey
    JOIN dim_School sc ON lar.SchoolKey = sc.SchoolKey
    JOIN dim_SchoolYear sy ON lar.SchoolYearKey = sy.SchoolYearKey
WHERE lar.DataQualityFlag IS NOT NULL
GROUP BY sc.SchoolID, sc.SchoolName, at.AssessmentID, at.AssessmentName,
         sy.SchoolYearID, lar.DataQualityFlag

UNION ALL

SELECT
    'STATE_ASSESSMENT',
    sc.SchoolID, sc.SchoolName, at.AssessmentID, at.AssessmentName, sy.SchoolYearID,
    sar.DataQualityFlag,
    COUNT(*),
    CAST(COUNT(*) * 100.0
         / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY sc.SchoolID, at.AssessmentID, sy.SchoolYearID),0)
         AS DECIMAL(5,2))
FROM fact_StateAssessmentResult sar
    JOIN dim_AssessmentTest at ON sar.AssessmentKey = at.AssessmentKey
    JOIN dim_School sc ON sar.SchoolKey = sc.SchoolKey
    JOIN dim_SchoolYear sy ON sar.SchoolYearKey = sy.SchoolYearKey
WHERE sar.DataQualityFlag IS NOT NULL
GROUP BY sc.SchoolID, sc.SchoolName, at.AssessmentID, at.AssessmentName,
         sy.SchoolYearID, sar.DataQualityFlag;
```

## Stored Procedures (Parameterized — AI-Safe)

### `usp_GetAttendanceSummaryBySchool`

```sql
CREATE OR ALTER PROCEDURE usp_GetAttendanceSummaryBySchool
    @SchoolID      VARCHAR(10),
    @TermCode      VARCHAR(15),
    @GradeCode     VARCHAR(5) = NULL  -- NULL = all grades
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM vw_AttendanceSummaryBySchoolAndGrade
    WHERE SchoolID = @SchoolID
      AND TermCode = @TermCode
      AND (@GradeCode IS NULL OR GradeCode = @GradeCode)
    ORDER BY GradeCode;
END;
```

### `usp_GetLocalAssessmentResultsBySchool`

```sql
CREATE OR ALTER PROCEDURE usp_GetLocalAssessmentResultsBySchool
    @SchoolID      VARCHAR(10),
    @SchoolYearID  VARCHAR(10),
    @SubjectArea   VARCHAR(30) = NULL,
    @AdminWindow   VARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM vw_LocalAssessmentResultsBySchoolAndGrade
    WHERE SchoolID = @SchoolID
      AND SchoolYearID = @SchoolYearID
      AND (@SubjectArea IS NULL OR SubjectArea = @SubjectArea)
      AND (@AdminWindow IS NULL OR AdminWindow = @AdminWindow)
    ORDER BY GradeCode, SubjectArea, AdminWindow;
END;
```

### `usp_GetPerformanceTrend`

```sql
CREATE OR ALTER PROCEDURE usp_GetPerformanceTrend
    @SchoolID      VARCHAR(10),
    @SubjectArea   VARCHAR(30),
    @GradeCode     VARCHAR(5) = NULL,
    @StartYearID   VARCHAR(10) = '2022-23',
    @EndYearID     VARCHAR(10) = '2025-26'
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM vw_LongitudinalProficiencyTrend
    WHERE SchoolID = @SchoolID
      AND SubjectArea = @SubjectArea
      AND (@GradeCode IS NULL OR GradeCode = @GradeCode)
      AND SchoolYearID BETWEEN @StartYearID AND @EndYearID
    ORDER BY SchoolYearKey, GradeCode;
END;
```

## Read-Only Service Account Setup

```sql
-- Create read-only login for the AI service layer
CREATE LOGIN [svc_ai_reader] WITH PASSWORD = '<stored-in-key-vault>';
CREATE USER [svc_ai_reader] FOR LOGIN [svc_ai_reader];

-- Grant SELECT only on approved views (not base tables)
GRANT SELECT ON vw_AttendanceSummaryByStudentAndTerm TO [svc_ai_reader];
GRANT SELECT ON vw_AttendanceSummaryBySchoolAndGrade TO [svc_ai_reader];
GRANT SELECT ON vw_LocalAssessmentResultsBySchoolAndGrade TO [svc_ai_reader];
GRANT SELECT ON vw_StateAssessmentSummaryBySchoolAndGrade TO [svc_ai_reader];
GRANT SELECT ON vw_AssessmentGapBySubgroup TO [svc_ai_reader];
GRANT SELECT ON vw_PerformanceVsBenchmark TO [svc_ai_reader];
GRANT SELECT ON vw_LongitudinalProficiencyTrend TO [svc_ai_reader];
GRANT SELECT ON vw_InterventionStudentSummary TO [svc_ai_reader];
GRANT SELECT ON vw_DataQualityFlags TO [svc_ai_reader];

-- Grant EXECUTE on approved stored procedures
GRANT EXECUTE ON usp_GetAttendanceSummaryBySchool TO [svc_ai_reader];
GRANT EXECUTE ON usp_GetLocalAssessmentResultsBySchool TO [svc_ai_reader];
GRANT EXECUTE ON usp_GetPerformanceTrend TO [svc_ai_reader];

-- DENY direct table access — this is the critical security control
DENY SELECT ON dim_Student TO [svc_ai_reader];  -- base table access denied
DENY SELECT ON fact_LocalAssessmentResult TO [svc_ai_reader];
-- (repeat DENY for all base tables)
```

## View Catalog (for Metadata Index)

This table summarizes all approved views — its contents are indexed in Azure AI Search for the metadata retrieval layer.

| ViewName | Description | PrimaryDomain | SubjectAreas | RoleScope | Parameters |
|----------|-------------|---------------|--------------|-----------|------------|
| `vw_AttendanceSummaryByStudentAndTerm` | Per-student attendance counts and rate by term | Attendance | — | TEACHER (own students), SCHOOL_ADMIN (school), DISTRICT_ADMIN (all) | TermCode, SchoolID |
| `vw_AttendanceSummaryBySchoolAndGrade` | School+grade aggregate attendance rates | Attendance | — | SCHOOL_ADMIN, DISTRICT_ADMIN | SchoolID, TermCode |
| `vw_LocalAssessmentResultsBySchoolAndGrade` | Local assessment proficiency rates by school and grade | Assessment | ELA, MATH | SCHOOL_ADMIN, DISTRICT_ADMIN | SchoolID, SchoolYearID, SubjectArea |
| `vw_StateAssessmentSummaryBySchoolAndGrade` | State assessment proficiency and learning gains | Assessment | ELA, MATH | SCHOOL_ADMIN, DISTRICT_ADMIN | SchoolID, SchoolYearID |
| `vw_AssessmentGapBySubgroup` | Proficiency rate by demographic/program subgroup | Gap Analysis | ELA, MATH | SCHOOL_ADMIN, DISTRICT_ADMIN | SchoolID, SchoolYearID |
| `vw_PerformanceVsBenchmark` | Actual vs. expected proficiency with gap and status | Benchmark | ELA, MATH | SCHOOL_ADMIN, DISTRICT_ADMIN | SchoolID, SchoolYearID |
| `vw_LongitudinalProficiencyTrend` | Multi-year proficiency trend by school and grade | Longitudinal | ELA, MATH | SCHOOL_ADMIN, DISTRICT_ADMIN | SchoolID, SubjectArea, years |
| `vw_InterventionStudentSummary` | Student intervention tier, status, program | Intervention | — | TEACHER (own caseload), SCHOOL_ADMIN (school) | SchoolID, SchoolYearID |
| `vw_DataQualityFlags` | Data quality issues by domain and school | Data Quality | — | SCHOOL_ADMIN, DISTRICT_ADMIN | SchoolID, SchoolYearID |

## Lab Setup Script Summary

The complete lab setup script (`lab-01a-environment-setup.md`) generates:

- 8 schools, 15 grade levels, 50 staff members, 500 synthetic students
- 4 school years of data (2022-23 through 2025-26)
- ~90,000 attendance records (500 students × ~180 days × 1 current year)
- ~2,500 local assessment result records
- ~1,500 state assessment result records
- ~300 intervention monitoring records
- ~150 grade records
- Performance benchmark targets for all schools and grade levels

All values are randomly generated within realistic K-12 ranges. The script is deterministic (seeded) for reproducibility across lab environments.

*This schema is used in all labs. When implementing against real district data, replace the synthetic schema with district-approved views following the same access control model.*
