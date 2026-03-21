CREATE TABLE public.supplier_contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    distributor_name TEXT NOT NULL,
    seller_name TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own supplier contacts" 
ON public.supplier_contacts 
FOR ALL 
USING (user_id = public.get_admin_user_id())
WITH CHECK (user_id = public.get_admin_user_id());

CREATE TRIGGER update_supplier_contacts_updated_at
BEFORE UPDATE ON public.supplier_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();