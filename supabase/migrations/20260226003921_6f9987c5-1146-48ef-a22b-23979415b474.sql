
-- Table to store global markup percentages per user
CREATE TABLE public.markup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  markup_distribuidor numeric NOT NULL DEFAULT 0,
  markup_revenda numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.markup_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own markup" ON public.markup_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own markup" ON public.markup_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own markup" ON public.markup_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_markup_settings_updated_at
  BEFORE UPDATE ON public.markup_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
