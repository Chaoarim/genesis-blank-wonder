-- Tornar CPF/CNPJ opcional (campo não é mais coletado)
ALTER TABLE public.pre_registrations
  ALTER COLUMN cpf_cnpj DROP NOT NULL;

-- Remover unicidade de CPF/CNPJ para evitar bloqueio de novos pré-cadastros
ALTER TABLE public.pre_registrations
  DROP CONSTRAINT IF EXISTS pre_registrations_cpf_cnpj_key;

-- Normalizar valores vazios existentes
UPDATE public.pre_registrations
SET cpf_cnpj = NULL
WHERE cpf_cnpj IS NOT NULL AND btrim(cpf_cnpj) = '';
