-- ============================================================
-- BudgetApp - Schéma Supabase
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- Extension UUID (normalement déjà activée sur Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE : categories (partagée, pas de RLS nécessaire)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT '#9CA3AF'
);

-- Catégories par défaut
INSERT INTO categories (name, type, icon, color) VALUES
  ('Salaire', 'income', '💰', '#10B981'),
  ('Freelance', 'income', '💼', '#059669'),
  ('Investissements', 'income', '📈', '#34D399'),
  ('Autres revenus', 'income', '🎁', '#6EE7B7'),
  ('Loyer / Logement', 'expense', '🏠', '#EF4444'),
  ('Alimentation', 'expense', '🛒', '#F97316'),
  ('Transport', 'expense', '🚗', '#3B82F6'),
  ('Santé', 'expense', '🏥', '#EC4899'),
  ('Loisirs', 'expense', '🎮', '#8B5CF6'),
  ('Vêtements', 'expense', '👕', '#F59E0B'),
  ('Abonnements', 'expense', '📱', '#6366F1'),
  ('Épargne', 'expense', '🏦', '#14B8A6'),
  ('Restaurants', 'expense', '🍽️', '#F87171'),
  ('Éducation', 'expense', '📚', '#60A5FA'),
  ('Autres dépenses', 'expense', '📦', '#9CA3AF')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLE : transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id INTEGER REFERENCES categories(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activer Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : chaque utilisateur ne voit que ses propres transactions
CREATE POLICY "Voir ses transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Créer ses transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modifier ses transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Supprimer ses transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions (user_id, transaction_date DESC);

-- ============================================================
-- TABLE : budget_goals
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id INTEGER REFERENCES categories(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, category_id, month, year)
);

-- Activer Row Level Security
ALTER TABLE budget_goals ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Voir ses objectifs" ON budget_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Créer ses objectifs" ON budget_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modifier ses objectifs" ON budget_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Supprimer ses objectifs" ON budget_goals
  FOR DELETE USING (auth.uid() = user_id);
