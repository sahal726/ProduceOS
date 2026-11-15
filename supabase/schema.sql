-- ==============================================================================
-- SHOP ERP - COMPLETE POSTGRESQL SCHEMA FOR SUPABASE
-- Single-owner agricultural produce trading shop in Kerala, India
-- Quantities stored in numeric(14,3) [kg]
-- Currency stored in numeric(14,2) [INR]
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PRODUCTS TABLE
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  malayalam_name text,
  min_stock_alert_kg numeric(14,3) not null default 50.000,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. DAILY RATES TABLE (Selling rates set daily per product)
create table if not exists daily_rates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  rate_date date not null default current_date,
  selling_rate_per_kg numeric(14,2) not null check (selling_rate_per_kg >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, rate_date)
);

-- 3. FARMERS (Suppliers)
create table if not exists farmers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  place text,
  opening_balance_payable numeric(14,2) not null default 0.00,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. PARTIES (Customers / Buyers)
create table if not exists parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  place text,
  opening_balance_receivable numeric(14,2) not null default 0.00,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. PURCHASES (Buying produce from farmers)
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  farmer_id uuid not null references farmers(id) on delete restrict,
  farmer_name text not null,
  total_amount numeric(14,2) not null default 0.00,
  paid_amount numeric(14,2) not null default 0.00,
  payment_mode text not null default 'cash' check (payment_mode in ('cash', 'bank')),
  balance_payable numeric(14,2) not null default 0.00,
  notes text,
  is_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. PURCHASE ITEMS
create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_name text not null,
  quantity_kg numeric(14,3) not null check (quantity_kg > 0),
  rate_per_kg numeric(14,2) not null check (rate_per_kg >= 0),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  input_unit text default 'kg' check (input_unit in ('kg', 'quintal')),
  input_quantity numeric(14,3),
  created_at timestamptz not null default now()
);

-- 7. SALES (Selling produce in bulk to parties)
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  party_id uuid not null references parties(id) on delete restrict,
  party_name text not null,
  total_amount numeric(14,2) not null default 0.00,
  received_amount numeric(14,2) not null default 0.00,
  payment_mode text not null default 'bank' check (payment_mode in ('cash', 'bank')),
  balance_receivable numeric(14,2) not null default 0.00,
  total_cogs numeric(14,2) not null default 0.00,
  notes text,
  is_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. SALE ITEMS
create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_name text not null,
  quantity_kg numeric(14,3) not null check (quantity_kg > 0),
  selling_rate_per_kg numeric(14,2) not null check (selling_rate_per_kg >= 0),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  cost_rate_per_kg numeric(14,2) not null default 0.00,
  cogs_amount numeric(14,2) not null default 0.00,
  input_unit text default 'quintal' check (input_unit in ('kg', 'quintal')),
  input_quantity numeric(14,3),
  shop_weight_kg numeric(14,3),
  party_weight_kg numeric(14,3),
  weight_diff_kg numeric(14,3),
  created_at timestamptz not null default now()
);

-- 9. PAYMENTS (Money in from parties or money out to farmers)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  direction text not null check (direction in ('in', 'out')),
  entity_type text not null check (entity_type in ('party', 'farmer')),
  entity_id uuid not null,
  entity_name text not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_mode text not null default 'cash' check (payment_mode in ('cash', 'bank')),
  notes text,
  sale_id uuid references sales(id) on delete set null,
  purchase_id uuid references purchases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. EXPENSE CATEGORIES
create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- 11. EXPENSES
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  category_id uuid not null references expense_categories(id) on delete restrict,
  category_name text not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_mode text not null default 'cash' check (payment_mode in ('cash', 'bank')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 12. WEIGHT LOSS / SHRINKAGE TRACKING
create table if not exists weight_losses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  product_id uuid not null references products(id) on delete restrict,
  product_name text not null,
  quantity_lost_kg numeric(14,3) not null check (quantity_lost_kg > 0),
  reason text not null check (reason in ('Drying', 'Shrinkage', 'Wastage', 'Spillage', 'Other')),
  cost_rate_per_kg numeric(14,2) not null default 0.00,
  total_loss_value numeric(14,2) not null default 0.00,
  sale_id uuid references sales(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 13. STOCK ADJUSTMENTS
create table if not exists stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  product_id uuid not null references products(id) on delete restrict,
  adjustment_kg numeric(14,3) not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- 14. SETTINGS
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  shop_name text not null default 'Shop ERP - Produce Trading',
  owner_name text not null default 'Shop Owner',
  phone text default '+91 98470 12345',
  address text default 'Kerala, India',
  opening_cash_balance numeric(14,2) not null default 25000.00,
  opening_bank_balance numeric(14,2) not null default 150000.00,
  pin_code text not null default '1234',
  updated_at timestamptz not null default now()
);

-- INDEXES for fast lookup and date queries
create index if not exists idx_purchases_date on purchases(date desc);
create index if not exists idx_purchases_farmer on purchases(farmer_id);
create index if not exists idx_sales_date on sales(date desc);
create index if not exists idx_sales_party on sales(party_id);
create index if not exists idx_payments_date on payments(date desc);
create index if not exists idx_payments_entity on payments(entity_id);
create index if not exists idx_expenses_date on expenses(date desc);
create index if not exists idx_weight_losses_date on weight_losses(date desc);
create index if not exists idx_daily_rates_product_date on daily_rates(product_id, rate_date);

-- PRE-SEED PRODUCTS (10 exact Malayalam names written in English letters)
insert into products (name, min_stock_alert_kg) values
  ('Coconut', 500.000),
  ('Kotta Adakka', 100.000),
  ('Kora', 100.000),
  ('Poukka', 100.000),
  ('Koka', 50.000),
  ('Kurumulak', 30.000),
  ('Jaathi', 25.000),
  ('Jaathi Pathri', 10.000),
  ('Kashu Andi', 100.000),
  ('Kili Adakka', 50.000)
on conflict (name) do nothing;

-- PRE-SEED EXPENSE CATEGORIES
insert into expense_categories (name, is_default) values
  ('Salary', true),
  ('Kuri', true),
  ('Rent', true),
  ('EMI', true),
  ('Transport', true),
  ('Labour', true),
  ('Electricity', true),
  ('Other', true)
on conflict (name) do nothing;

-- INITIAL SETTINGS
insert into settings (id, shop_name, owner_name, opening_cash_balance, opening_bank_balance, pin_code)
values (1, 'Shop ERP', 'Produce Owner', 25000.00, 150000.00, '1234')
on conflict (id) do nothing;
