# Gemini API Usage Tracking

This document outlines the implementation of Gemini API usage tracking in the Educational Platform.

## Overview

The system tracks and logs usage metrics for all Gemini API calls, including:
- Input token count
- Output token count
- API call duration
- Success/error status
- Model used
- Cost estimation

## Database Schema

A new table `gemini_api_logs` has been added to store API usage metrics:

```sql
CREATE TABLE gemini_api_logs (
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
```

## Implementation Components

1. **Database Migration**
   - `scripts/add-gemini-tracking.sql`: SQL migration script to create the tracking table
   - `scripts/run-gemini-tracking-migration.js`: Script to run the migration

2. **Tracking Service**
   - `lib/gemini-tracking.ts`: Service for logging and analyzing API usage

3. **API Integration**
   - `lib/gemini-service.ts`: Updated to track token usage for each API call

4. **Admin Dashboard**
   - `app/api/admin/gemini-usage/route.ts`: API endpoint to retrieve usage statistics
   - `components/admin/gemini-usage-stats.tsx`: React component to display usage statistics
   - `app/admin/gemini-usage/page.tsx`: Admin page for viewing usage statistics

## How to Use

### Running the Migration

To set up the tracking table, run:

```bash
node scripts/run-gemini-tracking-migration.js
```

### Viewing Usage Statistics

1. Navigate to the admin dashboard
2. Click on "Gemini API Usage" in the navigation menu
3. View summary statistics and detailed breakdown by model
4. Filter by date range to analyze usage over specific periods

### Cost Estimation

The system provides estimated costs based on current Gemini API pricing:
- Gemini 1.5 Pro: $0.00001 per 1K input tokens, $0.00003 per 1K output tokens
- Gemini 1.5 Flash: $0.000003 per 1K input tokens, $0.000005 per 1K output tokens

Note: Pricing is subject to change and should be verified with Google's official pricing.

## Future Enhancements

Potential improvements for the tracking system:

1. Export usage data to CSV/Excel for further analysis
2. Set up alerts for unusual usage patterns or cost thresholds
3. Implement more granular tracking by feature or user role
4. Add visualization charts for usage trends over time