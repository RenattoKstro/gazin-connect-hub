CREATE OR REPLACE FUNCTION public.is_duel_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'admin@filial195.com';
$$;

CREATE POLICY "Duel admin can insert sales duel"
ON public.sales_duel
FOR INSERT
WITH CHECK (public.is_duel_admin());

CREATE POLICY "Duel admin can update sales duel"
ON public.sales_duel
FOR UPDATE
USING (public.is_duel_admin())
WITH CHECK (public.is_duel_admin());

CREATE POLICY "Duel admin can delete sales duel"
ON public.sales_duel
FOR DELETE
USING (public.is_duel_admin());

CREATE POLICY "Duel admin can upload duel images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'tv-images' AND public.is_duel_admin());

CREATE POLICY "Duel admin can update duel images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'tv-images' AND public.is_duel_admin())
WITH CHECK (bucket_id = 'tv-images' AND public.is_duel_admin());

CREATE POLICY "Duel admin can delete duel images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'tv-images' AND public.is_duel_admin());
