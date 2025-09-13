-- Atualizar o role do usuário admin para 'admin'
UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE user_id = 'd82a59c0-f44d-4567-a554-2e218de6d686';