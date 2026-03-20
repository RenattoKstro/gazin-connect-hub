-- Update tv-images bucket to allow larger files (100MB) and accept video types
UPDATE storage.buckets 
SET file_size_limit = 104857600,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
WHERE id = 'tv-images';