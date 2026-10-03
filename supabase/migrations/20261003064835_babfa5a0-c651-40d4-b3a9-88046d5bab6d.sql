CREATE TABLE public.players (
  username text PRIMARY KEY,
  user_id uuid UNIQUE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own player" ON public.players FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  amount bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
GRANT SELECT ON public.verifications TO authenticated;
GRANT ALL ON public.verifications TO service_role;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own verifications" ON public.verifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL REFERENCES public.players(username),
  amount bigint NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL REFERENCES public.players(username),
  amount bigint NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE public.bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL REFERENCES public.players(username),
  game text NOT NULL,
  wager bigint NOT NULL,
  payout bigint NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mines_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL REFERENCES public.players(username),
  wager bigint NOT NULL,
  mines int NOT NULL,
  bombs int[] NOT NULL,
  revealed int[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.deposits, public.withdrawals, public.bets TO authenticated;
GRANT ALL ON public.deposits, public.withdrawals, public.bets, public.mines_games TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mines_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deposits" ON public.deposits FOR SELECT TO authenticated USING (username IN (SELECT username FROM public.players WHERE user_id = auth.uid()));
CREATE POLICY "own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (username IN (SELECT username FROM public.players WHERE user_id = auth.uid()));
CREATE POLICY "own bets" ON public.bets FOR SELECT TO authenticated USING (username IN (SELECT username FROM public.players WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.adjust_balance(_username text, _delta bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nb bigint;
BEGIN
  UPDATE public.players SET balance = balance + _delta WHERE username = _username AND balance + _delta >= 0 RETURNING balance INTO nb;
  IF nb IS NULL THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  RETURN nb;
END $$;
REVOKE EXECUTE ON FUNCTION public.adjust_balance(text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_balance(text, bigint) TO service_role;