# Income Feature

## Description
The Income feature allows users to track their earnings from various sources such as Salary, Freelance work, Rental income, etc. It supports recurring income and automatic balance updates for linked bank accounts.

## Key Capabilities
-   **Record Income**: Log income entries with source, amount, date, and type.
-   **Bank Integration**: Link income directly to a bank account to automatically increase the balance.
-   **Recurring Income**: Mark income as recurring with a specific frequency.
-   **Taxable Flag**: Mark income as taxable for tax planning calculations.

## Data Model

The `Income` model captures earnings details.

```prisma
model Income {
  id            String     @id @default(cuid())
  userId        String
  source        String
  amount        Decimal
  incomeDate    DateTime
  type          IncomeType // SALARY, FREELANCE, RENTAL, INTEREST, BONUS, GIFT, OTHER
  isRecurring   Boolean    @default(false)
  frequency     Frequency?
  isTaxable     Boolean    @default(true)
  bankAccountId String?
  category      String
  invoiceUrl    String?
  notes         String?    @db.Text
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankAccount BankAccount? @relation(fields: [bankAccountId], references: [id])
}
```

## API / Actions

Server actions are defined in `app/actions/income.ts`.

### `createIncome`
-   **Purpose**: Records a new income entry.
-   **Input**: `FormData`.
-   **Logic**:
    -   Validates input.
    -   Creates the `Income` record.
    -   If a `bankAccountId` is provided, updates the `BankAccount` by incrementing its `currentBalance`.
    -   Revalidates dashboard paths.

### `getIncomes`
-   **Purpose**: Retrieves all income records for the user.
-   **Output**: List of incomes ordered by date (descending), including linked bank account details.

## UI Components
-   **Page**: `app/dashboard/income/page.tsx`
-   **Components**:
    -   `components/income/add-income-dialog.tsx`: Interface for logging new income.

