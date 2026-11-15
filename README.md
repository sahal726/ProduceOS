# Shop ERP - Agricultural Produce Trading (Kerala, India)

**Shop ERP** is a mobile-first, iOS-friendly installable PWA designed specifically for a single-owner agricultural produce trading shop in Kerala, India. The owner buys produce in small lots from numerous local farmers and sells in bulk to outside parties and exporters.

---

## 📱 Features & Highlights

- **Mobile-First iOS PWA**:
  - Designed for 390px iPhone viewport width.
  - Large touch targets (min 44px) & decimal keypad (`inputmode="decimal"`).
  - Standalone PWA mode with `manifest.json`, service worker, high-resolution icons (192, 512, apple-touch-icon).
  - iOS safe-area insets (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`) and `overscroll-behavior-y: none` to eliminate pull-to-refresh reload glitches.
  - iOS Add-to-Home-Screen prompt banner.

- **Pre-Seeded Kerala Agricultural Products (Malayalam Names)**:
  1. `Coconut`
  2. `Kotta Adakka`
  3. `Kora`
  4. `Poukka`
  5. `Koka`
  6. `Kurumulak`
  7. `Jaathi`
  8. `Jaathi Pathri`
  9. `Kashu Andi`
  10. `Kili Adakka`
  *(Owner can also add, edit, or deactivate products at any time)*

- **Quintal & KG Support**:
  - Internal storage is standard **KG** (`numeric(14,3)`).
  - Seamless toggle between **KG** and **Quintal** (`1 quintal = 100 kg`) on every input.
  - Live equivalent conversion preview (e.g., `520 kg (5.2 qtl)`).

- **Weighted Average Cost (WAC) & COGS**:
  - Each purchase dynamically recalculates average cost:
    $$\text{new\_avg} = \frac{\text{existing\_stock\_value} + \text{new\_purchase\_value}}{\text{existing\_qty} + \text{new\_qty}}$$
  - Sales deduct stock and accurately record Cost of Goods Sold (COGS).
  - Insufficient stock warnings with manual override option.

- **Module 1: Purchases (Farmer Buying)**:
  - High-speed entry optimized for 100+ daily small purchases.
  - Remembers last used product for minimal taps.
  - Searchable farmer selector with "+ Add New Farmer" inline modal.
  - "Save & Add Next" rapid button.
  - Supports partial payment or credit (Payable balance auto-computed).

- **Module 2: Farmer Ledger**:
  - Running payable statement.
  - Filter for "Has Balance".
  - Make Payment modal on any day (Cash / Bank UPI).

- **Module 3: Sales (Party Bulk Selling)**:
  - "Today's Selling Rates" settings (owner sets standard daily rate per product).
  - Sale lines default to today's rate with manual override support.
  - Optional weigh-in vs. weigh-out difference auto-deducted as shrinkage loss.
  - Receivable balance auto-computed.

- **Module 4: Party Ledger**:
  - Running receivable statement.
  - "Receive Payment" modal on any day (Cash / Bank UPI).
  - WhatsApp statement generator (`wa.me` instant link).
  - Export statement as PDF via jsPDF.

- **Module 5: Stock & Weight Difference**:
  - Current stock in kg and quintals with stock valuation.
  - Record Weight Difference for Drying, Shrinkage, Wastage, Spillage.
  - Shrinkage value calculated as $\text{quantity lost} \times \text{WAC}$.
  - Low-stock threshold indicator.

- **Module 6: Expenses**:
  - Pre-seeded categories: `Salary`, `Kuri`, `Rent`, `EMI`, `Transport`, `Labour`, `Electricity`, `Other`.
  - Add custom expense categories.
  - Track Cash vs. Bank expenses.
  - Cash expenses directly reduce Cash in Hand.

- **Module 7: Profit Reports**:
  - **Daily Profit** (excludes expenses):
    $$\text{Daily Profit} = \text{Sales Revenue} - \text{COGS} - \text{Shrinkage Loss}$$
    Item-wise profit breakdown per kg and per product.
  - **Monthly Net Profit** (includes expenses):
    $$\text{Monthly Net Profit} = \text{Sales} - \text{COGS} - \text{Shrinkage Loss} - \text{Total Expenses}$$
    Expenses grouped by category with previous month comparison.
  - Export reports to **PDF** and **CSV**.

- **Module 8: Cash Book**:
  - Daily cash movements, Cash in Hand, and Bank/UPI balance.
  - Configurable opening balances.

- **Module 9: Dashboard**:
  - 4 large top cards: Cash in Hand, Bank/UPI, To Receive, To Pay.
  - Quick action buttons (Buy, Sell, Receive, Pay, Expense).
  - Today's purchases, sales, and daily profit.
  - Stock summary and Top 5 dues for parties and farmers.

- **Single Owner Auth / PIN Lock**:
  - Quick 4-digit PIN unlock screen (default: `1234`).
  - Change PIN in Settings.
  - Instant one-tap lock button in the header.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Calculation Tests
Unit tests verify kg/quintal conversions, weighted average cost, ledger balances, daily vs monthly profit, and cash book:
```bash
npm test
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your mobile browser or emulator (390px width).

---

## 🗄️ Supabase PostgreSQL Setup

The app is offline-first and comes pre-loaded with rich demo data so it works immediately out of the box.

To connect your own cloud Supabase database:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Copy and run the entire SQL migration script from `supabase/schema.sql`.
4. Copy your project URL and Anon key into `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Restart the server or redeploy on Vercel.

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"New Project"**.
3. Import the repository.
4. Add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` (optional)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional)
5. Click **"Deploy"**.
