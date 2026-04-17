-- Tabela de códigos de acesso
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  auth_user_id uuid,
  recovery_email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  last_login_at timestamptz,
  revoked_at timestamptz,
  created_by uuid
);

CREATE INDEX idx_access_codes_code ON public.access_codes(code);
CREATE INDEX idx_access_codes_status ON public.access_codes(status);
CREATE INDEX idx_access_codes_auth_user ON public.access_codes(auth_user_id);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Apenas admins gerenciam códigos
CREATE POLICY "Admins can view all access codes"
ON public.access_codes FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert access codes"
ON public.access_codes FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update access codes"
ON public.access_codes FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete access codes"
ON public.access_codes FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Função: gera código único no formato XXXX-XXXX-XXXX (caracteres seguros)
CREATE OR REPLACE FUNCTION public.generate_unique_access_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  attempt int := 0;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..12 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars))::int + 1, 1);
      IF i = 4 OR i = 8 THEN
        new_code := new_code || '-';
      END IF;
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.access_codes WHERE code = new_code);
    attempt := attempt + 1;
    IF attempt > 20 THEN
      RAISE EXCEPTION 'Could not generate unique code';
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$;