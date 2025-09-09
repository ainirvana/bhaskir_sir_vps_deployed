"""
Production-ready combined scraper for both GKToday and DrishtiIAS
Designed for Next.js integration and production use
"""

import os
import sys
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
import concurrent.futures
import threading

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from gktoday_scraper import EnhancedGKTodayScraper, ScrapingResult as GKTodayResult
from drishti_scraper import EnhancedDrishtiScraperFixed, ScrapingResult as DrishtiResult

# Set up logging
logger = logging.getLogger(__name__)

@dataclass
class CombinedScrapingResult:
    """Result of combined scraping operation"""
    success: bool
    gktoday_result: Optional[GKTodayResult]
    drishti_result: Optional[DrishtiResult]
    total_articles_scraped: int
    total_articles_skipped: int
    total_errors: List[str]
    runtime_seconds: float
    
    @property
    def summary(self) -> str:
        """Get a summary string of the results"""
        lines = []
        lines.append(f"=== COMBINED SCRAPING RESULTS ===")
        lines.append(f"Overall Success: {self.success}")
        lines.append(f"Total Runtime: {self.runtime_seconds:.2f} seconds")
        lines.append(f"Total Articles Scraped: {self.total_articles_scraped}")
        lines.append(f"Total Articles Skipped: {self.total_articles_skipped}")
        
        if self.gktoday_result:
            lines.append(f"\nGKToday Results:")
            lines.append(f"  Success: {self.gktoday_result.success}")
            lines.append(f"  Articles Scraped: {self.gktoday_result.articles_scraped}")
            lines.append(f"  Articles Skipped: {self.gktoday_result.articles_skipped}")
            lines.append(f"  Runtime: {self.gktoday_result.runtime_seconds:.2f}s")
            if self.gktoday_result.errors:
                lines.append(f"  Errors: {len(self.gktoday_result.errors)}")
        
        if self.drishti_result:
            lines.append(f"\nDrishtiIAS Results:")
            lines.append(f"  Success: {self.drishti_result.success}")
            lines.append(f"  Articles Scraped: {self.drishti_result.articles_scraped}")
            lines.append(f"  Articles Skipped: {self.drishti_result.articles_skipped}")
            lines.append(f"  Runtime: {self.drishti_result.runtime_seconds:.2f}s")
            if self.drishti_result.errors:
                lines.append(f"  Errors: {len(self.drishti_result.errors)}")
        
        if self.total_errors:
            lines.append(f"\nTotal Errors: {len(self.total_errors)}")
            for error in self.total_errors[:5]:  # Show first 5 errors
                lines.append(f"  - {error}")
            if len(self.total_errors) > 5:
                lines.append(f"  ... and {len(self.total_errors) - 5} more")
        
        return "\n".join(lines)

class CombinedScraper:
    """Combined scraper for both GKToday and DrishtiIAS with production optimizations"""
    
    def __init__(self):
        self.gktoday_scraper = None
        self.drishti_scraper = None
        
    def _run_gktoday_scraper(self, max_pages: int, max_articles: int) -> GKTodayResult:
        """Run GKToday scraper in a separate thread"""
        try:
            logger.info("Starting GKToday scraper...")
            scraper = EnhancedGKTodayScraper()
            result = scraper.sync_articles(max_pages=max_pages, max_articles=max_articles)
            scraper.close()
            logger.info(f"GKToday scraper completed: {result.articles_scraped} articles")
            return result
        except Exception as e:
            logger.error(f"Error in GKToday scraper: {e}")
            return GKTodayResult(
                success=False,
                articles_scraped=0,
                articles_skipped=0,
                errors=[f"GKToday scraper failed: {e}"],
                runtime_seconds=0
            )
    
    def _run_drishti_scraper(self, max_days: int, max_articles: int) -> DrishtiResult:
        """Run DrishtiIAS scraper in a separate thread"""
        try:
            logger.info("Starting DrishtiIAS scraper...")
            scraper = EnhancedDrishtiScraperFixed()
            result = scraper.sync_articles(max_days=max_days, max_articles=max_articles)
            scraper.close()
            logger.info(f"DrishtiIAS scraper completed: {result.articles_scraped} articles")
            return result
        except Exception as e:
            logger.error(f"Error in DrishtiIAS scraper: {e}")
            return DrishtiResult(
                success=False,
                articles_scraped=0,
                articles_skipped=0,
                errors=[f"DrishtiIAS scraper failed: {e}"],
                runtime_seconds=0
            )
    
    def sync_articles(
        self,
        sources: List[str] = ['gktoday', 'drishti'],
        max_days: int = 3,
        max_articles_per_source: int = 50,
        max_pages_gktoday: int = 10,
        parallel: bool = True
    ) -> CombinedScrapingResult:
        """
        Sync articles from specified sources
        
        Args:
            sources: List of sources to scrape ('gktoday', 'drishti')
            max_days: Maximum days to check for DrishtiIAS
            max_articles_per_source: Maximum articles per source
            max_pages_gktoday: Maximum pages for GKToday
            parallel: Whether to run scrapers in parallel
        
        Returns:
            CombinedScrapingResult with results from all sources
        """
        start_time = time.time()
        logger.info(f"Starting combined scraper for sources: {sources}")
        
        gktoday_result = None
        drishti_result = None
        
        if parallel and len(sources) > 1:
            # Run scrapers in parallel
            logger.info("Running scrapers in parallel...")
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                futures = {}
                
                if 'gktoday' in sources:
                    futures['gktoday'] = executor.submit(
                        self._run_gktoday_scraper,
                        max_pages_gktoday,
                        max_articles_per_source
                    )
                
                if 'drishti' in sources:
                    futures['drishti'] = executor.submit(
                        self._run_drishti_scraper,
                        max_days,
                        max_articles_per_source
                    )
                
                # Collect results
                for source, future in futures.items():
                    try:
                        if source == 'gktoday':
                            gktoday_result = future.result(timeout=300)  # 5 minute timeout
                        elif source == 'drishti':
                            drishti_result = future.result(timeout=300)  # 5 minute timeout
                    except concurrent.futures.TimeoutError:
                        logger.error(f"{source} scraper timed out")
                        if source == 'gktoday':
                            gktoday_result = GKTodayResult(
                                success=False,
                                articles_scraped=0,
                                articles_skipped=0,
                                errors=[f"{source} scraper timed out"],
                                runtime_seconds=300
                            )
                        elif source == 'drishti':
                            drishti_result = DrishtiResult(
                                success=False,
                                articles_scraped=0,
                                articles_skipped=0,
                                errors=[f"{source} scraper timed out"],
                                runtime_seconds=300
                            )
                    except Exception as e:
                        logger.error(f"Error getting result from {source}: {e}")
        
        else:
            # Run scrapers sequentially
            logger.info("Running scrapers sequentially...")
            
            if 'gktoday' in sources:
                gktoday_result = self._run_gktoday_scraper(
                    max_pages_gktoday,
                    max_articles_per_source
                )
            
            if 'drishti' in sources:
                drishti_result = self._run_drishti_scraper(
                    max_days,
                    max_articles_per_source
                )
        
        # Calculate combined results
        total_articles_scraped = 0
        total_articles_skipped = 0
        total_errors = []
        overall_success = True
        
        if gktoday_result:
            total_articles_scraped += gktoday_result.articles_scraped
            total_articles_skipped += gktoday_result.articles_skipped
            total_errors.extend(gktoday_result.errors)
            if not gktoday_result.success:
                overall_success = False
        
        if drishti_result:
            total_articles_scraped += drishti_result.articles_scraped
            total_articles_skipped += drishti_result.articles_skipped
            total_errors.extend(drishti_result.errors)
            if not drishti_result.success:
                overall_success = False
        
        runtime = time.time() - start_time
        
        result = CombinedScrapingResult(
            success=overall_success,
            gktoday_result=gktoday_result,
            drishti_result=drishti_result,
            total_articles_scraped=total_articles_scraped,
            total_articles_skipped=total_articles_skipped,
            total_errors=total_errors,
            runtime_seconds=runtime
        )
        
        logger.info(f"Combined scraper completed: {total_articles_scraped} articles scraped in {runtime:.2f}s")
        
        return result
    
    def close(self):
        """Clean up resources"""
        if self.gktoday_scraper:
            self.gktoday_scraper.close()
        if self.drishti_scraper:
            self.drishti_scraper.close()

# Convenience functions for easy integration

def sync_latest_articles(
    days: int = 3,
    sources: List[str] = ['gktoday', 'drishti'],
    max_articles_per_source: int = 50,
    parallel: bool = True
) -> CombinedScrapingResult:
    """
    Convenience function to sync latest articles
    
    Args:
        days: Number of days to check (primarily for DrishtiIAS)
        sources: List of sources to scrape
        max_articles_per_source: Maximum articles per source
        parallel: Whether to run scrapers in parallel
    
    Returns:
        CombinedScrapingResult
    """
    scraper = CombinedScraper()
    try:
        return scraper.sync_articles(
            sources=sources,
            max_days=days,
            max_articles_per_source=max_articles_per_source,
            parallel=parallel
        )
    finally:
        scraper.close()

def sync_gktoday_only(max_pages: int = 5, max_articles: int = 50) -> CombinedScrapingResult:
    """Sync only GKToday articles"""
    return sync_latest_articles(
        sources=['gktoday'],
        max_articles_per_source=max_articles,
        parallel=False
    )

def sync_drishti_only(days: int = 3, max_articles: int = 50) -> CombinedScrapingResult:
    """Sync only DrishtiIAS articles"""
    return sync_latest_articles(
        days=days,
        sources=['drishti'],
        max_articles_per_source=max_articles,
        parallel=False
    )

# For backward compatibility with existing code
def run_sync_scrapers(
    days: int = 3,
    sources: List[str] = ['gktoday', 'drishti']
) -> Dict:
    """
    Backward compatibility function
    
    Returns:
        Dict with results in the old format
    """
    result = sync_latest_articles(days=days, sources=sources)
    
    return {
        'success': result.success,
        'total_articles': result.total_articles_scraped,
        'gktoday_articles': result.gktoday_result.articles_scraped if result.gktoday_result else 0,
        'drishti_articles': result.drishti_result.articles_scraped if result.drishti_result else 0,
        'runtime_seconds': result.runtime_seconds,
        'errors': result.total_errors
    }

def main():
    """Main function for command line usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Combined Article Scraper")
    parser.add_argument("--sources", nargs='+', default=['gktoday', 'drishti'], 
                       choices=['gktoday', 'drishti'], help="Sources to scrape")
    parser.add_argument("--days", type=int, default=3, help="Days to check (for DrishtiIAS)")
    parser.add_argument("--max-articles", type=int, default=50, help="Max articles per source")
    parser.add_argument("--max-pages", type=int, default=5, help="Max pages for GKToday")
    parser.add_argument("--sequential", action="store_true", help="Run scrapers sequentially")
    parser.add_argument("--log-level", default="INFO", help="Log level")
    parser.add_argument("--quiet", action="store_true", help="Quiet mode (less output)")
    
    args = parser.parse_args()
    
    # Set up logging
    log_level = getattr(logging, args.log_level.upper())
    if args.quiet:
        log_level = logging.WARNING
    
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    scraper = CombinedScraper()
    try:
        result = scraper.sync_articles(
            sources=args.sources,
            max_days=args.days,
            max_articles_per_source=args.max_articles,
            max_pages_gktoday=args.max_pages,
            parallel=not args.sequential
        )
        
        if not args.quiet:
            print(result.summary)
        else:
            # Just print essential info in quiet mode
            print(f"Success: {result.success}")
            print(f"Articles scraped: {result.total_articles_scraped}")
            print(f"Articles skipped: {result.total_articles_skipped}")
            print(f"Runtime: {result.runtime_seconds:.2f}s")
        
        return 0 if result.success else 1
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        if not args.quiet:
            print(f"Fatal error: {e}")
        return 1
    finally:
        scraper.close()

if __name__ == "__main__":
    sys.exit(main())
