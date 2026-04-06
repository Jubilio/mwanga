-- Security Migration: Passkeys (WebAuthn)

CREATE TABLE IF NOT EXISTS public.passkeys (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key_hash TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    transports VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON public.passkeys(user_id);
