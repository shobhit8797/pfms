# Bank Accounts Feature

## Description
The Bank Accounts feature allows users to manage their bank accounts within the application. Users can add multiple accounts, track their balances, view a consolidated total balance, and perform various management operations. This feature serves as the foundation for tracking income and expenses and includes advanced capabilities like statement reconciliation, transaction analytics, and automated balance tracking.

## Key Capabilities

### Core Operations
-   **Add Bank Account**: Users can link new bank accounts by providing details like account name, bank name, account number, and IFSC code.
-   **Edit Bank Account**: Users can modify existing account details including name, bank, account type, and balance.
-   **View Accounts**: A list of all accounts (active and inactive) is displayed with their current balances.
-   **Total Balance**: A dashboard view shows the aggregated balance across all active accounts.
-   **Primary Account**: Users can designate one account as the primary account for default operations.
-   **Account Status**: Accounts can be toggled as active or inactive directly from the account card.
-   **Quick Actions**: Account cards provide one-click access to common operations (edit, toggle status, set as primary, delete).

### Advanced Features
-   **Bank Statement Upload**: Import transactions directly from bank statements (CSV, XLSX, PDF).
-   **Transaction Reconciliation**: Match imported transactions with existing records and identify discrepancies.
-   **Inter-Account Transfers**: Move money between user's own accounts with automatic balance updates.
-   **Account Analytics**: Detailed insights including spending patterns, cash flow analysis, and balance trends.
-   **Balance Alerts**: Notifications when balance falls below user-defined thresholds.
-   **Interest Tracking**: Calculate and display projected interest earnings for savings accounts.
-   **Statement Generation**: Generate custom PDF statements for any date range.
-   **Account Organization**: Group accounts, add tags, and attach notes for better management.

## Data Model

### Core Models

```prisma
model BankAccount {
  id             String      @id @default(cuid())
  userId         String
  accountName    String
  bankName       String
  accountType    AccountType // SAVINGS, CURRENT, SALARY
  accountNumber  String      // Encrypted in app logic
  ifscCode       String
  currentBalance Decimal     @default(0)
  isPrimary      Boolean     @default(false)
  isActive       Boolean     @default(true)
  
  // Phase 2: Analytics & Tracking
  minimumBalance Decimal?    @default(0)
  interestRate   Decimal?    // Annual interest rate percentage
  lastReconciled DateTime?   // Last reconciliation date
  
  // Phase 6: Organization
  groupId        String?
  tags           String[]    // Array of custom tags
  notes          String?     @db.Text
  color          String?     // UI color for visual identification
  
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  user             User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  group            AccountGroup?           @relation(fields: [groupId], references: [id])
  incomes          Income[]
  expenses         Expense[]
  transfersFrom    TransferTransaction[]   @relation("FromAccount")
  transfersTo      TransferTransaction[]   @relation("ToAccount")
  statementUploads StatementUpload[]
  reconciliations  ReconciliationRecord[]
  balanceHistory   BalanceSnapshot[]
  alerts           BalanceAlert[]
}

// Phase 3: Inter-Account Transfers
model TransferTransaction {
  id              String      @id @default(cuid())
  userId          String
  fromAccountId   String
  toAccountId     String
  amount          Decimal
  transferDate    DateTime
  description     String?
  notes           String?     @db.Text
  status          TransferStatus @default(COMPLETED) // PENDING, COMPLETED, FAILED
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  fromAccount BankAccount @relation("FromAccount", fields: [fromAccountId], references: [id])
  toAccount   BankAccount @relation("ToAccount", fields: [toAccountId], references: [id])
}

// Phase 2: Statement Upload & Reconciliation
model StatementUpload {
  id                 String      @id @default(cuid())
  userId             String
  bankAccountId      String
  fileName           String
  fileType           FileType    // CSV, XLSX, PDF
  fileSize           Int         // In bytes
  uploadDate         DateTime    @default(now())
  statementPeriod    String      // e.g., "2024-01" for Jan 2024
  statementStartDate DateTime
  statementEndDate   DateTime
  totalTransactions  Int         @default(0)
  matchedCount       Int         @default(0)
  unmatchedCount     Int         @default(0)
  processingStatus   ProcessingStatus @default(PENDING)
  errorMessage       String?     @db.Text
  
  user           User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankAccount    BankAccount             @relation(fields: [bankAccountId], references: [id])
  transactions   ExtractedTransaction[]
  reconciliation ReconciliationRecord?
}

// Extracted transactions from bank statements (raw data)
model ExtractedTransaction {
  id                String      @id @default(cuid())
  statementUploadId String
  transactionDate   DateTime
  description       String
  amount            Decimal
  type              String      // DEBIT, CREDIT
  balance           Decimal?    // Running balance if available
  referenceNumber   String?
  category          String?     // Auto-suggested category
  
  // Reconciliation
  isMatched         Boolean     @default(false)
  matchedExpenseId  String?
  matchedIncomeId   String?
  
  statementUpload StatementUpload @relation(fields: [statementUploadId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
}

// Reconciliation tracking
model ReconciliationRecord {
  id                String      @id @default(cuid())
  userId            String
  bankAccountId     String
  statementUploadId String      @unique
  reconciliationDate DateTime   @default(now())
  
  openingBalance    Decimal
  closingBalance    Decimal
  expectedBalance   Decimal     // From our records
  actualBalance     Decimal     // From statement
  difference        Decimal     // Discrepancy
  
  totalCredits      Decimal
  totalDebits       Decimal
  matchedCount      Int
  unmatchedCount    Int
  
  status            ReconciliationStatus @default(IN_PROGRESS)
  notes             String?     @db.Text
  
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankAccount     BankAccount     @relation(fields: [bankAccountId], references: [id])
  statementUpload StatementUpload @relation(fields: [statementUploadId], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Phase 2: Balance tracking over time
model BalanceSnapshot {
  id            String      @id @default(cuid())
  bankAccountId String
  balance       Decimal
  snapshotDate  DateTime
  source        String      // MANUAL, RECONCILIATION, TRANSACTION
  
  bankAccount BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  createdAt   DateTime    @default(now())
}

// Phase 2: Balance alerts
model BalanceAlert {
  id            String      @id @default(cuid())
  userId        String
  bankAccountId String
  alertType     AlertType   // LOW_BALANCE, MINIMUM_BALANCE, UNUSUAL_ACTIVITY
  threshold     Decimal?
  message       String
  isRead        Boolean     @default(false)
  triggeredAt   DateTime    @default(now())
  
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankAccount BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
}

// Phase 6: Account Groups/Folders
model AccountGroup {
  id          String      @id @default(cuid())
  userId      String
  name        String
  description String?
  color       String?
  icon        String?
  sortOrder   Int         @default(0)
  createdAt   DateTime    @default(now())
  
  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  accounts BankAccount[]
}

// Enums
enum AccountType {
  SAVINGS
  CURRENT
  SALARY
  OVERDRAFT
}

enum FileType {
  CSV
  XLSX
  PDF
}

enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum ReconciliationStatus {
  IN_PROGRESS
  COMPLETED
  DISCREPANCY_FOUND
  RESOLVED
}

enum TransferStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
}

enum AlertType {
  LOW_BALANCE
  MINIMUM_BALANCE
  UNUSUAL_ACTIVITY
  HIGH_SPENDING
}
```

## API / Actions

Server actions are defined in `app/actions/bank-account.ts`.

### Phase 1: Core Management

#### `createBankAccount`
-   **Purpose**: Creates a new bank account record.
-   **Input**: `FormData` containing account details.
-   **Logic**:
    -   Validates input using Zod.
    -   If `isPrimary` is selected, updates existing accounts to remove primary status.
    -   Creates the new account record.
    -   Creates initial balance snapshot.
    -   Revalidates the accounts page.

#### `updateBankAccount`
-   **Purpose**: Updates an existing bank account's details.
-   **Input**: `accountId` (string), `FormData` containing updated fields.
-   **Logic**:
    -   Validates ownership (ensures userId matches).
    -   Validates input using Zod.
    -   If `isPrimary` is being set to true, removes primary status from other accounts.
    -   Updates the account record.
    -   Revalidates the accounts page.
-   **Allowed Updates**: accountName, bankName, accountType, currentBalance, isPrimary, isActive, minimumBalance, interestRate, tags, notes, color.
-   **Restricted**: accountNumber and ifscCode cannot be changed (security measure).

#### `getBankAccounts`
-   **Purpose**: Retrieves bank accounts for the current user.
-   **Input**: Optional `filter` (ALL, ACTIVE, INACTIVE).
-   **Output**: Array of `BankAccount` objects ordered by creation date (descending).

#### `getBankAccountById`
-   **Purpose**: Retrieves a specific bank account by ID.
-   **Input**: `accountId` (string).
-   **Output**: Single `BankAccount` object with related data or null.

#### `toggleAccountStatus`
-   **Purpose**: Updates the `isActive` status of an account.
-   **Input**: `accountId` (string), `isActive` (boolean).
-   **Logic**:
    -   Validates ownership.
    -   Toggles the `isActive` field.
    -   If deactivating the primary account, automatically sets another active account as primary.
    -   Revalidates the accounts page.

#### `setPrimaryAccount`
-   **Purpose**: Designates a specific account as the primary account.
-   **Input**: `accountId` (string).
-   **Logic**:
    -   Removes primary status from all other accounts.
    -   Sets the specified account as primary.
    -   Revalidates the accounts page.

#### `deleteAccount`
-   **Purpose**: Soft deletes an account (marks as inactive and archived).
-   **Input**: `accountId` (string).
-   **Logic**:
    -   Validates that no active transactions reference this account.
    -   Marks account as inactive.
    -   If it was the primary account, assigns primary status to another active account.
-   **Note**: Hard deletion is not allowed if transactions exist to maintain data integrity.

### Phase 2: Analytics & Tracking

#### `getAccountAnalytics`
-   **Purpose**: Generates comprehensive analytics for a specific account.
-   **Input**: `accountId` (string), `period` (MONTH, QUARTER, YEAR, CUSTOM), optional date range.
-   **Output**: Object containing:
    -   Total income/expense for period
    -   Category-wise breakdown
    -   Daily balance trend
    -   Average daily balance
    -   Highest/lowest balance points
    -   Spending patterns (day of week, time of month)
    -   Comparison with previous period

#### `getAccountTransactionHistory`
-   **Purpose**: Retrieves paginated transaction history for an account.
-   **Input**: `accountId`, `page`, `limit`, optional filters (date range, type, category).
-   **Output**: Paginated list of transactions (income + expenses) with metadata.

#### `calculateProjectedInterest`
-   **Purpose**: Calculates projected interest earnings for savings accounts.
-   **Input**: `accountId`, `months` (projection period).
-   **Logic**:
    -   Uses current balance and interest rate.
    -   Applies compound interest calculation.
    -   Returns month-by-month breakdown.

#### `getBalanceHistory`
-   **Purpose**: Retrieves balance snapshots over time.
-   **Input**: `accountId`, date range.
-   **Output**: Array of balance points for charting.

#### `createBalanceAlert`
-   **Purpose**: Sets up a new balance alert.
-   **Input**: `accountId`, `alertType`, `threshold`.
-   **Logic**: Creates alert configuration and monitors balance changes.

#### `checkAndTriggerAlerts`
-   **Purpose**: Background job to check if any alert conditions are met.
-   **Logic**: Runs on every balance update, creates notifications if thresholds crossed.

### Phase 3: Advanced Operations

#### `createTransfer`
-   **Purpose**: Transfers money between user's own accounts.
-   **Input**: `FormData` containing fromAccountId, toAccountId, amount, date, description.
-   **Logic**:
    -   Validates that both accounts belong to the user.
    -   Checks sufficient balance in source account.
    -   Uses Prisma transaction to:
        1. Create `TransferTransaction` record
        2. Decrement balance from source account
        3. Increment balance in destination account
        4. Create balance snapshots for both accounts
    -   Revalidates accounts page.

#### `getTransfers`
-   **Purpose**: Retrieves transfer history.
-   **Input**: Optional `accountId` (to filter), date range.
-   **Output**: List of transfers with account details.

#### `scheduleRecurringTransfer`
-   **Purpose**: Sets up automatic recurring transfers.
-   **Input**: Transfer details + frequency (WEEKLY, MONTHLY, etc.).
-   **Logic**: Creates scheduled job to execute transfers automatically.

#### `reconcileAccount`
-   **Purpose**: Manual balance reconciliation.
-   **Input**: `accountId`, `actualBalance`, `reconciliationDate`.
-   **Logic**:
    -   Compares actual balance with system balance.
    -   Creates reconciliation record with discrepancy.
    -   Optionally adjusts system balance with user confirmation.

### Phase 2: Bank Statement Upload & Processing

#### `uploadBankStatement`
-   **Purpose**: Uploads and processes bank statements.
-   **Input**: `FormData` containing file, accountId, optional password.
-   **Logic**:
    1.  **File Validation**:
        -   Check file type (CSV, XLSX, PDF).
        -   Validate file size (max 10MB).
    2.  **Password Handling**:
        -   If file is password-protected, prompt user for password.
        -   Attempt to decrypt/open file with provided password.
        -   Return error if password incorrect.
    3.  **File Processing**:
        -   **PDF**: Use `pdf-parse` + Google Gemini AI to extract text and parse transactions.
        -   **CSV**: Use Papaparse to parse rows, detect bank format, map columns.
        -   **XLSX**: Use SheetJS to read Excel file, process sheets.
    4.  **Transaction Extraction**:
        -   Use AI (Gemini) with bank-specific prompts to extract:
            -   Transaction date
            -   Description
            -   Amount (debit/credit)
            -   Running balance
            -   Reference number
        -   Auto-suggest categories based on description patterns.
    5.  **Database Operations**:
        -   Create `StatementUpload` record.
        -   Create `ExtractedTransaction` records for each transaction.
        -   Update processing status.
    6.  **Return**: Upload ID for review process.

#### `processStatementPassword`
-   **Purpose**: Handles password-protected files separately.
-   **Input**: `uploadId`, `password`.
-   **Logic**: Attempts to decrypt and process the file with new password.

#### `getExtractedTransactions`
-   **Purpose**: Retrieves extracted transactions from a statement upload.
-   **Input**: `uploadId`.
-   **Output**: List of extracted transactions with suggested categories.

#### `reviewAndImportTransactions`
-   **Purpose**: User reviews extracted transactions and confirms import.
-   **Input**: `uploadId`, array of confirmed transactions (user can edit categories, merge, or exclude).
-   **Logic**:
    1.  **Duplicate Detection**:
        -   Check for existing expenses/incomes with matching:
            -   Date (within ±2 days)
            -   Amount (exact match)
            -   Description (fuzzy match)
        -   Flag potential duplicates for user review.
    2.  **Transaction Creation**:
        -   For non-duplicates, create `Expense` or `Income` records.
        -   Link to the bank account.
        -   Update account balance if not already reflected.
    3.  **Reconciliation**:
        -   Create `ReconciliationRecord`.
        -   Compare statement closing balance with system balance.
        -   Calculate discrepancy.
    4.  **Mark Matched**:
        -   Update `ExtractedTransaction` records with matched IDs.
    5.  **Analytics Update**:
        -   Trigger analytics refresh for the account.

#### `getStatementUploads`
-   **Purpose**: Retrieves upload history for an account.
-   **Input**: `accountId`.
-   **Output**: List of statement uploads with processing status.

#### `deleteStatementUpload`
-   **Purpose**: Removes a statement upload and its extracted transactions.
-   **Input**: `uploadId`.
-   **Logic**: Deletes upload record and all related extracted transactions (does not delete imported transactions).

#### `autoCategorizeTran saction`
-   **Purpose**: AI-powered automatic categorization.
-   **Input**: Transaction description.
-   **Output**: Suggested category with confidence score.
-   **Logic**:
    -   Uses Gemini AI with historical transaction data as context.
    -   Learns from user's category assignments over time.

#### `generateReconciliationReport`
-   **Purpose**: Creates a detailed reconciliation report.
-   **Input**: `reconciliationId`.
-   **Output**: Formatted report object with:
    -   Matched transactions
    -   Unmatched system transactions
    -   Unmatched statement transactions
    -   Balance discrepancies
    -   Recommendations for resolution

### Phase 5: Reporting & Export

#### `generateAccountStatement`
-   **Purpose**: Creates a custom PDF statement.
-   **Input**: `accountId`, `startDate`, `endDate`, optional formatting options.
-   **Logic**:
    -   Fetches all transactions for the period.
    -   Calculates opening/closing balance.
    -   Generates formatted PDF with:
        -   Account details
        -   Transaction list (chronological)
        -   Summary statistics
        -   Charts (optional)
    -   Returns downloadable PDF.

#### `exportTransactions`
-   **Purpose**: Exports transaction data to CSV/Excel.
-   **Input**: `accountId`, date range, format (CSV, XLSX).
-   **Output**: Downloadable file with formatted transaction data.

#### `generateTaxReport`
-   **Purpose**: Year-end tax summary for an account.
-   **Input**: `accountId`, `financialYear`.
-   **Output**: Report containing:
    -   Total taxable income
    -   Tax-deductible expenses
    -   Interest earned (for tax purposes)
    -   Category-wise breakdown

#### `compareAccounts`
-   **Purpose**: Side-by-side comparison of multiple accounts.
-   **Input**: Array of `accountIds`, comparison period.
-   **Output**: Comparison matrix showing:
    -   Balance trends
    -   Income/expense patterns
    -   Growth rates
    -   Category distributions

### Phase 6: Organization & Management

#### `createAccountGroup`
-   **Purpose**: Creates a new account group/folder.
-   **Input**: `FormData` (name, description, color, icon).
-   **Logic**: Creates group and allows drag-drop assignment of accounts.

#### `assignAccountToGroup`
-   **Purpose**: Moves an account to a group.
-   **Input**: `accountId`, `groupId`.

#### `updateAccountTags`
-   **Purpose**: Adds/removes tags from an account.
-   **Input**: `accountId`, array of tags.

#### `addAccountNote`
-   **Purpose**: Adds rich text notes to an account.
-   **Input**: `accountId`, note content (rich text/markdown).

#### `getGroupedAccounts`
-   **Purpose**: Retrieves accounts organized by groups.
-   **Output**: Nested structure of groups and their accounts.

## UI Components

### Pages
-   **`app/dashboard/accounts/page.tsx`**: Main accounts overview with summary cards.
-   **`app/dashboard/accounts/[accountId]/page.tsx`**: Detailed account dashboard with analytics.
-   **`app/dashboard/accounts/[accountId]/transactions/page.tsx`**: Transaction history view.
-   **`app/dashboard/accounts/[accountId]/reconciliation/page.tsx`**: Reconciliation interface.
-   **`app/dashboard/accounts/transfers/page.tsx`**: Inter-account transfer management.

### Components

#### **`components/bank-accounts/account-card.tsx`**
Displays individual account with quick actions:
-   **Header**: Account name, bank name, type chip, status badge
-   **Body**: Current balance (prominent), account number (masked), last updated
-   **Metrics Bar**: Monthly income/expense, balance trend indicator
-   **Actions Dropdown**:
    -   Toggle active/inactive (switch)
    -   Set as primary (star icon)
    -   Edit account
    -   View details/analytics
    -   Upload statement
    -   Delete account
-   **Visual Indicators**:
    -   Primary badge (gold star)
    -   Inactive overlay (reduced opacity + badge)
    -   Custom color accent (user-defined)
    -   Balance alert indicator (if below threshold)

#### **`components/bank-accounts/add-account-dialog.tsx`**
Form dialog for creating new accounts with fields:
-   Account name, bank name, account type
-   Account number (encrypted), IFSC code
-   Initial balance, minimum balance
-   Interest rate (for savings)
-   Primary account toggle

#### **`components/bank-accounts/edit-account-dialog.tsx`**
Pre-populated edit form (similar to add dialog).

#### **`components/bank-accounts/statement-upload-dialog.tsx`**
**Multi-step upload wizard**:
1.  **File Selection**: Drag-drop or browse for CSV/XLSX/PDF
2.  **Password Entry**: If file is protected, prompt for password
3.  **Processing**: Show progress spinner during extraction
4.  **Preview**: Display extracted transactions in table
5.  **Review**: User can:
    -   Edit categories
    -   Exclude transactions
    -   Merge duplicates
    -   Add notes
6.  **Confirmation**: Summary before final import

#### **`components/bank-accounts/reconciliation-view.tsx`**
Split-screen interface showing:
-   **Left**: System transactions
-   **Right**: Statement transactions
-   **Center**: Matching interface with drag-drop or click-to-match
-   **Bottom**: Balance comparison and discrepancy summary

#### **`components/bank-accounts/transfer-form.tsx`**
Form for inter-account transfers:
-   Source account dropdown
-   Destination account dropdown
-   Amount input with balance validation
-   Transfer date
-   Description/notes
-   Preview of balance changes

#### **`components/bank-accounts/account-analytics-dashboard.tsx`**
Comprehensive analytics view:
-   **Balance Trend Chart**: Line chart showing balance over time
-   **Cash Flow Chart**: Bar chart of income vs expenses
-   **Category Breakdown**: Pie chart of spending by category
-   **Key Metrics Cards**: Avg balance, total in/out, growth rate
-   **Transaction Heatmap**: Calendar view showing activity patterns
-   **Interest Projection**: If savings account, shows projected earnings

#### **`components/bank-accounts/account-groups-sidebar.tsx`**
Collapsible sidebar showing:
-   Ungrouped accounts
-   Custom groups (expandable)
-   Drag-drop to reorder/assign

#### **`components/bank-accounts/balance-alert-banner.tsx`**
Displays active alerts with dismissal option.

### Card Interaction Flow
```
Account Card (Enhanced)
├── Header
│   ├── Account Name (editable on click)
│   ├── Bank Name + Type Chip
│   └── Status Badges (Primary, Inactive, Alert)
├── Body
│   ├── Current Balance (large, color-coded)
│   ├── Balance Trend Indicator (↑/↓ with percentage)
│   ├── Account Number (masked, click to reveal)
│   └── Quick Stats (This Month: +Income / -Expenses)
├── Footer
│   ├── Last Transaction Date
│   └── Last Reconciled Date (if applicable)
└── Actions Menu
    ├── View Analytics →
    ├── Upload Statement →
    ├── Transfer Funds →
    ├── Set as Primary ⭐
    ├── Toggle Active/Inactive 🔄
    ├── Edit Account ✏️
    └── Delete Account 🗑️ (with confirmation)
```

## Statement Upload Workflow

### Supported Formats & Parsing Logic

#### 1. CSV Files
-   **Detection**: Auto-detect bank format based on headers.
-   **Supported Banks**: HDFC, ICICI, SBI, Axis, Kotak, etc.
-   **Column Mapping**:
    -   Date columns: "Date", "Transaction Date", "Value Date"
    -   Description: "Description", "Narration", "Particulars"
    -   Amount: "Debit", "Credit", "Amount", "Withdrawal", "Deposit"
    -   Balance: "Balance", "Closing Balance"
-   **Parsing**: Use Papaparse with robust options (skip empty lines, dynamic typing).

#### 2. Excel Files (XLSX)
-   **Detection**: Read first sheet by default, allow sheet selection.
-   **Processing**: Similar to CSV, use SheetJS to convert to JSON.

#### 3. PDF Files
-   **Challenges**: Banks use different PDF layouts (table vs text-based).
-   **Solution**: 
    -   Use `pdf-parse` to extract raw text.
    -   Send text to Gemini AI with structured extraction prompt.
    -   AI identifies patterns and extracts transactions.
-   **Password Handling**:
    -   Use `pdf-lib` or `qpdf` wrapper to decrypt PDF.
    -   Prompt user for password if decryption fails.
    -   Cache decrypted version temporarily for processing.

### Password-Protected Files

#### Workflow:
1.  User uploads file
2.  System attempts to open/parse file
3.  If password-protected:
    -   Show password input dialog
    -   User enters password
    -   System retries with password
4.  If password correct: Continue processing
5.  If password wrong: Show error, allow retry (max 3 attempts)
6.  For security: Don't store the password, only use for immediate decryption

#### Security Considerations:
-   Passwords transmitted over HTTPS only
-   Not stored in database
-   Decrypted files processed in memory, not saved to disk
-   Clear decrypted data after processing

### Transaction Extraction Process

1.  **Raw Text/Data Extraction**
2.  **AI-Powered Parsing** (for PDFs and complex formats):
    ```
    Prompt to Gemini:
    "Extract all transactions from this bank statement. Return JSON array with:
    - date (ISO format)
    - description (string)
    - amount (number, positive for credit, negative for debit)
    - type (CREDIT or DEBIT)
    - balance (if available)
    - reference (transaction ID if present)
    
    Statement text: [extracted text]"
    ```
3.  **Validation**: Check date ranges, amounts are numeric, no missing critical fields
4.  **Category Suggestion**: Use AI to suggest categories based on description
5.  **Duplicate Detection**: Hash transactions and compare with existing records
6.  **User Review**: Present in editable table format

### Reconciliation Logic

1.  **Opening Balance**: Get account balance at statement start date
2.  **Statement Balance**: Extract closing balance from statement
3.  **Calculated Balance**: Apply all transactions to opening balance
4.  **Comparison**:
    -   If calculated == statement: ✅ Reconciled
    -   If different: ⚠️ Discrepancy found
5.  **Discrepancy Resolution**:
    -   Show missing transactions (in system but not in statement)
    -   Show extra transactions (in statement but not in system)
    -   Allow manual adjustment with reason
6.  **Final Update**: Update account balance to match statement

### Analytics Generated from Statements

-   **Spending Velocity**: Track how quickly money is spent after income
-   **Recurring Transaction Detection**: Identify patterns (subscriptions, EMIs)
-   **Merchant Analysis**: Group by merchant/vendor
-   **Time-based Patterns**: Day of week/month spending patterns
-   **Category Trends**: Changes in category-wise spending over time
-   **Balance Stability**: Analyze balance volatility

## Implementation Priority

### ✅ Phase 1: Enhanced Management (Complete)
1. Edit account functionality
2. Enhanced card interactions (toggle status, set primary)
3. Delete account with validation
4. Account detail view

### 🔄 Phase 2: Analytics & Statement Upload (Current Sprint)
1. **High Priority**:
   - Bank statement upload (CSV/XLSX/PDF)
   - Password-protected file handling
   - Transaction extraction with AI
   - Duplicate detection
   - Review and import workflow
2. **Medium Priority**:
   - Account-level analytics dashboard
   - Transaction history per account
   - Balance history tracking
   - Balance alerts

### 📅 Phase 3: Advanced Operations (Next Sprint)
1. Inter-account transfers
2. Transfer history
3. Scheduled recurring transfers
4. Manual reconciliation interface
5. Interest calculation for savings accounts

### 📅 Phase 5: Reporting & Export (Upcoming)
1. PDF statement generation
2. CSV/Excel export
3. Tax reports for accounts
4. Account comparison reports
5. Custom date range reports

### 📅 Phase 6: Organization (Future)
1. Account groups/folders
2. Custom tags
3. Account notes (rich text)
4. Custom colors for accounts
5. Drag-drop organization
6. Minimum balance monitoring

## Technical Considerations

### Security
-   **Account Number Encryption**: Store account numbers encrypted in database.
-   **Masking**: Display only last 4 digits in UI (e.g., "****1234").
-   **Edit Restrictions**: Account number and IFSC cannot be edited post-creation.
-   **Deletion Protection**: Prevent deletion of accounts with linked transactions.
-   **Password Handling**: Never store statement passwords; use only for immediate decryption.
-   **File Upload Security**: Scan uploaded files for malware, limit file size to 10MB.

### Performance
-   **Balance Aggregation**: Use database aggregation queries for total balance.
-   **Caching**: Cache total balance with revalidation on any transaction/transfer.
-   **Pagination**: Paginate transaction history (default 50 per page).
-   **Async Processing**: Process large statement files asynchronously with progress updates.
-   **Background Jobs**: Schedule balance snapshots, alert checking as background tasks.

### Data Integrity
-   **Atomic Transactions**: Use Prisma transactions for all balance-changing operations.
-   **Balance Validation**: Validate sufficient balance before allowing transfers/expenses.
-   **Primary Account Rule**: Always maintain exactly one primary account among active accounts.
-   **Reconciliation Tracking**: Maintain audit trail of all balance adjustments.
-   **Duplicate Prevention**: Hash-based duplicate detection for statement imports.

### AI Integration
-   **Model**: Google Gemini 1.5 Flash for transaction extraction.
-   **Fallback**: Rule-based parsing if AI extraction fails.
-   **Training**: Use successfully imported statements to improve extraction prompts.
-   **Category Learning**: Build user-specific category patterns over time.

### File Processing
-   **Libraries**:
    -   CSV: Papaparse
    -   Excel: SheetJS (xlsx)
    -   PDF: pdf-parse, pdf-lib (for encryption)
-   **Memory Management**: Stream large files instead of loading entirely.
-   **Cleanup**: Automatically delete processed files after 7 days.

### Error Handling
-   **File Errors**: Clear messages for unsupported formats, corrupted files.
-   **Password Errors**: Max 3 attempts, then lock file upload temporarily.
-   **Extraction Errors**: Show partial results, allow manual entry for failed transactions.
-   **Reconciliation Errors**: Gracefully handle missing data, provide manual override.