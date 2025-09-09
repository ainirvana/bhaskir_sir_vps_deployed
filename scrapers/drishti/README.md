# Enhanced Drishti IAS Scraper

This enhanced scraper is designed to improve upon the previous version by properly handling multiple articles per day from the Drishti IAS website.

## Key Improvements

1. **Multiple Articles Per Day**: The scraper now correctly identifies and processes all articles available for each day, not just one.
2. **Robust Error Handling**: Better error handling to prevent failures and provide more detailed logging.
3. **Improved Article Content Extraction**: Enhanced extraction of article content, metadata, images, and UPSC questions.
4. **Database Integration**: Seamlessly integrates with the existing database schema.

## Usage

The enhanced scraper can be used in the following ways:

### As a standalone script:

```bash
python enhanced_drishti_scraper.py --days 5  # Scrape articles from the last 5 days
python enhanced_drishti_scraper.py --url "https://www.drishtiias.com/example-article-url"  # Scrape a specific article
```

### Via the combined scraper:

```bash
python combined_scraper.py --drishti --days 3  # Only run Drishti scraper for the last 3 days
python combined_scraper.py  # Run both GKToday and Drishti scrapers with default settings
```

### Via the FastAPI service:

The API endpoints remain the same:

- `POST /api/scrape/drishti` - Run the Drishti scraper
- `POST /api/scrape/all` - Run both scrapers

## Integration

This enhanced scraper has been integrated into the existing ecosystem:

1. The scraper implementation is in `scrapers/drishti/enhanced_drishti_scraper.py`
2. The combined scraper has been updated to use the enhanced version
3. The FastAPI service interfaces remain unchanged but now use the enhanced capabilities

## Technical Details

- The scraper uses Beautiful Soup for HTML parsing
- Database interactions are handled via psycopg2
- Proper rate limiting is implemented to be respectful to the website
- The scraper checks for existing articles to avoid duplicates
