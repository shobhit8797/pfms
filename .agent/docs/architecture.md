# Architecture Documentation

## Overview

This project is a Personal Finance Management System (PFMS) built as a modern web application. It leverages the Next.js framework for a full-stack architecture, combining server-side rendering, API routes, and client-side interactivity. The system is designed to be secure, responsive, and data-centric.

## Tech Stack

-   **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/)
-   **ORM**: [Prisma](https://www.prisma.io/)
-   **Authentication**: [Auth.js (NextAuth v5)](https://authjs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (based on Radix UI)
-   **AI Integration**: [Google Gemini AI](https://deepmind.google/technologies/gemini/)
-   **Package Manager**: `bun`

## System Architecture

### 1. Application Layer (Next.js App Router)
The application uses the Next.js App Router for routing and rendering.
-   **Server Components**: Used by default for data fetching, security, and performance. Direct access to the database via Prisma.
-   **Client Components**: Used for interactive elements (forms, charts, dialogs). Marked with `"use server"` for server actions.
-   **Server Actions**: Replacing traditional API routes for form submissions and data mutations. Located in `app/actions/*.ts`.

### 2. Data Access Layer (Prisma ORM)
-   **Schema**: Defined in `prisma/schema.prisma`.
-   **Client**: Instantiated as a singleton in `lib/db.ts` to prevent connection exhaustion in serverless environments.
-   **Type Safety**: Auto-generated TypeScript types ensure end-to-end type safety from database to UI.

### 3. Authentication Layer (NextAuth)
-   **Session Strategy**: JWT-based sessions.
-   **Persistence**: User data and sessions are stored in PostgreSQL using the Prisma Adapter.
-   **Protection**: Server Actions and Pages verify session validity before executing logic or rendering sensitive data.

### 4. External Integrations
-   **Google Gemini AI**: Accessed via `app/actions/ai.ts` for natural language processing and document parsing.
-   **File Storage**: (Implied/Future) Currently handles file parsing in-memory; production would likely require S3/Blob storage.

## Data Flow

1.  **Read Operations**:
    -   User requests a page (e.g., `/dashboard/expenses`).
    -   Server Component (`page.tsx`) calls a server action or Prisma function directly (e.g., `getExpenses`).
    -   Data is fetched from PostgreSQL.
    -   Page is rendered on the server with data and sent to the client.

2.  **Write Operations**:
    -   User submits a form (e.g., "Add Expense").
    -   Client invokes a Server Action (`createExpense`).
    -   Action performs validation (Zod), authentication check, and database transaction.
    -   On success, `revalidatePath` is called to refresh the UI with new data.

## Directory Structure

-   `app/`: Application routes and views.
    -   `actions/`: Server actions for business logic.
    -   `api/`: Route handlers (e.g., NextAuth endpoints).
    -   `dashboard/`: Protected application routes.
-   `components/`: Reusable UI components.
    -   `ui/`: Base UI primitives (buttons, inputs).
    -   `[feature]/`: Feature-specific components (e.g., `bank-accounts/account-card.tsx`).
-   `lib/`: Shared utilities (database client, helper functions).
-   `prisma/`: Database schema and migrations.

## Security Considerations

-   **Data Isolation**: All database queries are scoped by `userId` to ensure strict data privacy.
-   **Input Validation**: All user inputs are validated using Zod schemas before processing.
-   **Environment Variables**: Sensitive keys (DB URL, API keys) are stored in `.env` and not committed to version control.

