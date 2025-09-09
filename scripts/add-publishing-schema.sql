-- Add publishing status columns to articles and quizzes tables

-- Add published status to gk_today_content (scraped articles)
ALTER TABLE gk_today_content 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);

-- Add published status to scraped_content table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scraped_content') THEN
        ALTER TABLE scraped_content 
        ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Create index for better performance on published articles
CREATE INDEX IF NOT EXISTS idx_gk_today_published ON gk_today_content(is_published, created_at);

-- Create index for scraped_content if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scraped_content') THEN
        CREATE INDEX IF NOT EXISTS idx_scraped_content_published ON scraped_content(is_published, created_at);
    END IF;
END $$;

-- Add published status to existing quiz storage system (we'll need a proper table)
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL,
    article_ids TEXT[] NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(is_published, created_at);

-- Add presentations table
CREATE TABLE IF NOT EXISTS presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    template TEXT NOT NULL,
    slides JSONB NOT NULL,
    article_ids TEXT[] NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for presentations
CREATE INDEX IF NOT EXISTS idx_presentations_published ON presentations(is_published, created_at);

-- Update users table to ensure proper role management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- 'article', 'quiz', 'presentation'
    resource_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for activity log
CREATE INDEX IF NOT EXISTS idx_admin_activity_log ON admin_activity_log(user_id, created_at);
