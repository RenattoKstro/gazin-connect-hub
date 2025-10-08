-- Add logo fields to sales_duel table
ALTER TABLE public.sales_duel 
ADD COLUMN team_a_logo text,
ADD COLUMN team_b_logo text;