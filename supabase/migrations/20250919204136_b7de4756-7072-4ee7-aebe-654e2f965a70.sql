-- Create TV images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('tv-images', 'tv-images', true);

-- Create TV images table
CREATE TABLE public.tv_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tv_images ENABLE ROW LEVEL SECURITY;

-- Create policies for TV images
CREATE POLICY "Anyone can view TV images" 
ON public.tv_images 
FOR SELECT 
USING (active = true);

CREATE POLICY "Admins can manage TV images" 
ON public.tv_images 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Create storage policies for TV images
CREATE POLICY "Anyone can view TV images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tv-images');

CREATE POLICY "Admins can upload TV images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tv-images' AND is_admin());

CREATE POLICY "Admins can update TV images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'tv-images' AND is_admin());

CREATE POLICY "Admins can delete TV images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'tv-images' AND is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tv_images_updated_at
BEFORE UPDATE ON public.tv_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();