
CREATE TABLE public.ml_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ml_user_id BIGINT,
  ml_nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.ml_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ML tokens"
  ON public.ml_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ML tokens"
  ON public.ml_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ML tokens"
  ON public.ml_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ML tokens"
  ON public.ml_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_ml_tokens_updated_at
  BEFORE UPDATE ON public.ml_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
