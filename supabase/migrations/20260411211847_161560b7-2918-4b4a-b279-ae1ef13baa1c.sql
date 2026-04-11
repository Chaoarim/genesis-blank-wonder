DO $$
DECLARE
  v_year INT;
  v_month INT;
  v_region TEXT;
  v_vtype TEXT;
  v_base_auto INT;
  v_base_cl INT;
  v_base INT;
  v_pct NUMERIC;
  v_qty INT;
  v_mf NUMERIC;
  v_years INT[] := ARRAY[2010,2011,2012,2013,2014,2015,2018,2019,2020,2021,2022,2023,2024,2025];
  v_regions TEXT[] := ARRAY['Sudeste','Sul','Nordeste','Centro-Oeste','Norte'];
  v_vtypes TEXT[] := ARRAY['automovel','comercial_leve','automovel_comercial_leve'];
  v_month_factors NUMERIC[] := ARRAY[0.88,0.85,1.02,0.95,0.98,0.96,1.00,1.02,0.99,1.04,1.01,1.08];
BEGIN
  FOREACH v_year IN ARRAY v_years LOOP
    -- Base monthly volumes by year
    v_base_auto := CASE v_year
      WHEN 2010 THEN 260000 WHEN 2011 THEN 275000 WHEN 2012 THEN 290000
      WHEN 2013 THEN 295000 WHEN 2014 THEN 270000 WHEN 2015 THEN 210000
      WHEN 2018 THEN 195000 WHEN 2019 THEN 210000 WHEN 2020 THEN 155000
      WHEN 2021 THEN 170000 WHEN 2022 THEN 175000 WHEN 2023 THEN 180000
      WHEN 2024 THEN 185000 WHEN 2025 THEN 190000
    END;
    v_base_cl := CASE v_year
      WHEN 2010 THEN 28000 WHEN 2011 THEN 30000 WHEN 2012 THEN 32000
      WHEN 2013 THEN 33000 WHEN 2014 THEN 31000 WHEN 2015 THEN 24000
      WHEN 2018 THEN 30000 WHEN 2019 THEN 28000 WHEN 2020 THEN 25000
      WHEN 2021 THEN 27000 WHEN 2022 THEN 29000 WHEN 2023 THEN 30000
      WHEN 2024 THEN 31000 WHEN 2025 THEN 32000
    END;
    
    FOR v_month IN 1..12 LOOP
      v_mf := v_month_factors[v_month];
      
      FOREACH v_vtype IN ARRAY v_vtypes LOOP
        IF v_vtype = 'automovel' THEN v_base := v_base_auto;
        ELSIF v_vtype = 'comercial_leve' THEN v_base := v_base_cl;
        ELSE v_base := v_base_auto + v_base_cl;
        END IF;
        
        FOREACH v_region IN ARRAY v_regions LOOP
          v_pct := CASE 
            WHEN v_vtype = 'automovel' THEN
              CASE v_region WHEN 'Sudeste' THEN 48.5 WHEN 'Sul' THEN 16.4 WHEN 'Nordeste' THEN 14.8 WHEN 'Centro-Oeste' THEN 11.6 ELSE 8.7 END
            WHEN v_vtype = 'comercial_leve' THEN
              CASE v_region WHEN 'Sudeste' THEN 46.2 WHEN 'Sul' THEN 19.1 WHEN 'Nordeste' THEN 13.2 WHEN 'Centro-Oeste' THEN 14.0 ELSE 7.5 END
            ELSE
              CASE v_region WHEN 'Sudeste' THEN 48.0 WHEN 'Sul' THEN 17.0 WHEN 'Nordeste' THEN 14.5 WHEN 'Centro-Oeste' THEN 12.1 ELSE 8.4 END
          END;
          
          v_qty := ROUND(v_base * v_mf * v_pct / 100);
          
          INSERT INTO fleet_regional_data (year, month, region, vehicle_type, quantity, percentage)
          VALUES (v_year, v_month, v_region, v_vtype, v_qty, v_pct);
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;