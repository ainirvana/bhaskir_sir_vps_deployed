# Functional Scrapers

This directory contains the working, production-ready scrapers for the educational platform. These scrapers have been tested and optimized for both full database refresh and incremental sync operations.

## Overview

The functional scrapers system consists of:

1. **GKToday Scraper** (`gktoday_scraper.py`) - Scrapes articles from GKToday
2. **DrishtiIAS Scraper** (`drishti_scraper.py`) - Scrapes articles from DrishtiIAS  
3. **Orchestrator** (`wipe_and_scrape.py`) - Manages both scrapers and database operations

## Features

### Smart Sync System
- **Incremental Sync**: Only fetches new articles, skips existing ones
- **Full Wipe & Scrape**: Complete database refresh when needed
- **Duplicate Detection**: Prevents duplicate articles using URL-based checking
- **Error Handling**: Robust error handling with detailed logging
- **Performance Optimized**: Stops scraping when finding consecutive existing articles

### Database Schema
All scrapers use a unified PostgreSQL schema:

```sql
-- Main articles table
gk_today_content (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    image_url TEXT,
    published_date DATE,
    source_name TEXT,  -- 'GKToday' or 'DrishtiIAS'
    scraped_at TIMESTAMP WITH TIME ZONE,
    intro TEXT,
    sequence_order INTEGER,
    date TEXT,
    importance_rating VARCHAR(10)
)

-- Structured content sections
sections (
    id UUID PRIMARY KEY,
    article_id UUID REFERENCES gk_today_content(id),
    heading TEXT,
    content TEXT,
    type TEXT,  -- 'paragraph' or 'list'
    sequence_order INTEGER
)

-- Bullet points for sections
section_bullets (
    id UUID PRIMARY KEY,
    section_id UUID REFERENCES sections(id),
    content TEXT NOT NULL,
    bullet_order INTEGER
)
```

## Usage

### Command Line Interface

#### Sync Mode (Recommended for production)
```bash
# Sync both sources (incremental)
python functional_scrapers/wipe_and_scrape.py --mode sync

# Sync only GKToday
python functional_scrapers/wipe_and_scrape.py --mode sync --sources gktoday

# Sync only DrishtiIAS for last 5 days
python functional_scrapers/wipe_and_scrape.py --mode sync --sources drishti --days 5

# Get JSON output for API integration
python functional_scrapers/wipe_and_scrape.py --mode sync --json
```

#### Wipe Mode (Full refresh)
```bash
# Full wipe and scrape both sources
python functional_scrapers/wipe_and_scrape.py --mode wipe

# Full wipe and scrape DrishtiIAS for last 7 days
python functional_scrapers/wipe_and_scrape.py --mode wipe --sources drishti --days 7
```

### Python API Integration

For Next.js app integration:

```python
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'functional_scrapers'))

from functional_scrapers.wipe_and_scrape import sync_latest_articles

# Sync latest articles (returns results dict)
results = sync_latest_articles(sources=['gktoday', 'drishti'], days=3)

print(f"Success: {results['success']}")
print(f"New articles: {results['total_count']}")
print(f"Runtime: {results['runtime_seconds']:.2f} seconds")
```

### Individual Scraper Usage

#### GKToday Scraper
```python
from functional_scrapers.gktoday_scraper import EnhancedGKTodayScraper

scraper = EnhancedGKTodayScraper()
count = scraper.scrape_articles(
    get_detailed_content=True,
    max_pages=10,
    sync_mode=True  # Stop when finding existing articles
)
scraper.close()
```

#### DrishtiIAS Scraper
```python
from functional_scrapers.drishti_scraper import EnhancedDrishtiScraperFixed

scraper = EnhancedDrishtiScraperFixed()
count = scraper.scrape_recent_articles(
    max_days=3,
    sync_until_existing=True
)
scraper.close()
```

## Configuration

### Environment Variables
Create a `.env.local` file in the project root with:

```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

### Logging
All scrapers generate detailed logs:
- `gktoday_scraper.log` - GKToday scraper logs
- `drishti_scraper.log` - DrishtiIAS scraper logs  
- `wipe_and_scrape.log` - Orchestrator logs

## Next.js Integration

### API Route Example
Create `/pages/api/scrape.js`:

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sources = ['gktoday', 'drishti'], days = 3 } = req.body;
    
    const command = `python functional_scrapers/wipe_and_scrape.py --mode sync --sources ${sources.join(' ')} --days ${days} --json`;
    
    const { stdout } = await execAsync(command);
    const results = JSON.parse(stdout);
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Scraping failed' });
  }
}
```

### Frontend Component Example
```javascript
const ScrapeButton = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleScrape = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: ['gktoday', 'drishti'], days: 3 })
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleScrape} disabled={loading}>
        {loading ? 'Syncing...' : 'Sync Latest Articles'}
      </button>
      {results && (
        <div>
          <p>New articles: {results.total_count}</p>
          <p>Runtime: {results.runtime_seconds.toFixed(2)}s</p>
        </div>
      )}
    </div>
  );
};
```

## Testing

Run the test script to verify all scrapers are working:

```bash
python test_functional_scrapers.py
```

This will test:
- Database connectivity
- Individual scraper functionality
- Orchestrator sync operations
- Error handling

## Performance Characteristics

### GKToday Scraper
- **Articles per page**: ~10-15
- **Pages processed**: Up to 20 (configurable)
- **Sync stopping**: After 3 consecutive existing articles
- **Detailed content**: Extracts full article content, sections, and bullet points
- **Images**: Extracts main article images

### DrishtiIAS Scraper  
- **Articles per day**: 5-15 (varies)
- **Date range**: Configurable (default: 3 days)
- **Sync stopping**: When all articles for a day already exist
- **Content structure**: Hierarchical sections with nested bullet points
- **Metadata**: Includes importance ratings and publication dates

### Typical Performance
- **Sync operation**: 30-120 seconds depending on new articles
- **Full wipe**: 5-15 minutes for complete refresh
- **Memory usage**: <100MB for normal operations
- **Database impact**: Minimal, uses batch operations

## Error Handling

The scrapers handle various error scenarios:

1. **Network errors**: Retries with exponential backoff
2. **Database errors**: Transaction rollback and error logging
3. **Content parsing errors**: Graceful degradation, partial content saved
4. **Duplicate articles**: Silently skipped using database constraints
5. **Missing environment**: Clear error messages and validation

## Monitoring

Key metrics to monitor:

1. **Success rate**: Check `results['success']` in API responses
2. **Article counts**: Monitor `results['total_count']` for each run
3. **Runtime**: Track `results['runtime_seconds']` for performance
4. **Error logs**: Monitor log files for warnings and errors
5. **Database growth**: Track total article counts over time

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Verify `DATABASE_URL` in `.env.local`
   - Check database server accessibility
   - Ensure PostgreSQL extensions are available

2. **No articles found**
   - Check website accessibility
   - Verify scraper selectors still work
   - Check date formats and URL patterns

3. **Slow performance**
   - Reduce `max_pages` for GKToday
   - Reduce `days` for DrishtiIAS
   - Check network connectivity

4. **Memory issues**
   - Process articles in smaller batches
   - Close database connections properly
   - Monitor log file sizes

### Debug Mode

For detailed debugging, modify logging level:

```python
logging.basicConfig(level=logging.DEBUG)
```

This will show all HTTP requests, database queries, and content parsing details.

## Maintenance

### Regular Tasks

1. **Weekly**: Review error logs for patterns
2. **Monthly**: Test scrapers manually for website changes
3. **Quarterly**: Performance optimization and cleanup
4. **As needed**: Update selectors if websites change

### Updating Scrapers

When websites change their structure:

1. Update CSS selectors in scraper files
2. Test with the test script
3. Verify data quality in the database
4. Update documentation if needed

## Security Considerations

1. **Rate limiting**: Built-in delays between requests
2. **User agents**: Realistic browser user agents
3. **Timeout handling**: Prevents hanging connections
4. **SQL injection**: Uses parameterized queries
5. **Environment variables**: Sensitive data in `.env.local`

## Future Enhancements

Planned improvements:

1. **Webhook notifications**: Alert when scraping completes
2. **Content deduplication**: Advanced duplicate detection
3. **Content quality scoring**: Automatic content rating
4. **Multi-language support**: Scrape content in multiple languages
5. **Real-time sync**: WebSocket-based live updates
6. **A/B testing**: Compare scraper performance variations
