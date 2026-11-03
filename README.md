# ResumeHub — Career Intelligence Platform

ResumeHub is a full-stack career intelligence platform for students. It combines resume building, ATS screening, job discovery, personalized resume-to-job analysis, skill-gap identification, and placement-readiness tracking in one application.

The project is built as an academic mini project under **REVA University**.

## What the application provides

### Student experience

- Resume builder with live preview and PDF export
- PDF, DOCX, and text resume upload
- One-time resume storage per authenticated student
- Resume text extraction with `pdfjs-dist` and `mammoth`
- ATS resume screening against pasted job descriptions
- Opportunity library with 150 individual job postings
- Exact job lookup using unique identifiers such as `JD001`
- Personalized resume-to-job analysis
- Required and preferred skill comparison
- Matched, partially demonstrated, and missing skill classifications
- ATS score and keyword coverage
- Skill-match score using required/preferred weighting
- Education and branch eligibility signals
- Resume improvement suggestions
- Curated learning resources and project recommendations
- Student dashboard with profile completion and analysis history

### Opportunity library

The included dataset is [Data/job_postings_dataset.json](./Data/job_postings_dataset.json).

- 150 postings
- 25 companies
- 6 role families
- Every posting remains an individual record
- Duplicate job titles are not merged
- `job_id` is the unique posting identifier
- Synthetic records are labeled as representative data

### Authentication

- Email/password registration
- Email/password login
- Session-based authentication
- Development Demo Mode
- User-owned resume and analysis access
- No Google OAuth dependency

## Analysis workflow

The main workflow is:

```text
Register or sign in
        ↓
Upload a resume once
        ↓
Open the Opportunity Library
        ↓
Select a specific job, for example JD001
        ↓
Choose Analyze My Resume
        ↓
ResumeHub loads the student's saved resume and profile
        ↓
ResumeHub compares the resume against that exact job
        ↓
Personalized ATS, skill-gap, eligibility, and learning report
```

Details and analysis are intentionally separate:

```text
/jobs/JD001              Job details
/jobs/JD001/analyze      Personalized analysis for JD001
```

The analysis does not use the job title as an identifier and does not merge postings from different companies.

## Score definitions

ResumeHub keeps the following metrics separate:

| Metric | Meaning |
|---|---|
| ATS score | How closely the saved resume matches the selected job's language and keywords |
| Keyword coverage | Percentage of selected job keywords found in the resume text |
| Skill match | Demonstrated required and preferred skills, with partial evidence receiving partial credit |
| Profile completion | How many student profile sections have been completed |

The skill-match weighting is:

- Required skills: 80%
- Preferred skills: 20%
- Resume-only keyword mentions are classified as partial evidence unless supported by profile data

## Main routes

| Route | Purpose |
|---|---|
| `/` | Career intelligence landing page |
| `/login` | Email/password login, registration, and Demo Mode |
| `/student` | Student dashboard |
| `/resume` | Upload and replace the saved resume |
| `/builder` | Resume builder |
| `/screener` | ATS screener for pasted/uploaded content |
| `/jobs` | Opportunity library |
| `/jobs/:jobId` | Individual job details |
| `/jobs/:jobId/analyze` | Personalized analysis for the selected job |

## API overview

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/auth/me` | Read current session state |
| `GET` | `/api/auth/config` | Read enabled local/demo authentication options |
| `POST` | `/api/auth/register` | Register a student |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | End the current session |
| `POST` | `/api/auth/dev-login` | Development-only Demo Mode |

### Jobs and analysis

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/jobs` | List and search job postings |
| `GET` | `/api/jobs/:jobId` | Read one exact job posting |
| `GET` | `/api/jobs/:jobId/analyze` | Generate and save a personalized report |
| `GET` | `/api/platform/stats` | Read platform-level job statistics |

### Student data

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/student/profile` | Read the current student's profile |
| `PUT` | `/api/student/profile` | Save the current student's profile |
| `GET` | `/api/student/resume` | Read the current student's latest resume |
| `GET` | `/api/student/analytics` | Read dashboard metrics and recent analyses |
| `GET` | `/api/student/analyses` | Read the current student's analysis history |
| `GET` | `/api/student/analyses/:id` | Read one owned analysis report |
| `POST` | `/api/resumes` | Save an uploaded/extracted resume |
| `GET` | `/api/resumes` | List the current student's resumes |
| `PUT` | `/api/resumes/:id` | Update an owned resume |
| `DELETE` | `/api/resumes/:id` | Delete an owned resume |

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Wouter |
| Styling | Tailwind CSS v4, Radix UI, Framer Motion |
| Backend | Node.js, Express 5, TypeScript |
| Authentication | Passport session middleware, local authentication |
| Resume parsing | `pdfjs-dist`, `mammoth` |
| Resume export | `html2canvas`, `jspdf` |
| Data validation | Zod, Drizzle Zod |
| Database schema | Drizzle ORM and PostgreSQL definitions |
| Runtime development storage | In-memory storage |

## Project structure

```text
.
├── Data/
│   └── job_postings_dataset.json
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── pages/
│           ├── builder/
│           ├── job-detail.tsx
│           ├── jobs.tsx
│           ├── login.tsx
│           ├── resume.tsx
│           ├── screener/
│           └── student.tsx
├── server/
│   ├── index.ts
│   ├── routes.ts
│   ├── static.ts
│   ├── storage.ts
│   └── vite.ts
├── shared/
│   └── schema.ts
├── script/
│   └── build.ts
├── package.json
└── README.md
```

## Local setup

### Requirements

- Node.js 20 or newer
- npm

### Install dependencies

```bash
npm install
```

### Optional environment variables

Create a `.env` file when needed:

```env
DATABASE_URL=
SESSION_SECRET=replace-with-a-long-random-value
```

`SESSION_SECRET` should be set for deployments. Development has a fallback value so the project can run locally without additional setup.

### Start development server

```bash
npm run dev
```

Open:

```text
http://localhost:5030
```

The development server automatically probes nearby ports if the default port is busy.

## Available scripts

```bash
npm run dev       # Start the Express/Vite development server
npm run check     # Run TypeScript validation
npm run build     # Build the client and production server bundle
npm run start     # Start the production bundle
npm run db:push   # Push the Drizzle schema to PostgreSQL
```

## Database note

The repository includes Drizzle/PostgreSQL schema definitions for users, resumes, job postings, job skills, student profiles, and analysis reports.

The current development storage implementation is `MemStorage` in [server/storage.ts](./server/storage.ts). This makes the application runnable without a provisioned database, but data is reset when the development process restarts. A production deployment should connect the schema to a persistent PostgreSQL storage implementation before relying on long-term student data.

## Security behavior

- Protected student endpoints require an authenticated session.
- Resume and analysis queries are scoped to the authenticated user ID.
- Students cannot request another student's resume or analysis report.
- Job postings are addressed by exact `job_id`.
- Passwords are hashed with Node.js `scrypt`.
- Session cookies are HTTP-only.
- Role checks are enforced server-side for officer-only endpoints.
- Secrets belong in environment variables and should never be committed.

## Validation

Before submitting changes, run:

```bash
npm run check
npm run build
git diff --check
```

## Current limitations and next steps

- Replace `MemStorage` with persistent PostgreSQL repositories for production.
- Add the full placement officer JSON import and validation UI.
- Add persistent learning activity tracking.
- Add complete section-by-section profile editing.
- Add automated end-to-end browser tests for Student A/Student B data isolation.
- Add production deployment configuration and migrations.
