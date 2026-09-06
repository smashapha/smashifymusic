-- Policies for 'songs' bucket
DROP POLICY IF EXISTS "Songs uploads" ON storage.objects;
CREATE POLICY "Songs uploads" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'songs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Songs updates" ON storage.objects;
CREATE POLICY "Songs updates" ON storage.objects FOR UPDATE 
USING (bucket_id = 'songs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Songs reads" ON storage.objects;
CREATE POLICY "Songs reads" ON storage.objects FOR SELECT 
USING (bucket_id = 'songs');

-- Policies for 'covers' bucket
DROP POLICY IF EXISTS "Covers uploads" ON storage.objects;
CREATE POLICY "Covers uploads" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Covers updates" ON storage.objects;
CREATE POLICY "Covers updates" ON storage.objects FOR UPDATE 
USING (bucket_id = 'covers' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Covers reads" ON storage.objects;
CREATE POLICY "Covers reads" ON storage.objects FOR SELECT 
USING (bucket_id = 'covers');
