-- Create storage bucket for download files
INSERT INTO storage.buckets (id, name, public)
VALUES ('downloads', 'downloads', true);

-- Create downloads table
CREATE TABLE public.downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT,
  external_link TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for downloads table
CREATE POLICY "Anyone can view downloads"
ON public.downloads
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert downloads"
ON public.downloads
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update downloads"
ON public.downloads
FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete downloads"
ON public.downloads
FOR DELETE
USING (is_admin());

-- Storage policies for downloads bucket
CREATE POLICY "Anyone can view download files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'downloads');

CREATE POLICY "Admins can upload download files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'downloads' AND is_admin());

CREATE POLICY "Admins can update download files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'downloads' AND is_admin());

CREATE POLICY "Admins can delete download files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'downloads' AND is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_downloads_updated_at
BEFORE UPDATE ON public.downloads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();