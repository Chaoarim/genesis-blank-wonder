
-- Insert combined "automovel_comercial_leve" data for 2009
-- Using average of automovel and comercial_leve percentages per month/region
INSERT INTO fleet_regional_data (year, month, region, vehicle_type, quantity, percentage)
SELECT 
  a.year,
  a.month,
  a.region,
  'automovel_comercial_leve' as vehicle_type,
  0 as quantity,
  ROUND(((a.percentage + c.percentage) / 2)::numeric, 2) as percentage
FROM fleet_regional_data a
JOIN fleet_regional_data c 
  ON a.year = c.year 
  AND a.month = c.month 
  AND a.region = c.region 
  AND c.vehicle_type = 'comercial_leve'
WHERE a.year = 2009 
  AND a.vehicle_type = 'automovel'
  AND NOT EXISTS (
    SELECT 1 FROM fleet_regional_data x 
    WHERE x.year = 2009 
      AND x.vehicle_type = 'automovel_comercial_leve'
      AND x.month = a.month 
      AND x.region = a.region
  );
