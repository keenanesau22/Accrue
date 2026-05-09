-- Supabase Schema Setup for Accrue Finance
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Run this in the Supabase SQL Editor

-- FIX / MIGRATION: Ensure columns exist and relax constraints for sync
ALTER TABLE IF EXISTS public.accounts ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.accounts ADD COLUMN IF NOT EXISTS plaid_access_token TEXT;
ALTER TABLE IF EXISTS public.accounts ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;
ALTER TABLE IF EXISTS public.accounts ADD COLUMN IF NOT EXISTS institution TEXT;
ALTER TABLE IF EXISTS public.accounts ADD COLUMN IF NOT EXISTS category TEXT;

-- FIX: Rename account_type if it exists or make it nullable
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'account_type') THEN
        ALTER TABLE public.accounts ALTER COLUMN account_type DROP NOT NULL;
    END IF;
END $$;

-- FIX: Ensure items.id is TEXT (not UUID) to support Plaid Item IDs
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'id' AND data_type = 'uuid') THEN
        ALTER TABLE public.items ALTER COLUMN id TYPE TEXT;
    END IF;
END $$;

-- FIX: Ensure unique constraint on accounts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_user_id_account_name_key') THEN
        ALTER TABLE public.accounts ADD CONSTRAINT accounts_user_id_account_name_key UNIQUE (user_id, account_name);
    END IF;
END $$;

-- 1. Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  category TEXT,
  institution TEXT,
  plaid_access_token TEXT,
  plaid_account_id TEXT,
  interest_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, account_name)
);

-- 1.1 Plaid Items Table
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  institution_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile JSONB DEFAULT '{}'::jsonb,
  net_worth JSONB DEFAULT '{"accounts": [], "lastSynced": null}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_transaction_id TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC DEFAULT 0,
  date TEXT,
  name TEXT,
  category TEXT,
  category_primary TEXT,
  category_detailed TEXT,
  merchant TEXT,
  merchant_name TEXT,
  account_id TEXT,
  plaid_account_id TEXT,
  entry_type TEXT,
  is_interest_payment BOOLEAN DEFAULT false,
  categorization TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist if table was already created
DO $$ 
BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant_name TEXT;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_interest_payment BOOLEAN DEFAULT false;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS entry_type TEXT;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category_primary TEXT;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category_detailed TEXT;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS categorization TEXT;
    
    -- Ensure id has a default if we want auto-generation
    ALTER TABLE public.transactions ALTER COLUMN id SET DEFAULT gen_random_uuid();
    
    -- Ensure unique constraint on plaid_transaction_id if it's used for upsert
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_plaid_transaction_id_key') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT transactions_plaid_transaction_id_key UNIQUE (plaid_transaction_id);
    END IF;
END $$;

-- 4. Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  current_actual NUMERIC DEFAULT 0,
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, category)
);

-- Enable RLS for budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Policy for budgets
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own budgets') THEN
        CREATE POLICY "Users can manage own budgets" ON public.budgets ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    -- ACCOUNTS: Universal access for demo/sync
    DROP POLICY IF EXISTS "Users can manage own accounts" ON public.accounts;
    CREATE POLICY "Users can manage own accounts" ON public.accounts 
      FOR ALL TO public 
      USING (true) 
      WITH CHECK (true);

    -- ITEMS: Universal access for demo/sync
    DROP POLICY IF EXISTS "Users can manage own items" ON public.items;
    CREATE POLICY "Users can manage own items" ON public.items 
      FOR ALL TO public 
      USING (true) 
      WITH CHECK (true);

    -- PROFILES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own profile') THEN
        CREATE POLICY "Users can manage own profile" ON public.profiles ALL USING (auth.uid() = id);
    END IF;
    
    -- TRANSACTIONS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own transactions') THEN
        CREATE POLICY "Users can manage own transactions" ON public.transactions ALL USING (auth.uid() = user_id);
    END IF;
END $$;
