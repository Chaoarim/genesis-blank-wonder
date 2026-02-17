-- Criar tabela para produtos de comparação de preços
CREATE TABLE public.price_comparison_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    local TEXT NOT NULL,
    codigo TEXT NOT NULL,
    marca TEXT NOT NULL,
    descricao TEXT NOT NULL,
    qtde INTEGER NOT NULL DEFAULT 1,
    preco_sama DECIMAL(10,2),
    preco_real DECIMAL(10,2),
    preco_dpk DECIMAL(10,2),
    roles_dpk TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.price_comparison_products ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar
CREATE POLICY "Admins can view all products"
ON public.price_comparison_products
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert products"
ON public.price_comparison_products
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update products"
ON public.price_comparison_products
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete products"
ON public.price_comparison_products
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_price_comparison_products_updated_at
BEFORE UPDATE ON public.price_comparison_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();