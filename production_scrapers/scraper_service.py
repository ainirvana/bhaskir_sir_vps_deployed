"""
Production-ready scraper service for Next.js API integration
Provides async scraping, progress tracking, and status reporting
"""

import asyncio
import os
import sys
import logging
from datetime import datetime
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, asdict
import json
import threading
import queue
import time
from enum import Enum

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from combined_scraper import CombinedScraper, CombinedScrapingResult

# Set up logging
logger = logging.getLogger(__name__)

class ScrapingStatus(Enum):
    """Status of scraping operation"""
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class ScrapingProgress:
    """Progress information for scraping operation"""
    status: ScrapingStatus
    current_scraper: Optional[str]  # "gktoday" or "drishti" or "combined"
    articles_scraped: int
    articles_skipped: int
    errors: List[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    estimated_remaining_seconds: Optional[int]
    progress_percentage: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "status": self.status.value,
            "current_scraper": self.current_scraper,
            "articles_scraped": self.articles_scraped,
            "articles_skipped": self.articles_skipped,
            "errors": self.errors,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "estimated_remaining_seconds": self.estimated_remaining_seconds,
            "progress_percentage": self.progress_percentage
        }

class ScraperService:
    """Production-ready scraper service for API integration"""
    
    def __init__(self):
        self.current_task = None
        self.progress = ScrapingProgress(
            status=ScrapingStatus.IDLE,
            current_scraper=None,
            articles_scraped=0,
            articles_skipped=0,
            errors=[],
            started_at=None,
            completed_at=None,
            estimated_remaining_seconds=None,
            progress_percentage=0.0
        )
        self.result = None
        self._lock = threading.Lock()
        
    def get_status(self) -> Dict[str, Any]:
        """Get current scraping status and progress"""
        with self._lock:
            return self.progress.to_dict()
    
    def get_result(self) -> Optional[Dict[str, Any]]:
        """Get the result of the last completed scraping operation"""
        with self._lock:
            if self.result and hasattr(self.result, '__dict__'):
                return asdict(self.result)
            return None
    
    def is_running(self) -> bool:
        """Check if a scraping operation is currently running"""
        with self._lock:
            return self.progress.status == ScrapingStatus.RUNNING
    
    def start_scraping(
        self,
        gktoday_enabled: bool = True,
        drishti_enabled: bool = True,
        max_pages: int = 5,
        max_articles: int = 50,
        parallel: bool = True,
        progress_callback: Optional[Callable[[ScrapingProgress], None]] = None
    ) -> Dict[str, Any]:
        """
        Start a scraping operation
        
        Args:
            gktoday_enabled: Whether to scrape GKToday
            drishti_enabled: Whether to scrape DrishtiIAS
            max_pages: Maximum pages to scrape per site
            max_articles: Maximum articles to scrape per site
            parallel: Whether to run scrapers in parallel
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dict with operation status
        """
        with self._lock:
            if self.progress.status == ScrapingStatus.RUNNING:
                return {
                    "success": False,
                    "message": "Scraping operation already in progress",
                    "status": self.progress.status.value
                }
            
            # Reset progress
            self.progress = ScrapingProgress(
                status=ScrapingStatus.RUNNING,
                current_scraper=None,
                articles_scraped=0,
                articles_skipped=0,
                errors=[],
                started_at=datetime.now(),
                completed_at=None,
                estimated_remaining_seconds=None,
                progress_percentage=0.0
            )
            self.result = None
        
        # Start scraping in background thread
        self.current_task = threading.Thread(
            target=self._run_scraping,
            args=(gktoday_enabled, drishti_enabled, max_pages, max_articles, parallel, progress_callback),
            daemon=True
        )
        self.current_task.start()
        
        return {
            "success": True,
            "message": "Scraping operation started",
            "status": ScrapingStatus.RUNNING.value
        }
    
    def cancel_scraping(self) -> Dict[str, Any]:
        """Cancel the current scraping operation"""
        with self._lock:
            if self.progress.status != ScrapingStatus.RUNNING:
                return {
                    "success": False,
                    "message": "No scraping operation in progress",
                    "status": self.progress.status.value
                }
            
            self.progress.status = ScrapingStatus.CANCELLED
            self.progress.completed_at = datetime.now()
            
        return {
            "success": True,
            "message": "Scraping operation cancelled",
            "status": ScrapingStatus.CANCELLED.value
        }
    
    def _run_scraping(
        self,
        gktoday_enabled: bool,
        drishti_enabled: bool,
        max_pages: int,
        max_articles: int,
        parallel: bool,
        progress_callback: Optional[Callable[[ScrapingProgress], None]]
    ):
        """Run the scraping operation in background"""
        try:
            logger.info(f"Starting scraping operation: GKToday={gktoday_enabled}, Drishti={drishti_enabled}, Parallel={parallel}")
            
            scraper = CombinedScraper()
            
            # Update progress
            with self._lock:
                self.progress.current_scraper = "combined"
                self.progress.progress_percentage = 10.0
            
            if progress_callback:
                progress_callback(self.progress)
            
            # Map boolean flags to sources list
            sources = []
            if gktoday_enabled:
                sources.append('gktoday')
            if drishti_enabled:
                sources.append('drishti')
                
            # Default to both if none specified
            if not sources:
                sources = ['gktoday', 'drishti']
            
            # Run the scraping
            result = scraper.sync_articles(
                sources=sources,
                max_days=3,
                max_articles_per_source=max_articles,
                max_pages_gktoday=max_pages,
                parallel=parallel
            )
            
            # Update final progress
            with self._lock:
                self.progress.status = ScrapingStatus.COMPLETED if result.success else ScrapingStatus.FAILED
                self.progress.articles_scraped = result.total_articles_scraped
                self.progress.articles_skipped = result.total_articles_skipped
                self.progress.errors = result.total_errors
                self.progress.completed_at = datetime.now()
                self.progress.progress_percentage = 100.0
                self.result = result
            
            if progress_callback:
                progress_callback(self.progress)
            
            logger.info(f"Scraping completed: {result.total_articles_scraped} articles scraped")
            
        except Exception as e:
            logger.error(f"Error in scraping operation: {e}")
            with self._lock:
                self.progress.status = ScrapingStatus.FAILED
                self.progress.errors.append(f"Scraping failed: {str(e)}")
                self.progress.completed_at = datetime.now()
                self.progress.progress_percentage = 0.0
            
            if progress_callback:
                progress_callback(self.progress)

# Global service instance for singleton usage
_scraper_service = None

def get_scraper_service() -> ScraperService:
    """Get the global scraper service instance"""
    global _scraper_service
    if _scraper_service is None:
        _scraper_service = ScraperService()
    return _scraper_service

# Async wrapper functions for Next.js API routes
async def async_start_scraping(**kwargs) -> Dict[str, Any]:
    """Async wrapper for starting scraping operation"""
    service = get_scraper_service()
    return service.start_scraping(**kwargs)

async def async_get_status() -> Dict[str, Any]:
    """Async wrapper for getting scraping status"""
    service = get_scraper_service()
    return service.get_status()

async def async_get_result() -> Optional[Dict[str, Any]]:
    """Async wrapper for getting scraping result"""
    service = get_scraper_service()
    return service.get_result()

async def async_cancel_scraping() -> Dict[str, Any]:
    """Async wrapper for cancelling scraping operation"""
    service = get_scraper_service()
    return service.cancel_scraping()

# Convenience functions for direct usage
def quick_scrape(
    gktoday_enabled: bool = True,
    drishti_enabled: bool = True,
    max_pages: int = 3,
    max_articles: int = 20
) -> CombinedScrapingResult:
    """
    Quick synchronous scraping for testing or simple use cases
    
    Returns:
        CombinedScrapingResult with the scraping results
    """
    # Map boolean flags to sources list
    sources = []
    if gktoday_enabled:
        sources.append('gktoday')
    if drishti_enabled:
        sources.append('drishti')
        
    # Default to both if none specified
    if not sources:
        sources = ['gktoday', 'drishti']
    
    scraper = CombinedScraper()
    return scraper.sync_articles(
        sources=sources,
        max_days=3,
        max_articles_per_source=max_articles,
        max_pages_gktoday=max_pages,
        parallel=True
    )

def get_latest_articles(limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get the latest articles from the database
    
    Args:
        limit: Maximum number of articles to return
        
    Returns:
        List of article dictionaries
    """
    import psycopg2
    from psycopg2.extras import DictCursor
    from dotenv import load_dotenv
    
    # Load environment variables
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    dotenv_path = os.path.join(root_dir, '.env.local')
    load_dotenv(dotenv_path)
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        return []
    
    try:
        with psycopg2.connect(database_url) as conn:
            with conn.cursor(cursor_factory=DictCursor) as cursor:
                # First, check what columns exist
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'articles' AND table_schema = 'public'
                """)
                columns = [row[0] for row in cursor.fetchall()]
                
                # Build query based on available columns
                base_columns = ['title', 'content', 'source', 'published_date', 'url']
                optional_columns = ['importance', 'tags']
                
                select_columns = []
                for col in base_columns:
                    if col in columns:
                        select_columns.append(col)
                
                for col in optional_columns:
                    if col in columns:
                        select_columns.append(col)
                
                if not select_columns:
                    logger.error("No valid columns found in articles table")
                    return []
                
                query = f"""
                    SELECT {', '.join(select_columns)}
                    FROM articles 
                    ORDER BY published_date DESC, created_at DESC
                    LIMIT %s
                """
                
                cursor.execute(query, (limit,))
                
                articles = []
                for row in cursor.fetchall():
                    article = {}
                    for col in select_columns:
                        value = row[col] if col in row else None
                        if col == 'published_date' and value:
                            article[col] = value.isoformat()
                        else:
                            article[col] = value
                    articles.append(article)
                
                return articles
    except Exception as e:
        logger.error(f"Error fetching latest articles: {e}")
        return []

if __name__ == "__main__":
    # Example usage
    print("Testing scraper service...")
    
    # Quick test
    result = quick_scrape(max_pages=1, max_articles=5)
    print(f"Quick scrape result: {result.summary}")
    
    # Service test
    service = get_scraper_service()
    start_result = service.start_scraping(max_pages=1, max_articles=3)
    print(f"Service start result: {start_result}")
    
    # Wait for completion
    while service.is_running():
        status = service.get_status()
        print(f"Status: {status['status']} - {status['progress_percentage']:.1f}%")
        time.sleep(1)
    
    final_result = service.get_result()
    if final_result:
        print("Final result summary:")
        print(final_result.get('summary', 'No summary available'))
