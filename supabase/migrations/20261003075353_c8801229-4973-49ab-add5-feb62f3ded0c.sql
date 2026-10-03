CREATE TABLE public.blackjack_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL REFERENCES public.players(username) ON DELETE CASCADE,
  wager bigint NOT NULL,
  deck int[] NOT NULL,
  player int[] NOT NULL,
  dealer int[] NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.blackjack_games TO service_role;
ALTER TABLE public.blackjack_games ENABLE ROW LEVEL SECURITY;