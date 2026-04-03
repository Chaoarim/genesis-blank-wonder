
-- Remove Realtime publication from sales and catalog_orders
-- Use DO block to handle case where tables may not be in publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.sales;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'sales not in publication, skipping';
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.catalog_orders;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'catalog_orders not in publication, skipping';
  END;
END $$;
