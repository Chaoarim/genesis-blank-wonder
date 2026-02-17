
-- Create parts table matching CSV structure
CREATE TABLE public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fabricante text NOT NULL,
  codigo_peca text NOT NULL,
  descricao text,
  chave_de_busca text,
  marca_veiculo text,
  modelo_veiculo text,
  anos_aplicacao text,
  contexto_ia text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for fast searching
CREATE INDEX idx_parts_fabricante ON public.parts (fabricante);
CREATE INDEX idx_parts_codigo_peca ON public.parts (codigo_peca);
CREATE INDEX idx_parts_chave_busca ON public.parts USING gin (to_tsvector('portuguese', coalesce(chave_de_busca, '')));
CREATE INDEX idx_parts_modelo ON public.parts (modelo_veiculo);

-- Enable RLS
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read parts
CREATE POLICY "Authenticated users can read parts"
ON public.parts
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert parts"
ON public.parts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update parts"
ON public.parts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete parts"
ON public.parts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
