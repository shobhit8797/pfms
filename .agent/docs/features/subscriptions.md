# Subscriptions Feature

## Description
The Subscriptions feature manages recurring payments for services (e.g., Netflix, Spotify, Gym). It tracks billing cycles, amounts, and renewal dates, helping users identify unused subscriptions and manage recurring costs.

## Key Capabilities
-   **Track Subscriptions**: Add details for recurring services including billing cycle (Monthly, Yearly) and next billing date.
-   **Reminders**: Stores reminder preferences (e.g., remind 1 or 3 days before).
-   **Auto-Renewal Status**: Track whether a subscription auto-renews.
-   **Cancel Subscription**: Mark subscriptions as inactive/cancelled.

## Data Model

The `Subscription` model manages recurring service data.

```prisma
model Subscription {
  id              String    @id @default(cuid())
  userId          String
  serviceName     String
  amount          Decimal
  billingCycle    Frequency
  startDate       DateTime
  endDate         DateTime?
  nextBillingDate DateTime
  autoRenewal     Boolean   @default(true)
  reminderDays    Int[]     // Stored as array of integers
  category        String
  paymentMethod   String
  creditCardId    String?
  isActive        Boolean   @default(true)
  notes           String?   @db.Text
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  creditCard CreditCard? @relation(fields: [creditCardId], references: [id])
}
```

## API / Actions

Server actions are defined in `app/actions/subscription.ts`.

### `createSubscription`
-   **Purpose**: Adds a new subscription.
-   **Input**: `FormData`.
-   **Logic**:
    -   Validates input.
    -   Sets default reminder days (1 and 3 days before).
    -   Creates the `Subscription` record.
    -   Revalidates the subscriptions page.

### `getSubscriptions`
-   **Purpose**: Retrieves active subscriptions.
-   **Output**: List of active subscriptions ordered by the next billing date (ascending).

### `cancelSubscription`
-   **Purpose**: Marks a subscription as inactive.
-   **Input**: `id` (string).
-   **Logic**: Updates `isActive` to `false`.

## UI Components
-   **Page**: `app/dashboard/subscriptions/page.tsx`
-   **Components**:
    -   `components/subscriptions/add-subscription-dialog.tsx`: Form for adding subscriptions.

