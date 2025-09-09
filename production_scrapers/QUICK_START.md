# Production Scrapers - Quick Start Guide

## ✅ COMPLETED: Production-Ready Scraper System

Your production scrapers are now ready for integration with your Next.js educational platform!

### 🚀 What's Been Built

1. **Two Proven Scrapers**:
   - `EnhancedGKTodayScraper` - GKToday articles with smart sync
   - `EnhancedDrishtiScraperFixed` - DrishtiIAS articles with multi-article-per-day support

2. **Smart Sync Technology**:
   - ✅ Automatically skips existing articles
   - ✅ Only scrapes new content since last run
   - ✅ Handles multiple articles per day correctly
   - ✅ Uses URLs for unique article identification

3. **Production Infrastructure**:
   - ✅ Robust error handling and recovery
   - ✅ Database connection management
   - ✅ Comprehensive logging
   - ✅ Rate limiting and respectful scraping
   - ✅ Progress tracking and status reporting

4. **API Integration Layer**:
   - ✅ Service layer for async operations
   - ✅ Real-time progress tracking
   - ✅ JSON responses for Next.js integration
   - ✅ Background task management

5. **Tools & Utilities**:
   - ✅ Command-line interface for testing
   - ✅ Combined scraper runner
   - ✅ Next.js integration examples
   - ✅ Comprehensive documentation

## 🏃‍♂️ Quick Start

### 1. Test the Scrapers
```bash
cd production_scrapers

# Quick test with minimal data
python cli.py quick --max-articles 5 --pretty

# Monitor real-time
python cli.py monitor
```

### 2. Integrate with Next.js

#### Option A: Direct CLI Integration
```typescript
// app/api/scraper/sync/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { maxArticles = 20, parallel = true } = body;
    
    const command = `cd production_scrapers && python cli.py quick --max-articles ${maxArticles} --pretty`;
    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### Option B: Background Service
```typescript
// app/api/scraper/start/route.ts
export async function POST(request: Request) {
  const command = `cd production_scrapers && python cli.py start --gktoday --drishti --max-pages 3`;
  
  try {
    await execAsync(command);
    return NextResponse.json({ success: true, message: "Scraping started" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// app/api/scraper/status/route.ts
export async function GET() {
  const command = `cd production_scrapers && python cli.py status --pretty`;
  
  try {
    const { stdout } = await execAsync(command);
    const status = JSON.parse(stdout);
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

### 3. Frontend Integration
```typescript
// hooks/useScraper.ts
export function useScraper() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const startScraping = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scraper/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxArticles: 20 })
      });
      
      const result = await response.json();
      return result;
    } finally {
      setLoading(false);
    }
  };

  return { startScraping, loading, status };
}
```

## 📋 Configuration Checklist

### ✅ Environment Setup
Ensure your `.env.local` file has:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
```

### ✅ Database Schema
Your PostgreSQL database should have the articles table:
```sql
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    published_date DATE,
    importance TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### ✅ Dependencies
Install Python dependencies:
```bash
pip install requests beautifulsoup4 psycopg2-binary python-dotenv python-dateutil
```

## 🎯 Integration Points

### 1. Scheduled Scraping
Add to your deployment (cron job or scheduled function):
```bash
# Daily at 6 AM
0 6 * * * cd /path/to/production_scrapers && python cli.py quick --max-pages 5
```

### 2. Manual Trigger
Admin dashboard button that calls `/api/scraper/sync`

### 3. Real-time Status
Status dashboard using `/api/scraper/status` with polling

### 4. Article Display
Use `/api/scraper/latest` to get recently scraped articles

## 🚨 Important Notes

### Smart Sync Behavior
- **First Run**: Will scrape configured number of articles
- **Subsequent Runs**: Will only scrape new articles since last run
- **No Duplicates**: Automatically skips articles already in database
- **Multi-articles**: Handles multiple articles per day correctly

### Performance Guidelines
- **Development**: Use `max_articles=5-10` for testing
- **Production**: Use `max_articles=20-50` for daily sync
- **Bulk Import**: Use `max_pages=10+` for initial population

### Error Handling
- All functions return structured JSON with success/error status
- Comprehensive logging in `*.log` files
- Graceful degradation if one scraper fails

## 🔧 Maintenance

### Daily Operations
```bash
# Quick health check
python cli.py latest --limit 1

# Sync new articles  
python cli.py quick --max-articles 20

# Check for any errors
tail -f *.log
```

### Monitoring
- Check scraper logs for error patterns
- Monitor database growth
- Verify article freshness

## 🎉 You're Ready!

Your production scrapers are fully functional and ready for integration. The system will:

1. ✅ **Smart Sync**: Only fetch new articles, skip existing ones
2. ✅ **Handle Multiple Sources**: GKToday and DrishtiIAS working simultaneously  
3. ✅ **Production Ready**: Robust error handling, logging, and recovery
4. ✅ **API Integration**: Easy to call from Next.js API routes
5. ✅ **Real-time Progress**: Track scraping progress and status
6. ✅ **Scalable**: Can easily add more sources in the future

Start with small tests using the CLI, then integrate with your Next.js app using the provided examples!
