-- Collage Randomizer Database Schema
-- Run this in your Supabase SQL Editor

-- Create the elements table
CREATE TABLE IF NOT EXISTS elements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the collages table
CREATE TABLE IF NOT EXISTS collages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  prompt TEXT NOT NULL,
  elements_data JSONB NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_elements_category ON elements(category);
CREATE INDEX IF NOT EXISTS idx_elements_created_at ON elements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_elements_tags ON elements USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_collages_user_id ON collages(user_id);
CREATE INDEX IF NOT EXISTS idx_collages_created_at ON collages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collages_prompt ON collages(prompt);

-- Enable Row Level Security (RLS)
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE collages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for elements table
-- Allow public read access to elements
CREATE POLICY "Public read access to elements" ON elements
  FOR SELECT USING (true);

-- Allow authenticated users to insert elements (for admin functionality)
CREATE POLICY "Authenticated users can insert elements" ON elements
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update elements
CREATE POLICY "Authenticated users can update elements" ON elements
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete elements
CREATE POLICY "Authenticated users can delete elements" ON elements
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for collages table
-- Users can read all public collages or their own
CREATE POLICY "Users can read public collages" ON collages
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- Users can insert their own collages
CREATE POLICY "Users can insert own collages" ON collages
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own collages
CREATE POLICY "Users can update own collages" ON collages
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own collages
CREATE POLICY "Users can delete own collages" ON collages
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('collage-elements', 'collage-elements', true),
  ('generated-collages', 'generated-collages', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for collage-elements bucket
CREATE POLICY "Public read access to collage elements" ON storage.objects
  FOR SELECT USING (bucket_id = 'collage-elements');

CREATE POLICY "Authenticated users can upload to collage elements" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'collage-elements' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update collage elements" ON storage.objects
  FOR UPDATE USING (bucket_id = 'collage-elements' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete collage elements" ON storage.objects
  FOR DELETE USING (bucket_id = 'collage-elements' AND auth.role() = 'authenticated');

-- Storage policies for generated-collages bucket
CREATE POLICY "Public read access to generated collages" ON storage.objects
  FOR SELECT USING (bucket_id = 'generated-collages');

CREATE POLICY "Users can upload their generated collages" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'generated-collages' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their generated collages" ON storage.objects
  FOR UPDATE USING (bucket_id = 'generated-collages' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their generated collages" ON storage.objects
  FOR DELETE USING (bucket_id = 'generated-collages' AND auth.role() = 'authenticated');

-- Create a function to get category statistics
CREATE OR REPLACE FUNCTION get_category_stats()
RETURNS TABLE(category TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.category,
    COUNT(*)::BIGINT as count
  FROM elements e
  GROUP BY e.category
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to search elements
CREATE OR REPLACE FUNCTION search_elements(search_term TEXT)
RETURNS SETOF elements AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM elements
  WHERE 
    name ILIKE '%' || search_term || '%' OR
    category ILIKE '%' || search_term || '%' OR
    search_term = ANY(tags)
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample categories (optional - for testing)
INSERT INTO elements (name, category, file_path, file_url, tags) VALUES
  ('Sample Statue', 'statues', 'sample-statue.jpg', 'https://example.com/sample-statue.jpg', ARRAY['classical', 'marble']),
  ('Sample Explosion', 'explosions', 'sample-explosion.jpg', 'https://example.com/sample-explosion.jpg', ARRAY['fire', 'dramatic']),
  ('Sample Nature', 'nature', 'sample-nature.jpg', 'https://example.com/sample-nature.jpg', ARRAY['organic', 'green'])
ON CONFLICT DO NOTHING;

-- Create a view for popular elements (most used in collages)
CREATE OR REPLACE VIEW popular_elements AS
SELECT 
  e.*,
  COUNT(c.id) as usage_count
FROM elements e
LEFT JOIN collages c ON c.elements_data::TEXT LIKE '%' || e.id || '%'
GROUP BY e.id
ORDER BY usage_count DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create your Supabase project';
  RAISE NOTICE '2. Run this SQL in the SQL Editor';
  RAISE NOTICE '3. Add your Supabase URL and keys to Vercel environment variables';
  RAISE NOTICE '4. Deploy your app and start uploading elements!';
END $$;
