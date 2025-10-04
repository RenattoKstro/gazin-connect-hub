-- Create sales_duel table for campaign management
CREATE TABLE IF NOT EXISTS public.sales_duel (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name text NOT NULL DEFAULT '🔥 Duelo de Vendas 🔥',
  goal_value numeric NOT NULL DEFAULT 50000,
  team_a_name text NOT NULL DEFAULT 'Equipe A',
  team_b_name text NOT NULL DEFAULT 'Equipe B',
  team_a_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  team_b_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_duel ENABLE ROW LEVEL SECURITY;

-- Anyone can view the duel
CREATE POLICY "Anyone can view sales duel"
  ON public.sales_duel
  FOR SELECT
  USING (true);

-- Only admins can manage the duel
CREATE POLICY "Admins can insert sales duel"
  ON public.sales_duel
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update sales duel"
  ON public.sales_duel
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete sales duel"
  ON public.sales_duel
  FOR DELETE
  USING (is_admin());

-- Trigger to update updated_at
CREATE TRIGGER update_sales_duel_updated_at
  BEFORE UPDATE ON public.sales_duel
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default record
INSERT INTO public.sales_duel (campaign_name, goal_value, team_a_name, team_b_name, team_a_members, team_b_members)
VALUES (
  '🔥 Duelo de Vendas 🔥',
  50000,
  'Equipe Fogo',
  'Equipe Gelo',
  '[{"name":"Vendedor A1","value":15000},{"name":"Vendedor A2","value":8000}]'::jsonb,
  '[{"name":"Vendedor B1","value":12000},{"name":"Vendedor B2","value":10000}]'::jsonb
);