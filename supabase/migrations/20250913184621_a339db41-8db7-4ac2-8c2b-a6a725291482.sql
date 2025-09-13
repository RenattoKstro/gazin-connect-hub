-- Criar usuário administrador
-- Primeiro, vamos inserir o usuário na tabela auth.users
INSERT INTO auth.users (
  id,
  instance_id, 
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@filial359.com.br',
  crypt('admin359', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated'
);

-- Buscar o ID do usuário que acabamos de criar e inserir na tabela profiles
INSERT INTO public.profiles (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'admin@filial359.com.br';