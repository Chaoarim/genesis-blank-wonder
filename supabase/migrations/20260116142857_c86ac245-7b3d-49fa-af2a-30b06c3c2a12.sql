-- Remover política antiga que exige cpf_cnpj
DROP POLICY IF EXISTS "Anyone can pre-register" ON public.pre_registrations;

-- Criar nova política sem exigir cpf_cnpj
CREATE POLICY "Anyone can pre-register" 
ON public.pre_registrations 
FOR INSERT 
WITH CHECK (
  (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text) 
  AND (length(full_name) >= 2 AND length(full_name) <= 100) 
  AND (length(whatsapp) >= 10 AND length(whatsapp) <= 20)
);