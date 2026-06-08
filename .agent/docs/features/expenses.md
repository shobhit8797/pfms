# Expenses Feature

## Description
The Expenses feature is a core component for tracking money outflow. It allows users to record transactions, categorize them, and link them to payment methods like bank accounts or credit cards. It supports recurring expenses and business-related tagging.

## Key Capabilities
-   **Record Expense**: Log a new expense with details like amount, date, category, and description.
-   **Payment Methods**: Link expenses to specific Bank Accounts or Credit Cards.
-   **Balance Updates**: Automatically deducts the expense amount from the linked bank account or adds it to the credit card outstanding balance.
-   **Recurring Expenses**: Flag expenses as recurring (daily, weekly, monthly, etc.).
-   **Tax & Business**: Tag expenses as business-related or tax-deductible (with section 80C, 80D, etc.).
-   **Expense Splitting**: (Model support exists) Ability to split expenses with others.

## Data Model

The `Expense` model records individual transaction details.

```prisma
model Expense {
  id                String        @id @default(cuid())
  userId            String
  amount            Decimal
  expenseDate       DateTime
  category          String
  subcategory       String?
  description       String
  paymentMethod     PaymentMethod // CASH, BANK_TRANSFER, CREDIT_CARD, UPI, OTHER
  bankAccountId     String?
  creditCardId      String?
  isRecurring       Boolean       @default(false)
  frequency         Frequency?
  invoiceUrl        String?
  isBusinessExpense Boolean       @default(false)
  isTaxDeductible   Boolean       @default(false)
  taxSection        String?       // e.g. "80C", "80D"
  notes             String?       @db.Text
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankAccount   BankAccount?   @relation(fields: [bankAccountId], references: [id])
  creditCard    CreditCard?    @relation(fields: [creditCardId], references: [id])
  splits        ExpenseSplit[]
  taxDeductions TaxDeduction[]
}
```

## API / Actions

Server actions are defined in `app/actions/expense.ts`.

### `createExpense`
-   **Purpose**: Records a new expense and updates related account balances.
-   **Input**: `FormData`.
-   **Logic**:
    -   Validates inputs (e.g., checks if bank account is provided for bank transfers).
    -   Uses a Prisma transaction to ensure data integrity:
        1.  Creates the `Expense` record.
        2.  If `BANK_TRANSFER`: Decrements `currentBalance` of the linked `BankAccount`.
        3.  If `CREDIT_CARD`: Increments `currentOutstanding` and decrements `availableCredit` of the linked `CreditCard`.
    -   Revalidates relevant paths.

### `getExpenses`
-   **Purpose**: Retrieves a paginated list of expenses.
-   **Input**: `limit` (default 20), `offset` (default 0).
-   **Output**: List of expenses including linked bank account and credit card names.

### `deleteExpense`
-   **Purpose**: Removes an expense and reverts the balance changes.
-   **Logic**:
    -   Finds the expense.
    -   Reverts the balance update on the linked Bank Account or Credit Card (credits back the amount).
    -   Deletes the expense record.

## UI Components
-   **Page**: `app/dashboard/expenses/page.tsx`
-   **Components**:
    -   `components/expenses/add-expense-dialog.tsx`: Form for adding expenses.

