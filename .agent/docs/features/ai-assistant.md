# AI Assistant Feature

## Description
The AI Assistant feature leverages Google's Gemini AI to provide intelligent financial advice and automate data entry. It acts as a personal financial advisor and a document processor.

## Key Capabilities
-   **Financial Advisor Chat**: Users can ask natural language questions about their finances (e.g., "How can I save tax?", "Analyze my spending"). The AI uses the user's financial context to provide personalized answers.
-   **Statement Parsing**: Users can upload bank statements (PDF or CSV). The AI extracts transaction details (date, amount, description, category) and converts them into a structured JSON format for review/import.

## Integration Details
-   **Provider**: Google Generative AI (Gemini).
-   **Model**: `gemini-1.5-flash`.
-   **Dependencies**: `@google/generative-ai`, `pdf-parse`.

## API / Actions

Server actions are defined in `app/actions/ai.ts`.

### `askFinancialAdvisor`
-   **Purpose**: Generates a response to a user's financial query.
-   **Input**: `query` (string), `contextData` (JSON summary of user's financial data).
-   **Logic**:
    -   Constructs a prompt including the user's name and financial summary.
    -   Instructs the AI to act as a financial advisor for the Indian context (using ₹).
    -   Calls Gemini API and returns the generated text.

### `processAndAnalyzeStatement`
-   **Purpose**: Extracts transactions from uploaded files.
-   **Input**: `FormData` containing a file (PDF or text/CSV).
-   **Logic**:
    1.  **File Processing**:
        -   If PDF: Uses `pdf-parse` to extract raw text.
        -   If CSV/Text: Reads text content directly.
    2.  **AI Extraction**:
        -   Sends the first 30k characters of text to Gemini.
        -   Prompt instructs AI to extract transactions into a specific JSON schema (date, description, amount, category).
    3.  **Output**: Returns the parsed JSON array of transactions.

## UI Components
-   **Page**: `app/dashboard/ai/page.tsx`
-   **Usage**: The chat interface allows sending queries. The statement upload is likely part of an import workflow (implied).

