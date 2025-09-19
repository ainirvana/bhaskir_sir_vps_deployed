-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT,
    is_valid BOOLEAN NOT NULL DEFAULT true
);

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Add RLS policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
    ON user_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
    ON user_sessions FOR DELETE
    USING (auth.uid() = user_id);