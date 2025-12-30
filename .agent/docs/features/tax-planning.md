# Tax Planning Feature

## Description
The Tax Planning feature assists users in estimating their tax liability under both the Old and New Tax Regimes in India. It aggregates income, investments, and expenses to calculate deductions and project tax payable, helping users choose the most beneficial regime.

## Key Capabilities
-   **Tax Calculation**: Automated calculation of tax liability based on current income and deductions.
-   **Regime Comparison**: Side-by-side comparison of Old vs. New Regime tax outcomes.
-   **Deduction Tracking**:
    -   **Section 80C**: Automatically aggregates investments (PPF, EPF, ELSS) and expenses tagged with "80C".
    -   **Section 80D**: Aggregates health insurance premiums tagged with "80D".
    -   **NPS**: Tracks NPS investments for additional deductions.
-   **Manual Deductions**: Users can manually add tax deduction entries (e.g., proofs submitted).

## Data Model

### `TaxProfile`
Stores user-specific tax settings.
```prisma
model TaxProfile {
  userId          String    @unique
  financialYear   String    // e.g., "2024-25"
  preferredRegime TaxRegime @default(NEW)
  // ... PAN, Aadhaar (encrypted placeholders)
}
```

### `TaxDeduction`
Stores specific deduction proofs or entries.
```prisma
model TaxDeduction {
  userId        String
  financialYear String
  section       String // 80C, 80D, etc.
  amount        Decimal
  description   String?
  expenseId     String?
  investmentId  String?
  // ...
}
```

## API / Actions

Server actions are defined in `app/actions/tax.ts`.

### `calculateTax`
-   **Purpose**: Core logic for tax estimation.
-   **Logic**:
    1.  **Fetch Data**: Gets all taxable income, investments, and tax-deductible expenses.
    2.  **Gross Income**: Sums up taxable income.
    3.  **Old Regime Calc**:
        -   Aggregates 80C (capped at 1.5L), 80D (capped at 25k), NPS (capped at 50k).
        -   Adds Standard Deduction (50k).
        -   Applies tax slabs (0-2.5L, 2.5-5L, 5-10L, >10L).
        -   Applies Section 87A rebate if applicable.
    4.  **New Regime Calc**:
        -   Applies Standard Deduction (75k for FY24-25).
        -   Applies new tax slabs (3L, 7L, 10L, 12L, 15L).
        -   Applies Section 87A rebate (up to 7L income).
    5.  **Output**: Returns detailed breakdown of taxable income, deductions, and final tax payable for both regimes.

### `addDeduction`
-   **Purpose**: Manually adds a tax deduction record.
-   **Input**: `FormData` (section, amount, description).
-   **Logic**: Determines current financial year and creates `TaxDeduction` record.

## UI Components
-   **Page**: `app/dashboard/tax/page.tsx`
-   **Components**:
    -   `components/tax/add-deduction-dialog.tsx`: Interface for adding manual deductions.

