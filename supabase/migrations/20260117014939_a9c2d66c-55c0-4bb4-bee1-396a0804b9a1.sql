-- Adicionar coluna de observações na tabela user_subscriptions
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.user_subscriptions.notes IS 'Observações do administrador sobre o pagamento/usuário';