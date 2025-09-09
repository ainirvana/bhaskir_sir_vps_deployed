# Production Scrapers

This directory contains the optimized, production-ready scrapers for the educational platform.

## Key Features

✅ **Smart Sync**: Automatically skips existing articles and only scrapes new content
✅ **Production Ready**: Robust error handling and logging
✅ **API Integration**: Designed for use with Next.js app via API endpoints
✅ **Database Optimized**: Efficient database operations with proper connection management
✅ **Rate Limited**: Respectful scraping with proper delays

## Scrapers

### 1. GKToday Scraper (`gktoday_scraper.py`)
- **Class**: `EnhancedGKTodayScraper`
- **Status**: ✅ Working
- **Purpose**: Scrapes GKToday articles with sync capability
- **Key Features**:
  - Automatic sync until existing articles found
  - Detailed content extraction including sections and bullet points
  - Proper date parsing and metadata extraction

### 2. DrishtiIAS Scraper (`drishti_scraper.py`)
- **Class**: `EnhancedDrishtiScraperFixed`
- **Status**: ✅ Working
- **Purpose**: Scrapes DrishtiIAS articles with multiple articles per day support
- **Key Features**:
  - Handles multiple articles per day correctly
  - Smart URL generation for different date formats
  - Content extraction with importance ratings
  - Automatic sync to avoid duplicates

### 3. Combined Scraper (`combined_scraper.py`)
- **Purpose**: Runs both scrapers with configurable options
- **API Ready**: Can be called directly from Next.js API routes
- **Smart Execution**: Only scrapes new articles, respects existing data

### 4. API Integration (`scraper_service.py`)
- **Purpose**: Service layer for Next.js integration
- **Features**:
  - Async scraping support
  - Progress tracking
  - Error handling and recovery
  - Status reporting
  - Singleton service instance
  - Real-time progress callbacks

### 5. Command Line Interface (`cli.py`)
- **Purpose**: CLI tool for testing and manual operations
- **Features**:
  - Start/stop/cancel scraping operations
  - Real-time monitoring
  - Quick scraping for testing
  - Get latest articles
  - JSON output for scripting

### 6. Next.js Integration Examples (`nextjs_integration_examples.py`)
- **Purpose**: Complete examples for integrating with Next.js
- **Includes**:
  - API route examples
  - React hooks for frontend
  - FastAPI alternative service
  - TypeScript interfaces

## Usage

### CLI Usage
```bash
# Quick scraping (synchronous)
python cli.py quick --max-articles 10 --pretty

# Start background scraping
python cli.py start --gktoday --drishti --max-pages 3 --wait

# Monitor progress
python cli.py monitor

# Get status
python cli.py status --pretty

# Get latest articles
python cli.py latest --limit 5
```

### Direct Python Usage
```python
from production_scrapers.combined_scraper import CombinedScraper

# Quick scraping
scraper = CombinedScraper()
result = scraper.scrape_all(max_pages=2, max_articles=10)
print(result.summary)

# Individual scrapers
from production_scrapers.gktoday_scraper import EnhancedGKTodayScraper
from production_scrapers.drishti_scraper import EnhancedDrishtiScraperFixed

gk_scraper = EnhancedGKTodayScraper()
result = gk_scraper.sync_articles(max_articles=5)
```

### Service API Usage
```python
from production_scrapers.scraper_service import get_scraper_service, quick_scrape

# Using the service (async, with progress tracking)
service = get_scraper_service()
service.start_scraping(max_pages=3, max_articles=20)

# Check status
status = service.get_status()
print(f"Progress: {status['progress_percentage']}%")

# Quick synchronous scraping
result = quick_scrape(max_pages=2, max_articles=10)
print(result.summary)
```

### Next.js API Integration
```typescript
// In your Next.js API route: app/api/scraper/start/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const body = await request.json();
  const command = `cd production_scrapers && python cli.py start --gktoday --drishti --max-pages ${body.max_pages || 3}`;
  
  try {
    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

## Configuration

### Environment Variables (.env.local)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
# Optional rate limiting
SCRAPER_DELAY_SECONDS=1
SCRAPER_MAX_RETRIES=3
```

## Key Features

### Smart Sync Technology
- **Duplicate Detection**: Automatically skips articles that already exist in the database
- **Efficient Queries**: Only checks article existence, doesn't re-scrape
- **Date-aware**: Understands that multiple articles can exist on the same day
- **URL-based**: Uses unique URLs to identify existing articles

### Production Optimizations
- **Connection Pooling**: Efficient database connection management
- **Error Recovery**: Robust error handling with retries
- **Rate Limiting**: Respectful scraping with configurable delays
- **Memory Efficient**: Processes articles one at a time
- **Logging**: Comprehensive logging for debugging and monitoring

### API-Ready Design
- **JSON Responses**: All functions return structured data
- **Progress Tracking**: Real-time progress updates
- **Status Management**: Clear status states (idle, running, completed, failed)
- **Error Aggregation**: Collects all errors for reporting
- **Result Caching**: Stores last result for retrieval
```python
from production_scrapers.combined_scraper import run_sync_scrapers

# Sync latest articles (default: 3 days)
result = run_sync_scrapers(days=3, sources=['gktoday', 'drishti'])

# Only sync GKToday
result = run_sync_scrapers(days=5, sources=['gktoday'])

# Only sync DrishtiIAS
result = run_sync_scrapers(days=7, sources=['drishti'])
```

### API Integration
```python
from production_scrapers.scraper_service import ScraperService

service = ScraperService()
result = await service.sync_articles(
    sources=['gktoday', 'drishti'],
    days=3,
    max_articles_per_source=50
)
```

### Next.js API Route Example
```javascript
// pages/api/scrape/sync.js
import { ScraperService } from '../../../production_scrapers/scraper_service';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { sources = ['gktoday', 'drishti'], days = 3 } = req.body;
    
    try {
      const service = new ScraperService();
      const result = await service.sync_articles({ sources, days });
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
```

## Configuration

All scrapers use the same environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SCRAPER_LOG_LEVEL`: Logging level (default: INFO)
- `SCRAPER_RATE_LIMIT`: Delay between requests in seconds (default: 2)

## Database Schema

The scrapers work with the existing database schema:
- `gk_today_content`: Main articles table
- `sections`: Article sections
- `section_bullets`: Bullet points within sections

## Error Handling

- Automatic retry with exponential backoff
- Graceful degradation on partial failures
- Comprehensive logging for debugging
- Database transaction rollback on errors

## Performance

- Connection pooling for database efficiency
- Smart rate limiting to avoid being blocked
- Parallel processing where appropriate
- Memory-efficient streaming for large datasets
