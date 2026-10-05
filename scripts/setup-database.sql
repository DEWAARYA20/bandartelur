-- ============================================
-- BANDAR TELUR - COMPLETE DATABASE SETUP
-- ============================================
-- Script ini untuk setup database baru di Supabase
-- Sudah termasuk:
-- - Semua tabel (8 tabel)
-- - Cabang default (Walkot, Koni, Tombolututu)
-- - Admin user (admin@gmail.com / 12345)
-- - Indexes, Functions, dan Triggers
-- ============================================
-- Copy dan paste seluruh script ini di Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DROP EXISTING TABLES (jika ada)
-- ============================================
DROP TABLE IF EXISTS operational_expenses CASCADE;
DROP TABLE IF EXISTS egg_waste CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS martabak_sales CASCADE;
DROP TABLE IF EXISTS egg_sales CASCADE;
DROP TABLE IF EXISTS egg_stocks CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS cabang CASCADE;
DROP TABLE IF EXISTS cabangs CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Cabang (Branches) table
CREATE TABLE cabang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cabangs alias (untuk kompatibilitas)
CREATE TABLE cabangs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (with access_pages)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'karyawan')),
  cabang_id UUID REFERENCES cabangs(id) ON DELETE SET NULL,
  access_pages TEXT[] DEFAULT ARRAY['dashboard'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Egg Stocks table
CREATE TABLE egg_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cabang_id UUID REFERENCES cabangs(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('kecil', 'sedang', 'besar')),
  rack_count INTEGER NOT NULL,
  eggs_per_rack INTEGER NOT NULL,
  price_per_egg DECIMAL(10, 2) NOT NULL,
  total_eggs INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Egg Sales table
CREATE TABLE egg_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cabang_id UUID REFERENCES cabangs(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('kecil', 'sedang', 'besar')),
  quantity INTEGER NOT NULL,
  price_per_egg DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Martabak Sales table
CREATE TABLE martabak_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cabang_id UUID REFERENCES cabangs(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  eggs_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingredients table
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cabang_id UUID REFERENCES cabangs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Egg Waste table
CREATE TABLE egg_waste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabang_id UUID REFERENCES cabangs(id) ON DELETE SET NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  size TEXT NOT NULL CHECK (size IN ('kecil', 'sedang', 'besar')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operational Expenses table
CREATE TABLE operational_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cabang_id UUID REFERENCES cabangs(id) ON DELETE SET NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Listrik', 'Gaji', 'Sewa', 'Bahan Bakar', 'Lainnya')),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

-- Indexes for cabang
CREATE INDEX idx_cabang_name ON cabang(name);
CREATE INDEX idx_cabangs_name ON cabangs(name);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_cabang_id ON users(cabang_id);

-- Indexes for egg_stocks
CREATE INDEX idx_egg_stocks_user_id ON egg_stocks(user_id);
CREATE INDEX idx_egg_stocks_cabang_id ON egg_stocks(cabang_id);
CREATE INDEX idx_egg_stocks_date ON egg_stocks(date);

-- Indexes for egg_sales
CREATE INDEX idx_egg_sales_user_id ON egg_sales(user_id);
CREATE INDEX idx_egg_sales_cabang_id ON egg_sales(cabang_id);
CREATE INDEX idx_egg_sales_date ON egg_sales(date);

-- Indexes for martabak_sales
CREATE INDEX idx_martabak_sales_user_id ON martabak_sales(user_id);
CREATE INDEX idx_martabak_sales_cabang_id ON martabak_sales(cabang_id);
CREATE INDEX idx_martabak_sales_date ON martabak_sales(date);

-- Indexes for ingredients
CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);
CREATE INDEX idx_ingredients_cabang_id ON ingredients(cabang_id);
CREATE INDEX idx_ingredients_date ON ingredients(date);

-- Indexes for egg_waste
CREATE INDEX idx_egg_waste_cabang_id ON egg_waste(cabang_id);
CREATE INDEX idx_egg_waste_date ON egg_waste(date);

-- Indexes for operational_expenses
CREATE INDEX idx_op_expenses_user_id ON operational_expenses(user_id);
CREATE INDEX idx_op_expenses_cabang_id ON operational_expenses(cabang_id);
CREATE INDEX idx_op_expenses_date ON operational_expenses(date);

-- ============================================
-- 4. CREATE FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_cabang_updated_at BEFORE UPDATE ON cabang
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cabangs_updated_at BEFORE UPDATE ON cabangs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_egg_stocks_updated_at BEFORE UPDATE ON egg_stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_egg_sales_updated_at BEFORE UPDATE ON egg_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_martabak_sales_updated_at BEFORE UPDATE ON martabak_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. INSERT DEFAULT DATA
-- ============================================

-- Insert default cabang
INSERT INTO cabangs (name, description) VALUES
  ('Walkot', 'Cabang Walkot'),
  ('Koni', 'Cabang Koni'),
  ('Tombolututu', 'Cabang Tombolututu');

-- Copy to cabang table for compatibility
INSERT INTO cabang (name, description) VALUES
  ('Walkot', 'Cabang Walkot'),
  ('Koni', 'Cabang Koni'),
  ('Tombolututu', 'Cabang Tombolututu');

-- Insert admin user
-- Email: admin@gmail.com
-- Password: 12345
-- Role: admin
-- Access: All pages
INSERT INTO users (email, password_hash, full_name, role, cabang_id, access_pages)
VALUES (
  'admin@gmail.com',
  '12345',
  'Administrator',
  'admin',
  NULL,
  ARRAY['dashboard', 'egg-sales', 'martabak-sales', 'financial', 'admin', 'profile']
);

-- ============================================
-- 6. DISABLE RLS (Row Level Security)
-- ============================================
-- RLS dinonaktifkan karena menggunakan custom authentication

ALTER TABLE cabang DISABLE ROW LEVEL SECURITY;
ALTER TABLE cabangs DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE egg_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE egg_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE martabak_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE egg_waste DISABLE ROW LEVEL SECURITY;
ALTER TABLE operational_expenses DISABLE ROW LEVEL SECURITY;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Database siap digunakan dengan:
-- 
-- LOGIN ADMIN:
--   Email: admin@gmail.com
--   Password: 12345
--
-- CABANG DEFAULT:
--   - Walkot
--   - Koni
--   - Tombolututu
--
-- TABEL:
--   - cabang / cabangs (branches)
--   - users (pengguna)
--   - egg_stocks (stok telur)
--   - egg_sales (penjualan telur)
--   - martabak_sales (penjualan martabak)
--   - ingredients (bahan baku)
--   - egg_waste (kerusakan telur)
--   - operational_expenses (biaya operasional)
-- ============================================
