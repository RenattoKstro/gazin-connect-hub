-- Primeiro, vamos criar o usuário usando a função de signup do Supabase
-- Como não podemos inserir diretamente na auth.users, vamos criar uma solução alternativa

-- Criar uma entrada temporária para o admin na tabela profiles
-- O usuário admin deverá fazer login pela primeira vez usando as credenciais fornecidas
-- e depois será automaticamente promovido para admin

-- Vamos apenas garantir que quando o admin se cadastrar, ele seja automaticamente admin
-- Modificar a função handle_new_user para detectar o email admin

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Se o email for do admin, definir role como admin
  IF NEW.email = 'admin@filial359.com.br' THEN
    INSERT INTO public.profiles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.profiles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;