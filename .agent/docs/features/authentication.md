# Authentication Feature

## Description
The Authentication feature secures the application, ensuring users can only access their own financial data. It uses `next-auth` (v5) for handling sessions and credential management.

## Key Capabilities
-   **Sign Up**: User registration with email and password.
-   **Sign In**: secure login using credentials (email/password).
-   **Session Management**: JWT-based sessions with database persistence for user data.
-   **Data Protection**: All application data queries are scoped to the authenticated `userId`.

## Data Model

The authentication models are standard NextAuth Prisma adapter models with custom relations.

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?   // For Credentials provider
  accounts      Account[]
  sessions      Session[]
  
  // App specific relations (bankAccounts, investments, etc.)
}

model Account { ... } // OAuth accounts (if added later)
model Session { ... } // Database sessions
```

## Configuration

Auth configuration is located in `auth.ts`.

-   **Adapter**: `PrismaAdapter` (connects NextAuth to the Postgres database).
-   **Strategy**: `jwt` (JSON Web Tokens).
-   **Providers**:
    -   `Credentials`: Custom provider using Zod for validation and `bcryptjs` for password verification (though `bcrypt.compare` usage is noted as a requirement for production).
-   **Callbacks**:
    -   `jwt`: Adds user ID to the token.
    -   `session`: Populates `session.user.id` from the token, ensuring the user ID is available throughout the app.

## Security Practices
-   **Password Hashing**: (Implied/Required) Passwords should be hashed before storage (handled in `register.ts` action, not shown here but standard practice).
-   **Authorization Checks**: All server actions check `session.user.id` before performing operations.
-   **Route Protection**: (Implied) Middleware or layout checks to redirect unauthenticated users to login.

## UI Components
-   **Pages**:
    -   `app/login/page.tsx`: Login form.
    -   `app/register/page.tsx`: Registration form.

