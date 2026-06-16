CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount integer NOT NULL,
  stripe_payment_intent_id text UNIQUE NOT NULL,
  status text NOT NULL CHECK (status IN ('succeeded', 'failed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Users select only their own rows (policy per spec; in practice service role handles all writes)
CREATE POLICY "users_read_own_donations"
  ON public.donations
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- No INSERT/UPDATE policy for anon or authenticated roles.
-- Service role bypasses RLS automatically.
-- GRANT usage so API can see the table
GRANT SELECT ON public.donations TO authenticated;
