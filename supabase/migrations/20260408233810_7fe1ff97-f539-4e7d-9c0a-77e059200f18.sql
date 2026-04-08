
CREATE TABLE public.fleet_regional_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year integer NOT NULL,
  month integer,
  region text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'automovel',
  quantity integer NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_regional_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read regional data"
  ON public.fleet_regional_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage regional data"
  ON public.fleet_regional_data
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_fleet_regional_year_region ON public.fleet_regional_data (year, region);
