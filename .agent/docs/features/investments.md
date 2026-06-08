# Investments Feature

## Description
The Investments feature helps users track their portfolio across various asset classes like Equity, Debt, Gold, Real Estate, etc. It tracks purchase price, quantity, and current value to monitor portfolio growth.

## Key Capabilities
-   **Add Investment**: Record new investments with details like asset class, name, quantity, and purchase price.
-   **Asset Classes**: Supports a wide range of types including FD, PPF, NPS, Mutual Funds (Equity/Debt), and more.
-   **Valuation**: Tracks current price (manually updated) to calculate current total value.
-   **Maturity Tracking**: Optional maturity date field for fixed-term investments.

## Data Model

The `Investment` model stores portfolio items.

```prisma
model Investment {
  id            String     @id @default(cuid())
  userId        String
  assetClass    AssetClass // EQUITY, DEBT, HYBRID, FD, PPF, NPS, GOLD, REAL_ESTATE, etc.
  assetName     String
  quantity      Decimal
  purchasePrice Decimal
  purchaseDate  DateTime
  currentPrice  Decimal?
  currentValue  Decimal?
  maturityDate  DateTime?
  notes         String?    @db.Text
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  taxDeductions TaxDeduction[]
}
```

## API / Actions

Server actions are defined in `app/actions/investment.ts`.

### `createInvestment`
-   **Purpose**: Adds a new investment to the portfolio.
-   **Input**: `FormData`.
-   **Logic**:
    -   Validates input data.
    -   Calculates `currentValue` (initializes as `purchasePrice * quantity` if current price isn't provided).
    -   Creates the `Investment` record.
    -   Revalidates the investments page.

### `getInvestments`
-   **Purpose**: Retrieves all investments for the user.
-   **Output**: List of investments ordered by purchase date.

## UI Components
-   **Page**: `app/dashboard/investments/page.tsx`
-   **Components**:
    -   `components/investments/add-investment-dialog.tsx`: Form for adding investments.
    -   `components/investments/portfolio-chart.tsx`: Visualization of portfolio distribution (implied).

