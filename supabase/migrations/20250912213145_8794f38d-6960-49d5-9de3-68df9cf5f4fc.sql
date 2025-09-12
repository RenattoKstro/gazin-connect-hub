-- Create collaborators table
CREATE TABLE public.collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  phone TEXT,
  instagram TEXT,
  observations TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (anyone can view)
CREATE POLICY "Anyone can view collaborators" 
ON public.collaborators 
FOR SELECT 
USING (true);

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Admin policies for collaborators (only admins can modify)
CREATE POLICY "Admins can insert collaborators" 
ON public.collaborators 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update collaborators" 
ON public.collaborators 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete collaborators" 
ON public.collaborators 
FOR DELETE 
USING (public.is_admin());

-- Create storage bucket for collaborator photos
INSERT INTO storage.buckets (id, name, public) VALUES ('collaborator-photos', 'collaborator-photos', true);

-- Storage policies for photos
CREATE POLICY "Anyone can view photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'collaborator-photos');

CREATE POLICY "Admins can upload photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'collaborator-photos' AND public.is_admin());

CREATE POLICY "Admins can update photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'collaborator-photos' AND public.is_admin());

CREATE POLICY "Admins can delete photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'collaborator-photos' AND public.is_admin());

-- Function to handle new user registration (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_collaborators_updated_at
BEFORE UPDATE ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert mock data
INSERT INTO public.collaborators (name, position, phone, instagram, observations) VALUES
('Ana Carolina Silva', 'Gerente de Vendas', '(67) 99999-1234', '@ana_silva', 'Responsável pela equipe de vendas da região norte. Atende clientes corporativos e varejo.'),
('Carlos Eduardo Santos', 'Coordenador de TI', '(67) 99888-5678', '@carlos_tech', 'Suporte técnico e manutenção de sistemas. Disponível para emergências 24/7.'),
('Maria Fernanda Costa', 'Analista de RH', '(67) 99777-9012', '@mafe_rh', 'Recrutamento, seleção e desenvolvimento de pessoas.'),
('João Paulo Oliveira', 'Supervisor de Estoque', '(67) 99666-3456', null, 'Controle de inventário e logística. Ramal interno: 2147'),
('Beatriz Almeida', 'Assistente Financeiro', '(67) 99555-7890', '@bea_financas', 'Contas a pagar e receber. Análise de fluxo de caixa.'),
('Rafael Mendes', 'Vendedor Sênior', '(67) 99444-2345', '@rafa_vendas', 'Especialista em eletrodomésticos e móveis. Meta mensal: R$ 150k');