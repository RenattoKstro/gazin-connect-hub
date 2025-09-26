-- Add status column to collaborators table
ALTER TABLE public.collaborators 
ADD COLUMN status TEXT DEFAULT NULL;

-- Add a check constraint to ensure valid status values
ALTER TABLE public.collaborators 
ADD CONSTRAINT collaborators_status_check 
CHECK (status IS NULL OR status IN ('Recebimento', 'Renegociação', 'Cobranças', 'Vendas', 'Entregas', 'Montagem', 'Gerencia'));