-- 1. Adicionar colunas de convite na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Atualizar profiles existentes para status 'active'
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_invite_token ON public.profiles(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON public.profiles(invited_by);

-- 4. Adicionar RLS policies para admins gerenciarem usuários
DROP POLICY IF EXISTS "Admins can insert profiles (invites)" ON public.profiles;
CREATE POLICY "Admins can insert profiles (invites)"
  ON public.profiles FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- 5. Criar função para verificar token de convite (bypass RLS para acesso público)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(token_value TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  role_name TEXT,
  invite_expires_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.email,
    r.name as role_name,
    p.invite_expires_at,
    p.status
  FROM public.profiles p
  LEFT JOIN public.roles r ON p.role_id = r.id
  WHERE p.invite_token = token_value
    AND p.status = 'pending'
    AND p.invite_expires_at > NOW()
  LIMIT 1
$$;

-- 6. Função para aceitar convite (atualiza profile após criação do auth user)
CREATE OR REPLACE FUNCTION public.accept_invite(
  token_value TEXT,
  auth_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Buscar o convite válido
  SELECT * INTO invite_record
  FROM public.profiles
  WHERE invite_token = token_value
    AND status = 'pending'
    AND invite_expires_at > NOW();
  
  IF invite_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Atualizar o profile com o ID do auth user
  UPDATE public.profiles SET
    id = auth_user_id,
    status = 'active',
    is_active = true,
    invite_accepted_at = NOW(),
    invite_token = NULL
  WHERE invite_token = token_value;
  
  RETURN TRUE;
END;
$$;