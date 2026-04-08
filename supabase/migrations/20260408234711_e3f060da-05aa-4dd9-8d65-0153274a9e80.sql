
DELETE FROM public.fleet_regional_data WHERE year = 2016;

INSERT INTO public.fleet_regional_data (year, region, vehicle_type, quantity, percentage) VALUES
(2016, 'Norte', 'automovel', 0, 4.16),
(2016, 'Nordeste', 'automovel', 0, 13.98),
(2016, 'Centro-Oeste', 'automovel', 0, 8.66),
(2016, 'Sudeste', 'automovel', 0, 52.40),
(2016, 'Sul', 'automovel', 0, 18.79),
(2016, 'Norte', 'comercial_leve', 0, 8.37),
(2016, 'Nordeste', 'comercial_leve', 0, 17.32),
(2016, 'Centro-Oeste', 'comercial_leve', 0, 12.64),
(2016, 'Sudeste', 'comercial_leve', 0, 40.43),
(2016, 'Sul', 'comercial_leve', 0, 21.23);
