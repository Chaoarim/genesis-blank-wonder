ALTER TABLE public.saved_quotes
ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

UPDATE public.saved_quotes
SET created_by_user_id = COALESCE(created_by_user_id, user_id)
WHERE created_by_user_id IS NULL;

ALTER TABLE public.saved_quotes
ALTER COLUMN created_by_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saved_quotes_created_by_user_id
ON public.saved_quotes (created_by_user_id);

DROP POLICY IF EXISTS "Users can manage own saved quotes" ON public.saved_quotes;

CREATE POLICY "Users can view own created quotes"
ON public.saved_quotes
FOR SELECT
TO authenticated
USING (created_by_user_id = auth.uid());

CREATE POLICY "Users can create own quotes"
ON public.saved_quotes
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND user_id = public.get_admin_user_id()
);

CREATE POLICY "Users can update own quotes"
ON public.saved_quotes
FOR UPDATE
TO authenticated
USING (created_by_user_id = auth.uid())
WITH CHECK (
  created_by_user_id = auth.uid()
  AND user_id = public.get_admin_user_id()
);

CREATE POLICY "Users can delete own quotes"
ON public.saved_quotes
FOR DELETE
TO authenticated
USING (created_by_user_id = auth.uid());