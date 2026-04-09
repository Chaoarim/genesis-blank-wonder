
-- Table for supplier catalog items (parts lists from suppliers)
CREATE TABLE public.supplier_catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  produto TEXT NOT NULL,
  aplicacao TEXT,
  fornecedor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_supplier_catalog_user_codigo_forn UNIQUE (user_id, codigo, fornecedor)
);

-- Enable RLS
ALTER TABLE public.supplier_catalog_items ENABLE ROW LEVEL SECURITY;

-- RLS policies using get_admin_user_id() for seller support
CREATE POLICY "Users can view their own supplier catalog items"
  ON public.supplier_catalog_items FOR SELECT TO authenticated
  USING (user_id = public.get_admin_user_id());

CREATE POLICY "Users can insert their own supplier catalog items"
  ON public.supplier_catalog_items FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_admin_user_id());

CREATE POLICY "Users can update their own supplier catalog items"
  ON public.supplier_catalog_items FOR UPDATE TO authenticated
  USING (user_id = public.get_admin_user_id());

CREATE POLICY "Users can delete their own supplier catalog items"
  ON public.supplier_catalog_items FOR DELETE TO authenticated
  USING (user_id = public.get_admin_user_id());

-- Index for faster lookups
CREATE INDEX idx_supplier_catalog_user ON public.supplier_catalog_items (user_id);
CREATE INDEX idx_supplier_catalog_fornecedor ON public.supplier_catalog_items (user_id, fornecedor);
