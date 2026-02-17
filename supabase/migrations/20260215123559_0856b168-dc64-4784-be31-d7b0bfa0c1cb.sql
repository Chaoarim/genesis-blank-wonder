
-- Table for popular cars
CREATE TABLE public.popular_cars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table linking popular cars to parts
CREATE TABLE public.popular_car_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID NOT NULL REFERENCES public.popular_cars(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(car_id, part_id)
);

-- Enable RLS
ALTER TABLE public.popular_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popular_car_parts ENABLE ROW LEVEL SECURITY;

-- Everyone can read popular cars and their parts
CREATE POLICY "Popular cars are viewable by everyone" ON public.popular_cars FOR SELECT USING (true);
CREATE POLICY "Popular car parts are viewable by everyone" ON public.popular_car_parts FOR SELECT USING (true);

-- Only admins can manage popular cars
CREATE POLICY "Admins can manage popular cars" ON public.popular_cars FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage popular car parts" ON public.popular_car_parts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
