# Frontend Design Guidelines

## Design Philosophy

The frontend design aims to create a distinctive, production-grade interface that avoids generic "AI" aesthetics. The goal is to build an application that feels crafted, robust, and visually engaging while maintaining high usability for financial tasks.

**Aesthetic Direction**: *Refined Modern Financial*
-   **Tone**: Professional yet approachable, trustworthy, and clear.
-   **Differentiation**: Usage of subtle gradients, high-quality typography, and purposeful motion to elevate the user experience beyond a standard dashboard.

## Core Design Elements

### 1. Typography
-   **Headings**: Bold, characterful fonts for clear hierarchy.
-   **Body**: Clean, legible sans-serif for high readability of data and financial figures.
-   **Numbers**: Monospaced or tabular figures for financial data alignment.

### 2. Color Palette
-   **Primary**: Defined in `tailwind.config.ts` (mapped to CSS variables). Used for primary actions and brand presence.
-   **Backgrounds**: Layered approach using `bg-background`, `bg-card`, and `bg-muted` to create depth.
-   **Accents**: Semantic colors for financial status:
    -   **Green/Emerald**: Income, growth, positive balance.
    -   **Red/Rose**: Expenses, debt, negative trends.
    -   **Gold/Amber**: Wealth, investments, premium features.
-   **Gradients**: Subtle "gold-gradient" and background blurs used to highlight key metrics (e.g., Total Balance card).

### 3. Layout & Composition
-   **Grid System**: Responsive grids (using Tailwind's grid system) that adapt from mobile (1 col) to desktop (3-4 cols).
-   **Spacing**: Generous whitespace (`gap-4`, `p-6`, `p-8`) to prevent information overload.
-   **Cards**: Content is contained in `Card` components with subtle borders and shadows to separate information density.

### 4. Components & UI Primitives

**Shadcn UI** serves as the foundation, customized to fit the design system.

-   **Buttons**:
    -   Primary: Solid color, prominent.
    -   Secondary/Outline: For alternative actions or cancellations.
    -   Ghost: For icon-only actions or non-intrusive controls.
-   **Forms**:
    -   Dialog-based entry: "Add" actions typically open a `Dialog` or `Sheet` to keep context.
    -   Validation: Inline error messages via `FormMessage`.
    -   Inputs: Clean borders with focus rings for accessibility.
-   **Data Visualization**:
    -   Clean charts (implied usage of Recharts or similar) with minimal grid lines and clear tooltips.
    -   Progress bars for budget tracking.

## Interaction Design

-   **Motion**:
    -   **Entry Animations**: `animate-fade-in-up` applied to list items (with staggered delays) for a smooth page load experience.
    -   **Feedback**: Hover states on interactive elements (cards, buttons) to indicate clickability.
    -   **Loading**: Skeleton loaders (`<Skeleton />`) used during data fetching to prevent layout shift.
-   **Responsiveness**:
    -   Mobile-first approach.
    -   Navigation adapts from a Sidebar (Desktop) to a Mobile Menu (Sheet/Drawer).
    -   Tables scroll horizontally on small screens or switch to card views.

## Implementation Guidelines

-   **Tailwind CSS**: Use utility classes for 90% of styling. Use `globals.css` only for base styles and complex animations.
-   **Dark Mode**: First-class support via `next-themes`. All colors use CSS variables (e.g., `bg-primary`, `text-foreground`) to switch seamlessly.
-   **Lucide Icons**: Consistent stroke width and style for all iconography.

## Anti-Patterns to Avoid
-   Generic, flat "bootstrap-like" look.
-   Overwhelming use of vibrant colors; reserve them for data that needs attention.
-   Cluttered interfaces; if a screen has too much data, break it down or use tabs.
-   Inconsistent spacing; stick to the Tailwind spacing scale.

