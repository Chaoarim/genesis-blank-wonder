
CREATE POLICY "Sellers can delete own orders"
ON public.catalog_orders
FOR DELETE
USING (auth.uid() = seller_id);
