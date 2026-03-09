
CREATE OR REPLACE FUNCTION public.auto_create_sale_from_catalog_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_seller_auth_id uuid;
  v_seller_name text;
  v_customer_row record;
  v_sale_id uuid;
  v_item jsonb;
BEGIN
  -- Try to find customer and their official seller
  IF NEW.customer_id IS NOT NULL THEN
    SELECT c.id, c.seller_auth_id, c.name
    INTO v_customer_row
    FROM public.customers c
    WHERE c.id = NEW.customer_id
    LIMIT 1;

    IF v_customer_row IS NOT NULL AND v_customer_row.seller_auth_id IS NOT NULL THEN
      v_seller_auth_id := v_customer_row.seller_auth_id;
      -- Get seller name
      SELECT su.name INTO v_seller_name
      FROM public.seller_users su
      WHERE su.seller_auth_id = v_seller_auth_id AND su.is_active = true
      LIMIT 1;
    END IF;
  END IF;

  -- If no official seller found, also try matching by phone
  IF v_seller_auth_id IS NULL THEN
    SELECT c.seller_auth_id INTO v_seller_auth_id
    FROM public.customers c
    WHERE c.user_id = NEW.seller_id
      AND c.phone = NEW.customer_phone
      AND c.seller_auth_id IS NOT NULL
    LIMIT 1;

    IF v_seller_auth_id IS NOT NULL THEN
      SELECT su.name INTO v_seller_name
      FROM public.seller_users su
      WHERE su.seller_auth_id = v_seller_auth_id AND su.is_active = true
      LIMIT 1;
    END IF;
  END IF;

  -- Create the sale record
  INSERT INTO public.sales (
    user_id, customer_name, customer_id, channel, delivery_type,
    payment_method, status, total, discount, notes,
    seller_auth_id, seller_name
  ) VALUES (
    NEW.seller_id,
    NEW.customer_name,
    NEW.customer_id,
    'catalogo_b2b',
    'retirada',
    'a_combinar',
    'completed',
    NEW.total,
    0,
    'Venda gerada automaticamente via Catálogo B2B',
    v_seller_auth_id,
    v_seller_name
  )
  RETURNING id INTO v_sale_id;

  -- Create sale items from order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    INSERT INTO public.sale_items (
      sale_id, user_id, codigo, produto, fornecedor, quantidade, preco_unitario
    ) VALUES (
      v_sale_id,
      NEW.seller_id,
      COALESCE(v_item->>'codigo', ''),
      COALESCE(v_item->>'produto', ''),
      v_item->>'fornecedor',
      COALESCE((v_item->>'quantidade')::int, 1),
      COALESCE((v_item->>'preco')::numeric, 0)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on catalog_orders
CREATE TRIGGER trg_auto_sale_on_catalog_order
  AFTER INSERT ON public.catalog_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_sale_from_catalog_order();
