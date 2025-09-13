-- Primeiro, buscar o ID do usuário admin e criar o perfil
INSERT INTO public.profiles (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'admin@filial359.com.br'
AND id NOT IN (SELECT user_id FROM public.profiles);

-- Verificar se o trigger existe e está ativo
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();