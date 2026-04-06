-- Gamification and Multi-Member (Household Invites) Migration

-- 1. Household Invites Table
CREATE TABLE IF NOT EXISTS public.household_invites (
    id SERIAL PRIMARY KEY,
    household_id INT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_by INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours'),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Badges Table (The catalog of achievements)
CREATE TABLE IF NOT EXISTS public.badges (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    level INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User Badges Table (When a user unlocks a badge)
CREATE TABLE IF NOT EXISTS public.user_badges (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id INT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- 4. Insert Default Badges Seed Data
-- Doing UPSERT to avoid crashing if run multiple times
INSERT INTO public.badges (slug, name, description, icon, level) VALUES
('fiel-mordomo-1', 'Fiel Mordomo Nível 1', 'Atingiste 50% de uma meta de poupança.', '⭐', 1),
('fiel-mordomo-2', 'Fiel Mordomo Nível 2', 'Atingiste 100% da tua primeira meta de poupança.', '🌟', 2),
('fiel-mordomo-3', 'Fiel Mordomo Nível 3', 'Mantiveste as contas em dia por 3 meses seguidos.', '🏆', 3),
('comunidade-1', 'Espírito de Partilha', 'Juntaste-te ou criaste um Xitique ativo.', '🤝', 1),
('sabio-gestor-1', 'Sábio Gestor', 'Terminaste o mês com excedente maior que 20%.', '🦉', 1),
('primeiros-passos', 'Primeiros Passos', 'Criaste a tua conta e completaste o perfil.', '🌱', 1)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description, 
    icon = EXCLUDED.icon,
    level = EXCLUDED.level;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_household_invites_code ON public.household_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
