
-- Create storage bucket for promoted stream thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'promoted-stream-thumbnails',
  'promoted-stream-thumbnails', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage policies for promoted stream thumbnails
CREATE POLICY "Anyone can view promoted stream thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'promoted-stream-thumbnails');

CREATE POLICY "Anyone can upload promoted stream thumbnails" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'promoted-stream-thumbnails');

CREATE POLICY "Anyone can update promoted stream thumbnails" ON storage.objects
FOR UPDATE USING (bucket_id = 'promoted-stream-thumbnails');

CREATE POLICY "Anyone can delete promoted stream thumbnails" ON storage.objects
FOR DELETE USING (bucket_id = 'promoted-stream-thumbnails');
