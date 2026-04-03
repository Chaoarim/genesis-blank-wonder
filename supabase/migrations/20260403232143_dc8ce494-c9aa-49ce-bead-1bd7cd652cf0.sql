
CREATE TABLE public.fleet_rankings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year integer NOT NULL,
  position integer NOT NULL,
  model text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  vehicle_type text NOT NULL DEFAULT 'automovel',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_fleet_rankings_year ON public.fleet_rankings (year);
CREATE INDEX idx_fleet_rankings_model ON public.fleet_rankings (model);
CREATE UNIQUE INDEX idx_fleet_rankings_unique ON public.fleet_rankings (year, position, vehicle_type);

ALTER TABLE public.fleet_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fleet rankings"
ON public.fleet_rankings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read fleet rankings"
ON public.fleet_rankings
FOR SELECT
TO authenticated
USING (true);
