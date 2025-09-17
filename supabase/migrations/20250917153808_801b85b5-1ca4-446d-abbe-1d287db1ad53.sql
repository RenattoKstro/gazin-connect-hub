-- Add pinned column to collaborators table
ALTER TABLE public.collaborators 
ADD COLUMN pinned boolean NOT NULL DEFAULT false;