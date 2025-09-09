#!/usr/bin/env python3
"""
Enhanced Wipe and Scrape Script
- Supports both full wipe-and-scrape and incremental sync modes
- Can be called from Next.js app for sync operations
- Optimized for production use
"""
import sys
import os
import logging
import argparse
import time
import psycopg2
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Add functional_scrapers to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

# Load environment variables
root_dir = os.path.dirname(__file__)
dotenv_path = os.path.join(root_dir, '..', '.env.local')
load_dotenv(dotenv_path)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(root_dir, '..', 'wipe_and_scrape.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

def wipe_database():
    """Wipe the PostgreSQL database tables completely"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        logger.info("Wiping database tables...")
        
        # Drop tables in correct order (considering foreign key constraints)
        tables_to_drop = [
            'section_bullets',
            'sections', 
            'gk_today_content',
            'quiz_attempts',
            'student_invitations',
            'scraped_content'
        ]
        
        for table in tables_to_drop:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
                logger.info(f"Dropped table: {table}")
            except Exception as e:
                logger.warning(f"Could not drop table {table}: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        logger.info("Database wiped successfully")
        return True
    except Exception as e:
        logger.error(f"Error wiping database: {e}")
        return False

def initialize_database():
    """Initialize a fresh database with required tables"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        logger.info("Initializing database tables...")
        
        # Create main content table for both GKToday and DrishtiIAS
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS gk_today_content (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title TEXT NOT NULL,
                url TEXT UNIQUE NOT NULL,
                image_url TEXT,
                published_date DATE,
                source_name TEXT DEFAULT 'GKToday',
                scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                intro TEXT,
                sequence_order INTEGER,
                date TEXT,
                importance_rating VARCHAR(10)
            )
        ''')
        
        # Create sections table for structured content
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sections (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                article_id UUID REFERENCES gk_today_content(id) ON DELETE CASCADE,
                heading TEXT,
                content TEXT,
                type TEXT CHECK (type IN ('paragraph', 'list')),
                sequence_order INTEGER
            )
        ''')
        
        # Create section_bullets table for bullet points
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS section_bullets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                bullet_order INTEGER
            )
        ''')
        
        # Create indexes for better performance
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_gk_today_content_source_name ON gk_today_content(source_name);
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_gk_today_content_published_date ON gk_today_content(published_date);
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_gk_today_content_scraped_at ON gk_today_content(scraped_at);
        ''')
        
        conn.commit()
        cursor.close()
        conn.close()
        logger.info("Database initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        return False

def get_database_stats():
    """Get current database statistics"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get article counts by source
        cursor.execute("""
            SELECT source_name, COUNT(*) 
            FROM gk_today_content 
            GROUP BY source_name
        """)
        source_counts = dict(cursor.fetchall())
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM gk_today_content")
        total_count = cursor.fetchone()[0]
        
        # Get latest article dates
        cursor.execute("""
            SELECT source_name, MAX(scraped_at) 
            FROM gk_today_content 
            GROUP BY source_name
        """)
        latest_scrapes = dict(cursor.fetchall())
        
        cursor.close()
        conn.close()
        
        return {
            'total_articles': total_count,
            'source_counts': source_counts,
            'latest_scrapes': latest_scrapes
        }
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        return None

def run_gktoday_scraper(sync_mode=True):
    """Run GKToday scraper"""
    try:
        logger.info("Starting GKToday scraper...")
        
        from gktoday_scraper import EnhancedGKTodayScraper
        
        scraper = EnhancedGKTodayScraper()
        
        # Run scraper with sync mode
        count = scraper.scrape_articles(
            get_detailed_content=True, 
            max_pages=20, 
            sync_until_existing=sync_mode
        )
        
        # Close database connection
        if scraper.db:
            scraper.db.close()
        
        logger.info(f"GKToday scraper completed - {count} articles scraped")
        return True, count
    except Exception as e:
        logger.error(f"Error running GKToday scraper: {e}")
        return False, 0

def run_drishti_scraper(days=3, sync_mode=True):
    """Run DrishtiIAS scraper"""
    try:
        logger.info(f"Starting DrishtiIAS scraper for {days} days...")
        
        from drishti_scraper import EnhancedDrishtiScraperFixed
        
        scraper = EnhancedDrishtiScraperFixed()
        
        # Run scraper with sync mode
        count = scraper.scrape_recent_articles(
            max_days=days, 
            sync_until_existing=sync_mode
        )
        
        # Close database connection
        if hasattr(scraper, 'conn'):
            scraper.close()
        
        logger.info(f"DrishtiIAS scraper completed - {count} articles scraped")
        return True, count
    except Exception as e:
        logger.error(f"Error running DrishtiIAS scraper: {e}")
        return False, 0

def sync_latest_articles(sources=None, days=3):
    """
    Sync latest articles without wiping database
    This is the function that should be called from Next.js app
    """
    start_time = time.time()
    results = {
        'success': True,
        'gktoday_count': 0,
        'drishti_count': 0,
        'total_count': 0,
        'runtime_seconds': 0,
        'errors': []
    }
    
    logger.info("=" * 60)
    logger.info("STARTING SYNC OPERATION (NO DATABASE WIPE)")
    logger.info("=" * 60)
    
    # Get initial stats
    initial_stats = get_database_stats()
    if initial_stats:
        logger.info(f"Current database status:")
        logger.info(f"Total articles: {initial_stats['total_articles']}")
        for source, count in initial_stats['source_counts'].items():
            logger.info(f"  {source}: {count} articles")
    
    # Run scrapers based on sources parameter
    if not sources or 'gktoday' in sources:
        try:
            gktoday_success, gktoday_count = run_gktoday_scraper(sync_mode=True)
            results['gktoday_count'] = gktoday_count
            if not gktoday_success:
                results['success'] = False
                results['errors'].append('GKToday scraper failed')
        except Exception as e:
            logger.error(f"GKToday scraper error: {e}")
            results['success'] = False
            results['errors'].append(f'GKToday scraper error: {str(e)}')
    
    if not sources or 'drishti' in sources:
        try:
            drishti_success, drishti_count = run_drishti_scraper(days=days, sync_mode=True)
            results['drishti_count'] = drishti_count
            if not drishti_success:
                results['success'] = False
                results['errors'].append('DrishtiIAS scraper failed')
        except Exception as e:
            logger.error(f"DrishtiIAS scraper error: {e}")
            results['success'] = False
            results['errors'].append(f'DrishtiIAS scraper error: {str(e)}')
    
    # Calculate totals
    results['total_count'] = results['gktoday_count'] + results['drishti_count']
    results['runtime_seconds'] = time.time() - start_time
    
    # Get final stats
    final_stats = get_database_stats()
    if final_stats:
        logger.info("Final database status:")
        logger.info(f"Total articles: {final_stats['total_articles']}")
        for source, count in final_stats['source_counts'].items():
            logger.info(f"  {source}: {count} articles")
    
    # Summary
    logger.info("=" * 60)
    if results['success']:
        logger.info(f"SYNC COMPLETED SUCCESSFULLY in {results['runtime_seconds']:.2f} seconds")
        logger.info(f"New articles added: {results['total_count']}")
        logger.info(f"  GKToday: {results['gktoday_count']}")
        logger.info(f"  DrishtiIAS: {results['drishti_count']}")
    else:
        logger.error(f"SYNC COMPLETED WITH ERRORS in {results['runtime_seconds']:.2f} seconds")
        for error in results['errors']:
            logger.error(f"  - {error}")
    logger.info("=" * 60)
    
    return results

def full_wipe_and_scrape(days=3):
    """
    Full wipe and scrape operation
    Use this for complete database refresh
    """
    start_time = time.time()
    results = {
        'success': True,
        'gktoday_count': 0,
        'drishti_count': 0,
        'total_count': 0,
        'runtime_seconds': 0,
        'errors': []
    }
    
    logger.info("=" * 60)
    logger.info("STARTING FULL WIPE AND SCRAPE OPERATION")
    logger.info("=" * 60)
    
    # Step 1: Wipe database
    if not wipe_database():
        results['success'] = False
        results['errors'].append('Database wipe failed')
        return results
    
    # Step 2: Initialize database
    if not initialize_database():
        results['success'] = False
        results['errors'].append('Database initialization failed')
        return results
    
    # Step 3: Run scrapers (no sync mode since database is empty)
    try:
        gktoday_success, gktoday_count = run_gktoday_scraper(sync_mode=False)
        results['gktoday_count'] = gktoday_count
        if not gktoday_success:
            results['success'] = False
            results['errors'].append('GKToday scraper failed')
    except Exception as e:
        logger.error(f"GKToday scraper error: {e}")
        results['success'] = False
        results['errors'].append(f'GKToday scraper error: {str(e)}')
    
    try:
        drishti_success, drishti_count = run_drishti_scraper(days=days, sync_mode=False)
        results['drishti_count'] = drishti_count
        if not drishti_success:
            results['success'] = False
            results['errors'].append('DrishtiIAS scraper failed')
    except Exception as e:
        logger.error(f"DrishtiIAS scraper error: {e}")
        results['success'] = False
        results['errors'].append(f'DrishtiIAS scraper error: {str(e)}')
    
    # Calculate totals
    results['total_count'] = results['gktoday_count'] + results['drishti_count']
    results['runtime_seconds'] = time.time() - start_time
    
    # Summary
    logger.info("=" * 60)
    if results['success']:
        logger.info(f"FULL WIPE AND SCRAPE COMPLETED SUCCESSFULLY in {results['runtime_seconds']:.2f} seconds")
        logger.info(f"Total articles scraped: {results['total_count']}")
        logger.info(f"  GKToday: {results['gktoday_count']}")
        logger.info(f"  DrishtiIAS: {results['drishti_count']}")
    else:
        logger.error(f"FULL WIPE AND SCRAPE COMPLETED WITH ERRORS in {results['runtime_seconds']:.2f} seconds")
        for error in results['errors']:
            logger.error(f"  - {error}")
    logger.info("=" * 60)
    
    return results

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(description="Enhanced Wipe and Scrape Tool for Educational Platform")
    
    # Mode selection
    parser.add_argument("--mode", choices=['sync', 'wipe'], default='sync',
                       help="Operation mode: 'sync' for incremental sync, 'wipe' for full wipe and scrape (default: sync)")
    
    # Scraper selection
    parser.add_argument("--sources", nargs='+', choices=['gktoday', 'drishti'], 
                       help="Which sources to scrape (default: both)")
    
    # Time range
    parser.add_argument("--days", type=int, default=3, 
                       help="Number of days to scrape for Drishti articles (default: 3)")
    
    # Output format
    parser.add_argument("--json", action="store_true", 
                       help="Output results in JSON format")
    
    args = parser.parse_args()
    
    try:
        if args.mode == 'sync':
            results = sync_latest_articles(sources=args.sources, days=args.days)
        else:  # wipe mode
            results = full_wipe_and_scrape(days=args.days)
        
        if args.json:
            import json
            print(json.dumps(results, indent=2, default=str))
        
        # Return appropriate exit code
        return 0 if results['success'] else 1
        
    except KeyboardInterrupt:
        logger.info("Operation cancelled by user")
        return 130
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
