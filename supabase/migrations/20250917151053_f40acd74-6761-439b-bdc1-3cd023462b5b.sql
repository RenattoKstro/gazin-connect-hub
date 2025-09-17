-- Add vacation field to collaborators table
ALTER TABLE public.collaborators 
ADD COLUMN on_vacation BOOLEAN NOT NULL DEFAULT false;