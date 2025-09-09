-- Migration script to add Gemini API usage tracking table

-- Create gemini_api_logs table
CREATE TABLE IF NOT EXISTS gemini_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  request_type TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  model_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  user_id UUID REFERENCES users(id),
  request_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_created_at ON gemini_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_model_name ON gemini_api_logs(model_name);
CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_user_id ON gemini_api_logs(user_id);

-- Add comments for documentation
COMMENT ON TABLE gemini_api_logs IS 'Tracks usage metrics for Gemini API calls';
COMMENT ON COLUMN gemini_api_logs.endpoint IS 'The specific Gemini API endpoint called';
COMMENT ON COLUMN gemini_api_logs.request_type IS 'Type of request (e.g., generateContent, embedContent)';
COMMENT ON COLUMN gemini_api_logs.input_tokens IS 'Number of input tokens used in the request';
COMMENT ON COLUMN gemini_api_logs.output_tokens IS 'Number of output tokens generated in the response';
COMMENT ON COLUMN gemini_api_logs.model_name IS 'Name of the Gemini model used (e.g., gemini-1.5-pro-latest)';
COMMENT ON COLUMN gemini_api_logs.duration_ms IS 'Time taken to process the request in milliseconds';
COMMENT ON COLUMN gemini_api_logs.status IS 'Status of the API call (success, error)';
COMMENT ON COLUMN gemini_api_logs.error_message IS 'Error message if the API call failed';
COMMENT ON COLUMN gemini_api_logs.user_id IS 'ID of the user who initiated the API call (if applicable)';
COMMENT ON COLUMN gemini_api_logs.request_data IS 'JSON data containing additional request information';