-- Tabela de pré-cadastros
CREATE TABLE public.pre_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    cpf_cnpj TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(email),
    UNIQUE(cpf_cnpj)
);

-- Habilitar RLS
ALTER TABLE public.pre_registrations ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode se pré-cadastrar (INSERT)
CREATE POLICY "Anyone can pre-register"
ON public.pre_registrations
FOR INSERT
WITH CHECK (true);

-- Apenas admins podem ver todos os pré-cadastros
CREATE POLICY "Admins can view all pre-registrations"
ON public.pre_registrations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem atualizar pré-cadastros (aprovar/rejeitar)
CREATE POLICY "Admins can update pre-registrations"
ON public.pre_registrations
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem deletar pré-cadastros
CREATE POLICY "Admins can delete pre-registrations"
ON public.pre_registrations
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_pre_registrations_updated_at
BEFORE UPDATE ON public.pre_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();