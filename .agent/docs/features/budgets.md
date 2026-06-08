# Budgets Feature

## Description
The Budgets feature enables users to set financial limits for different categories over specific periods (monthly, quarterly, yearly). It helps users track their spending against these limits and provides alerts when thresholds are approached.

## Key Capabilities
-   **Create Budget**: Set a budget amount for a specific category and time period.
-   **Track Spending**: Automatically calculates the amount spent in the budget category during the specified period based on recorded expenses.
-   **Alert Threshold**: Users can define a percentage (default 80%) at which they want to be alerted.
-   **Carry Forward**: Option to carry forward unspent budget amounts to the next period (logic implied in model, implementation details in future iterations).
-   **Delete Budget**: Remove a budget that is no longer needed.

## Data Model

The `Budget` model defines the parameters for financial planning.

```prisma
model Budget {
  id             String       @id @default(cuid())
  userId         String
  category       String
  amount         Decimal
  period         BudgetPeriod // MONTHLY, QUARTERLY, YEARLY
  startDate      DateTime
  endDate        DateTime
  alertThreshold Int          @default(80) // Percentage
  carryForward   Boolean      @default(false)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## API / Actions

Server actions are defined in `app/actions/budget.ts`.

### `createBudget`
-   **Purpose**: Creates a new budget configuration.
-   **Input**: `FormData` containing category, amount, period, dates, and threshold.
-   **Logic**:
    -   Validates input data.
    -   Creates a record in the `Budget` table.
    -   Revalidates the budgets dashboard.

### `getBudgets`
-   **Purpose**: Retrieves all budgets for the user and calculates current spending.
-   **Logic**:
    -   Fetches all budget records for the user.
    -   For each budget, aggregates `Expense` records that match the category and fall within the budget's date range.
    -   Returns budgets with an added `spent` field.

### `deleteBudget`
-   **Purpose**: Deletes a specific budget.
-   **Input**: `id` (string).

## UI Components
-   **Page**: `app/dashboard/budgets/page.tsx`
-   **Components**:
    -   `components/budgets/add-budget-dialog.tsx`: Interface for creating new budgets.
    -   (Implied) Budget list/card component to display progress bars for spending vs. limit.

