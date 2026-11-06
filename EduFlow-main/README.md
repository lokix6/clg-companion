# EduFlow – College Companion

> **EduFlow** (also called **College Companion** / *CollegeCompanion*) is a smart campus platform that brings students, faculty, and administrators together in one role-based web application for managing academic life.

**Live app:** https://eduflowc.lovable.app

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Project Objectives](#3-project-objectives)
4. [Key Features](#4-key-features)
5. [User Roles](#5-user-roles)
6. [Technology Stack](#6-technology-stack)
7. [System Architecture](#7-system-architecture)
8. [Database Overview](#8-database-overview)
9. [Security and Row Level Security (RLS)](#9-security-and-row-level-security-rls)
10. [Application Workflow](#10-application-workflow)
11. [Project Structure](#11-project-structure)
12. [Installation and Local Development](#12-installation-and-local-development)
13. [Environment Variables](#13-environment-variables)
14. [Running the Application](#14-running-the-application)
15. [Deployment](#15-deployment)
16. [Screenshots](#16-screenshots)
17. [Future Enhancements](#17-future-enhancements)
18. [Testing and Validation](#18-testing-and-validation)
19. [Project Status](#19-project-status)
20. [Contributors / Author](#20-contributors--author)

---

## 1. Project Overview

EduFlow – College Companion is a full-stack web application built for colleges. It provides three separate portals — **Student**, **Faculty**, and **Admin** — each with its own dashboard, navigation, and permissions. The platform covers day-to-day academic activities such as attendance, assignments, quizzes, marks, timetables, notes, announcements, events, and reports, and adds AI-powered study tools such as a study assistant, notes summarizer, quiz generator, and study planner.

It supports both **light and dark themes** and works on desktop and mobile screens.

## 2. Problem Statement

Students and faculty typically juggle many disconnected tools — messaging groups for announcements, spreadsheets for attendance and marks, paper timetables, and separate apps for notes and study planning. This leads to:

- Missed deadlines and announcements
- No single, reliable view of attendance or academic performance
- Manual, repetitive work for faculty (attendance, grading, quiz preparation)
- Limited visibility for administrators across departments

## 3. Project Objectives

- Provide **one unified platform** for students, faculty, and administrators.
- Enforce **strict role-based access** so each user sees only what they are allowed to see.
- Digitize **attendance, assignments, quizzes, and marks** end-to-end.
- Offer **AI-powered study support** to help students learn more effectively.
- Give administrators **reports and analytics** exportable as PDF, Excel, and CSV.
- Deliver a **clean, modern, responsive** user experience.

## 4. Key Features

### Student Portal
- Personalized dashboard with attendance, assignments, classes, and events at a glance
- Subjects, timetable, schedule, and academic calendar
- Attendance tracking and attendance history with trend charts
- Assignments with file submission and resubmission
- Quizzes (Available / Upcoming / Completed) with timer and results
- Results / marks view
- Notes, reminders, announcements, events, and notifications
- AI Study Assistant, Notes Summarizer, and Study Planner
- Daily Aptitude & Reasoning Practice (difficulty levels, 20-minute timed sets, streaks and progress)
- Personal reports, profile (with avatar upload), settings, and password change

### Faculty Portal
- Faculty dashboard and list of assigned subjects and students
- Mark attendance for classes
- Create, manage, and grade assignments; review submissions
- Enter marks for assessments
- AI Quiz Generator and **"Assign the Quiz Manually"** option for self-written questions
- Assign quizzes to subject / department / semester / section with timing and attempt limits
- Review subjective quiz answers
- Notes, announcements, events, timetable, calendar, and reports
- AI assistant, profile, and settings

### Admin Portal
- Admin dashboard with statistics and activity timeline
- Manage departments, subjects, students, and faculty
- Bulk student import
- Faculty invitations via single-use, expiring invite links
- Promote faculty to admin (role management)
- Timetable, attendance, assignments, quizzes, results, calendar
- Announcements, events, notifications
- Analytics, activity log, reports, and settings

### Authentication and Role-Based Access
- Email/password sign-in, sign-up, forgot and reset password
- Students self-register; **faculty join only by admin invite**; **admins are promoted** by existing admins
- Portal-level route guards redirect users to the correct portal for their role
- Roles stored in a dedicated `user_roles` table

### Attendance Management
- Faculty mark attendance per subject/date
- Students see subject-wise percentages, history, timeline, and trend charts
- Admin attendance reports across departments

### Assignments
- Faculty create assignments targeted to a cohort, with attachments and due dates
- Students submit and resubmit files through a secure server-side function
- Faculty grade, return, and give feedback; reminders help students track deadlines

### Quizzes
- AI-generated or manually created quizzes (MCQ, True/False, short and long answer)
- Draft, preview, edit, delete, and assign workflow
- Faculty-configurable timer with a visible countdown and auto-submit
- Automatic grading for MCQ/True-False; faculty review for subjective answers
- Answer keys are never exposed to students

### Marks / Academic Performance
- Faculty record marks for assessments
- Students view their results
- Performance included in reports and analytics

### Timetable
- Time slots, classrooms, and weekly timetables
- Separate timetable views for students, faculty, and admin
- Calendar views for classes and academic events

### Study Planner / Notes
- Notes upload, organization, and preview
- AI Study Planner based on topic, goals, title, and weekly hours
- Plan history with open, rename, duplicate, delete, favorite, and auto-save

### Announcements and Notifications
- Announcements targeted by role/department
- Events with role-based permissions and delegated event editors
- In-app notification bell and notifications page

### AI-powered Features
All AI calls run on the server — no AI keys are ever exposed to the browser.
- **AI Study Assistant** — chat with history, Markdown/code formatting, and file uploads (PDF, DOCX, TXT, PPTX, XLSX, CSV, images)
- **Voice mode** — speak questions and hear answers read aloud
- **Notes Summarizer** — summarize text, Word, and PDF documents
- **Quiz Generator** — generate quizzes by topic and question count
- **Study Planner** — generate structured study plans
- **Smart Assignment Help**

### Contact Form
- Public contact page that stores messages in the database
- Email notification to the site owner on each new message
- Success and error feedback for visitors

### Reports and Export
- Attendance, marks, assignments, quizzes, and more for each role
- KPIs and charts (trends, distribution, completion)
- Export to **PDF, Excel, and CSV** with EduFlow branding
- Report history with re-download and delete

## 5. User Roles

| Role | How the account is created | Main capabilities |
|---|---|---|
| **Student** | Self sign-up with email | Track attendance, submit assignments, attempt quizzes, view results, use AI tools |
| **Faculty** | Accepts an admin-issued invite link | Mark attendance, manage assignments, create/assign quizzes, enter marks, post announcements |
| **Admin** | Promoted from faculty by another admin | Manage departments, users, subjects, timetables, invites, analytics, and reports |

## 6. Technology Stack

| Layer | Technology |
|---|---|
| Framework | **React 19** with **TanStack Start** (file-based routing, SSR, server functions) |
| Language | **TypeScript** |
| Build tool | **Vite** |
| Styling | **Tailwind CSS v4**, shadcn/ui components, Lucide icons |
| Backend | **Supabase** (via Lovable Cloud) |
| Database | **PostgreSQL** with Row Level Security |
| Authentication | Supabase Auth (email/password) |
| File storage | Supabase Storage (assignments, notes, avatars) |
| AI | Lovable AI Gateway (Google Gemini 2.5 Flash), called from server functions |
| Data fetching | TanStack Query |
| Charts | Recharts |
| Exports | jsPDF (PDF), SheetJS `xlsx` (Excel/CSV) |
| Document parsing | mammoth (DOCX), JSZip (PPTX/XLSX) |
| Email | React Email templates for auth and contact notifications |

## 7. System Architecture

```text
+-------------------------------------------------------------+
|                        Browser (React)                       |
|  Student Portal  |  Faculty Portal  |  Admin Portal  | Public |
+-----------------------------+-------------------------------+
                              |
          Supabase JS client  |  TanStack server functions
          (RLS enforced)      |  (AI, voice, email, imports)
                              v
+-------------------------------------------------------------+
|           TanStack Start server (edge runtime)               |
|  - Auth middleware verifies the user's session               |
|  - Calls AI gateway / email service with server-side secrets |
+-----------------------------+-------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                 Supabase (Lovable Cloud)                     |
|  PostgreSQL + RLS | Auth | Storage | SQL functions (RPC)     |
+-------------------------------------------------------------+
```

- The browser talks to the database directly for ordinary reads/writes; **RLS policies** decide what each user can access.
- Sensitive work (AI calls, voice, emails, bulk imports, computed quiz scores) runs in **server functions**, never in the browser.

## 8. Database Overview

Main tables in the `public` schema:

| Area | Tables |
|---|---|
| Users & roles | `profiles`, `user_roles`, `faculty_invites` |
| Academic structure | `departments`, `sections`, `subjects`, `classrooms`, `time_slots`, `timetable`, `timetable_slots`, `academic_calendar` |
| Attendance | `attendance`, `attendance_history` |
| Assignments | `assignments`, `assignment_submissions`, `assignment_reminders` |
| Assessments & marks | `assessments`, `marks` |
| Quizzes | `ai_quizzes`, `quiz_assignments`, `quiz_attempts` |
| Communication | `announcements`, `events`, `event_editors`, `notifications`, `contact_messages` |
| Notes & study | `notes`, `note_summaries`, `study_plans`, `aptitude_attempts` |
| AI | `ai_conversations`, `ai_messages`, `ai_uploaded_files` |
| Admin & reports | `activity_log`, `report_history` |

The database also contains **SQL functions** (for example `has_role`, `student_submit_assignment`, `faculty_save_marks`, `faculty_grade_submission`, `admin_grant_role`, `get_invite_by_code`) that perform role-checked operations safely on the server.

## 9. Security and Row Level Security (RLS)

- **RLS is enabled on every table.** Policies restrict rows to their owner, their cohort, or users with the right role.
- **Roles live in a separate `user_roles` table** and are checked with the `has_role` security-definer function to prevent privilege escalation.
- **Faculty access is scoped** to their own subjects, students, and attendance records.
- **Quiz answer keys are hidden** from students; scores are computed on the server, and database triggers block self-grading or self-reported scores.
- **Invite codes** are generated with cryptographically secure randomness, are single-use, and expire.
- **Secrets stay on the server** — AI and email credentials are read only inside server functions.
- Protected server functions require a valid authenticated session.

## 10. Application Workflow

```text
Visitor -> Landing page -> Sign up (Student)  -> Student Portal
                        -> Invite link (Faculty) -> Faculty Portal
                        -> Login -> role check -> correct portal

Faculty creates assignment/quiz -> Students notified -> Students submit/attempt
   -> Auto-grading (objective) / Faculty review (subjective) -> Results -> Reports
```

1. A student signs up; a faculty member joins using an admin invite link.
2. On login, the app checks the user's role and routes them to their portal.
3. Admins set up departments, subjects, sections, and timetables.
4. Faculty mark attendance, create assignments and quizzes, and enter marks.
5. Students view schedules, submit work, attempt quizzes, and use AI tools.
6. Everyone can generate and export reports within their permissions.

## 11. Project Structure

```text
.
├── public/                     # Static files (favicon, robots.txt)
├── src/
│   ├── routes/                 # File-based routes (pages)
│   │   ├── __root.tsx          # App shell
│   │   ├── index.tsx           # Landing page
│   │   ├── login.tsx, signup.tsx, join.$code.tsx, contact.tsx, ...
│   │   ├── _authenticated/dashboard/   # Student portal
│   │   ├── faculty.*.tsx       # Faculty portal
│   │   └── admin.*.tsx         # Admin portal
│   ├── components/             # Shared UI (layout, dashboard, brand, theme, ui)
│   ├── features/               # Feature modules (attendance, assignments, quiz,
│   │                           #   ai, reports, admin, faculty, notes, ...)
│   ├── lib/                    # Server functions, auth, AI helpers, email templates
│   ├── integrations/supabase/  # Generated backend client and types
│   └── styles.css              # Tailwind v4 theme and design tokens
├── supabase/                   # Backend config and migrations
├── package.json
└── vite.config.ts
```

## 12. Installation and Local Development

**Prerequisites:** Node.js 20+ and [Bun](https://bun.sh) (or npm).

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/eduflow.git
cd eduflow

# 2. Install dependencies
bun install        # or: npm install

# 3. Create a .env file (see next section)
```

## 13. Environment Variables

Create a `.env` file in the project root. Use **only public (publishable) keys** here — never commit service-role keys or passwords.

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
VITE_SUPABASE_PROJECT_ID=<your-project-id>

SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
SUPABASE_PROJECT_ID=<your-project-id>
```

Server-only secrets (for example the AI gateway key and email service settings) are managed in the hosting environment and are **not** stored in the repository.

## 14. Running the Application

```bash
bun run dev        # start the development server (http://localhost:8080)
bun run build      # create a production build
bun run preview    # preview the production build locally
```

## 15. Deployment

The app is built and hosted with **Lovable**, with the backend on **Lovable Cloud**.

- Published at: https://eduflowc.lovable.app
- Changes are published from the Lovable editor with **Publish**.
- Because it uses standard open-source tools (React, Vite, TanStack Start), the code can also be deployed to other edge/serverless hosts that support TanStack Start.

## 16. Screenshots

> Replace the placeholders below with real screenshots (for example in a `docs/screenshots/` folder).

| Screen | Preview |
|---|---|
| Landing page | ![Landing page](docs/screenshots/landing.png) |
| Login (light / dark) | ![Login](docs/screenshots/login.png) |
| Student dashboard | ![Student dashboard](docs/screenshots/student-dashboard.png) |
| Faculty dashboard | ![Faculty dashboard](docs/screenshots/faculty-dashboard.png) |
| Admin dashboard | ![Admin dashboard](docs/screenshots/admin-dashboard.png) |
| AI Study Assistant | ![AI Assistant](docs/screenshots/ai-assistant.png) |
| Quiz attempt with timer | ![Quiz](docs/screenshots/quiz.png) |
| Reports & export | ![Reports](docs/screenshots/reports.png) |

## 17. Future Enhancements

- Automatic email delivery of faculty invites
- Bulk CSV faculty invites
- Native mobile app
- Parent / guardian portal
- Plagiarism checks for assignment submissions
- Deeper learning analytics and personalized recommendations

## 18. Testing and Validation

- **TypeScript type-checking** and **production builds** are run after every change.
- **Browser-based checks (Playwright)** were used to verify key flows such as assignment creation, display, and deletion, and the login page in light and dark themes.
- **Security scans** were run and the reported findings (RLS scoping, answer-key leaks, self-grading, weak invite randomness, etc.) were fixed.
- Manual testing of each portal with Student, Faculty, and Admin accounts.

## 19. Project Status

**Active / Feature-complete MVP.** All three portals, core academic modules, AI tools, reports, and security hardening are implemented and deployed.

## 20. Contributors / Author

| Name | Role |
|---|---|
| **Uma Nagesh** | Developer & project owner |

📧 umanagesh25@gmail.com

---

*EduFlow – College Companion: one platform for every student need.*
