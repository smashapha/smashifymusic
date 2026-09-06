-- Fixes the invalid default value for the content_status enum on the songs and albums tables
DO $$
DECLARE
    t_name text;
    c_name text;
BEGIN
    FOR t_name, c_name IN 
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_name IN ('songs', 'albums')
          AND udt_name = 'content_status'
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT %L', t_name, c_name, 'pending');
    END LOOP;
END $$;

-- Fallback for safety if the column type name is different but the column is named 'status'
ALTER TABLE songs ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE albums ALTER COLUMN status SET DEFAULT 'pending';
