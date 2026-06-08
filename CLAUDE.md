# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Finance Management System (PFMS) - A comprehensive financial management web application built with Next.js 14+ (App Router), TypeScript, PostgreSQL, Prisma ORM, and NextAuth v5. The system provides bank account management, expense/income tracking, investments, budgets, subscriptions, tax planning, and AI-powered assistance via Google Gemini.

## Essential Commands

### Development
```bash
bun run dev              # Start Next.js dev server (runs on port 3000)
bun run build            # Build for production (includes Prisma generation)
bun run start            # Start production server
bun run lint             # Run ESLint
```

### Database (Prisma)
```bash
prisma generate          # Generate Prisma Client (auto-runs on postinstall)
prisma migrate dev       # Create and apply migrations in development
prisma migrate deploy    # Apply migrations in production
prisma studio            # Open Prisma Studio GUI
prisma db push           # Push schema changes without migration (dev only)
```

## Architecture

### Stack
- **Runtime**: Bun (package manager and runtime)
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth v5 (Auth.js) with JWT sessions and Prisma Adapter
- **UI**: Tailwind CSS v4 + Shadcn UI (Radix UI primitives)
- **AI**: Google Gemini AI for document parsing and natural language processing
- **Forms**: React Hook Form + Zod validation

### Core Patterns

#### Server Actions over API Routes
This codebase uses **Server Actions** (`"use server"`) instead of traditional API routes for all data mutations. Actions are located in `app/actions/*.ts` and are directly invoked from client components.

**Pattern:**
```typescript
// app/actions/[feature].ts
"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function createResource(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Validate with Zod
  // Perform database operation
  // revalidatePath() to refresh UI
}
```

#### Data Isolation
**CRITICAL**: All database queries MUST filter by `userId` to ensure data privacy. Never fetch data without scoping to the authenticated user.

```typescript
// CORRECT
const accounts = await prisma.bankAccount.findMany({
  where: { userId: session.user.id }
})

// WRONG - exposes all users' data
const accounts = await prisma.bankAccount.findMany()
```

#### Database Client Singleton
Use the singleton Prisma client from `lib/db.ts` to prevent connection exhaustion in serverless environments.

```typescript
import { prisma } from "@/lib/db"
```

### Project Structure

```
app/
├── actions/           # Server actions (business logic)
│   ├── bank-account.ts
│   ├── expense.ts
│   ├── income.ts
│   ├── investment.ts
│   ├── budget.ts
│   ├── subscription.ts
│   ├── tax.ts
│   ├── ai.ts
│   ├── credit-card.ts
│   ├── login.ts
│   └── register.ts
├── api/              # Route handlers (mainly NextAuth)
├── dashboard/        # Protected app routes
│   ├── accounts/
│   ├── expenses/
│   ├── income/
│   ├── investments/
│   ├── budgets/
│   ├── subscriptions/
│   ├── tax/
│   └── ai/
├── login/
├── register/
└── layout.tsx

components/
├── ui/               # Base Shadcn UI primitives
├── bank-accounts/    # Feature-specific components
├── expenses/
├── income/
├── investments/
├── budgets/
├── subscriptions/
├── tax/
└── dashboard/        # Layout components (sidebar, mobile-nav)

lib/
├── db.ts             # Prisma client singleton
├── utils.ts          # Utility functions (cn, etc.)
└── statement-parser.ts

prisma/
├── schema.prisma     # Database schema
└── migrations/

.agent/docs/          # Project documentation (READ BEFORE CODING)
├── architecture.md
├── frontend-design.md
└── features/
    ├── bank-accounts.md
    ├── expenses.md
    ├── income.md
    ├── investments.md
    ├── budgets.md
    ├── subscriptions.md
    ├── tax-planning.md
    ├── authentication.md
    └── ai-assistant.md
```

## Documentation-First Workflow

**IMPORTANT**: Before implementing any feature or making architectural changes, you MUST consult `.agent/docs/`:

1. **Search**: Read relevant documentation in `.agent/docs/features/` for the feature you're working on
2. **Verify**: Ensure your approach aligns with documented architecture and design patterns
3. **Update**: If your changes make documentation obsolete, update the relevant docs

Key documentation files:
- `.agent/docs/architecture.md` - System architecture and data flow
- `.agent/docs/frontend-design.md` - UI/UX guidelines and design system
- `.agent/docs/features/[feature].md` - Feature-specific schemas, API actions, and implementation details

## Key Technical Details

### Authentication
- **Strategy**: JWT-based sessions via NextAuth v5
- **Provider**: Credentials (email + bcrypt hashed password)
- **Session Access**: Use `import { auth } from "@/auth"` in Server Components/Actions
- **Protected Pages**: Check session in page.tsx or layout.tsx before rendering
- **User ID in Session**: Extended to include `session.user.id` for database queries

### Database Schema Highlights
- **User**: Central model, related to all financial entities
- **BankAccount**: Core entity with support for transfers, statement uploads, reconciliation, analytics
- **Expense/Income**: Transaction records with recurring support, tax deductibility flags
- **Investment**: Multi-asset class tracking (Equity, Debt, PPF, NPS, Gold, etc.)
- **Budget**: Period-based budgets with alert thresholds
- **Subscription**: Auto-renewal tracking with reminder system
- **TaxProfile & TaxDeduction**: Indian tax system support (Old/New regime)

### Enums (Important)
- `AccountType`: SAVINGS, CURRENT, SALARY, OVERDRAFT
- `IncomeType`: SALARY, FREELANCE, RENTAL, INTEREST, BONUS, GIFT, OTHER
- `PaymentMethod`: CASH, BANK_TRANSFER, CREDIT_CARD, UPI, OTHER
- `Frequency`: DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
- `BudgetPeriod`: MONTHLY, QUARTERLY, YEARLY
- `TaxRegime`: OLD, NEW

### Form Validation Pattern
All forms use React Hook Form + Zod resolver:

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  field: z.string().min(1, "Required")
})

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: {}
})
```

### UI Component Pattern
Follow Shadcn UI conventions:
- Import from `@/components/ui/*`
- Use `cn()` from `lib/utils.ts` for conditional classes
- Implement dark mode support using CSS variables (theme handled by `next-themes`)
- Use Lucide icons consistently

### Styling Guidelines
- **Tailwind-first**: 90% of styling via utility classes
- **Color System**: Use CSS variables (`bg-primary`, `text-foreground`, etc.)
- **Dark Mode**: All components must support dark mode
- **Spacing**: Follow Tailwind spacing scale (gap-4, p-6, p-8)
- **Cards**: Use `Card` component with subtle borders/shadows
- **Animations**: Use `animate-fade-in-up` for list items, stagger delays for smooth loading

### AI Integration (Google Gemini)
- **Model**: Gemini 1.5 Flash (via `@google/generative-ai`)
- **Use Cases**:
  - Bank statement parsing (PDF/CSV extraction)
  - Transaction categorization
  - Natural language queries in AI assistant
- **Location**: `app/actions/ai.ts`
- **Pattern**: Send structured prompts, expect JSON responses

### File Upload & Statement Parsing
Located in `lib/statement-parser.ts` and `app/actions/bank-account.ts`:
- **Supported Formats**: CSV, XLSX, PDF
- **Password Protection**: Handle password-protected PDFs (prompt user, decrypt in-memory)
- **Parsing Strategy**:
  - CSV/XLSX: Papaparse / SheetJS
  - PDF: pdf-parse + Gemini AI extraction
- **Security**: Never store passwords, process files in-memory, 10MB limit

## Common Patterns & Conventions

### Server Action Response Pattern
```typescript
export async function actionName(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    // Validation
    const validated = schema.safeParse(Object.fromEntries(formData))
    if (!validated.success) return { error: "Invalid input" }

    // Database operation
    await prisma.model.create({ data: { ...validated.data, userId: session.user.id } })

    // Revalidate UI
    revalidatePath("/dashboard/feature")
    return { success: true }
  } catch (error) {
    return { error: "Something went wrong" }
  }
}
```

### Atomic Balance Updates
Always use Prisma transactions for operations affecting balances:

```typescript
await prisma.$transaction([
  prisma.bankAccount.update({
    where: { id: fromAccountId },
    data: { currentBalance: { decrement: amount } }
  }),
  prisma.bankAccount.update({
    where: { id: toAccountId },
    data: { currentBalance: { increment: amount } }
  }),
  prisma.transferTransaction.create({ data: transferData })
])
```

### Primary Account Management
Ensure exactly one active account is marked as primary:
```typescript
// When setting new primary, remove from others
if (isPrimary) {
  await prisma.bankAccount.updateMany({
    where: { userId, isPrimary: true, id: { not: accountId } },
    data: { isPrimary: false }
  })
}
```

## Path Aliases
TypeScript paths configured with `@/*` mapping to project root:
```typescript
import { Component } from "@/components/ui/component"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
```

## Environment Variables
Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini API key
- Additional variables as needed (check `.env.example` if available)

## Git Workflow
- **Main Branch**: `main`
- **Current Branch**: `feat/bank-account` (as of last git status)
- Commit messages should be clear and descriptive

## Special Considerations

### Security
- Never expose account numbers (mask as `****1234`)
- Encrypt sensitive fields in database (account numbers, PAN, Aadhaar)
- Validate all inputs with Zod before database operations
- Check session in all Server Actions
- Scope all queries by userId

### Performance
- Use database aggregations for totals (avoid fetching all records)
- Paginate large lists (default 50 items)
- Cache total balances with path revalidation
- Process large statement files asynchronously

### Data Integrity
- Use Prisma transactions for multi-step operations
- Validate sufficient balance before transfers/expenses
- Maintain audit trail for reconciliations
- Hash-based duplicate detection for imports

## Common Tasks

### Adding a New Feature
1. Read `.agent/docs/features/[feature].md` if it exists
2. Update Prisma schema if needed (`prisma migrate dev`)
3. Create server actions in `app/actions/[feature].ts`
4. Create page in `app/dashboard/[feature]/page.tsx`
5. Create components in `components/[feature]/`
6. Update documentation in `.agent/docs/` if applicable

### Adding a New UI Component
1. Use Shadcn CLI: `npx shadcn@latest add [component]`
2. Customize in `components/ui/[component].tsx`
3. Follow design guidelines from `.agent/docs/frontend-design.md`

### Debugging Database Issues
```bash
prisma studio           # Visual database browser
prisma db push          # Quick schema sync (dev only)
prisma migrate reset    # Reset database (WARNING: deletes data)
```

### Testing Auth Flow
1. Register at `/register`
2. Login at `/login`
3. Access dashboard at `/dashboard`
4. Session persists via JWT cookie


Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.