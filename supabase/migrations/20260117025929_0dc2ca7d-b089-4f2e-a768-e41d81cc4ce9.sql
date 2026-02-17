-- Adicionar coluna de senha hash na tabela pre_registrations
ALTER TABLE public.pre_registrations 
ADD COLUMN password_hash TEXT;