#!/usr/bin/env python3
"""
Command-line interface for the production scraper service
Usage examples:
  python cli.py start --gktoday --drishti --max-pages 3
  python cli.py status
  python cli.py result
  python cli.py quick --max-articles 10
  python cli.py latest --limit 5
"""

import argparse
import json
import sys
import time
from typing import Optional

from scraper_service import (
    get_scraper_service,
    quick_scrape,
    get_latest_articles,
    ScrapingStatus
)
from combined_scraper import CombinedScraper

def start_scraping_command(args):
    """Start a scraping operation"""
    service = get_scraper_service()
    
    if service.is_running():
        print(json.dumps({
            "success": False,
            "error": "Scraping operation already in progress"
        }))
        return 1
    
    result = service.start_scraping(
        gktoday_enabled=args.gktoday,
        drishti_enabled=args.drishti,
        max_pages=args.max_pages,
        max_articles=args.max_articles,
        parallel=args.parallel
    )
    
    print(json.dumps(result))
    
    # If --wait flag is set, wait for completion and show progress
    if args.wait:
        print("Waiting for scraping to complete...", file=sys.stderr)
        while service.is_running():
            status = service.get_status()
            print(f"Progress: {status['progress_percentage']:.1f}% - {status['status']}", file=sys.stderr)
            time.sleep(2)
        
        final_result = service.get_result()
        if final_result:
            print("Final result:", file=sys.stderr)
            print(json.dumps(final_result, indent=2))
    
    return 0

def status_command(args):
    """Get current scraping status"""
    service = get_scraper_service()
    status = service.get_status()
    print(json.dumps(status, indent=2 if args.pretty else None))
    return 0

def result_command(args):
    """Get last scraping result"""
    service = get_scraper_service()
    result = service.get_result()
    if result:
        print(json.dumps(result, indent=2 if args.pretty else None))
    else:
        print(json.dumps({"message": "No result available"}))
    return 0

def cancel_command(args):
    """Cancel current scraping operation"""
    service = get_scraper_service()
    result = service.cancel_scraping()
    print(json.dumps(result))
    return 0

def quick_command(args):
    """Run a quick synchronous scraping operation"""
    try:
        scraper = CombinedScraper()
        
        # Map CLI args to scraper method parameters
        sources = []
        if args.gktoday:
            sources.append('gktoday')
        if args.drishti:
            sources.append('drishti')
        
        # Default to both if none specified
        if not sources:
            sources = ['gktoday', 'drishti']
        
        print(f"DEBUG: Running scrapers for sources: {sources}")  # Debug line
        
        result = scraper.sync_articles(
            sources=sources,
            max_days=3,  # Default for DrishtiIAS
            max_articles_per_source=args.max_articles,
            max_pages_gktoday=args.max_pages,
            parallel=True
        )
        
        # Convert to dict for JSON serialization
        result_dict = {
            "success": result.success,
            "total_articles_scraped": result.total_articles_scraped,
            "total_articles_skipped": result.total_articles_skipped,
            "runtime_seconds": result.runtime_seconds,
            "total_errors": result.total_errors,
            "summary": result.summary
        }
        
        print(json.dumps(result_dict, indent=2 if args.pretty else None))
        return 0 if result.success else 1
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        return 1

def latest_command(args):
    """Get latest articles from database"""
    try:
        articles = get_latest_articles(limit=args.limit)
        print(json.dumps(articles, indent=2 if args.pretty else None))
        return 0
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        return 1

def monitor_command(args):
    """Monitor scraping progress in real-time"""
    service = get_scraper_service()
    
    print("Monitoring scraper status... Press Ctrl+C to exit")
    try:
        while True:
            status = service.get_status()
            
            # Clear screen (works on most terminals)
            print("\033[2J\033[H", end="")
            
            print("=== SCRAPER STATUS MONITOR ===")
            print(f"Status: {status['status']}")
            print(f"Progress: {status['progress_percentage']:.1f}%")
            print(f"Articles Scraped: {status['articles_scraped']}")
            print(f"Articles Skipped: {status['articles_skipped']}")
            
            if status['current_scraper']:
                print(f"Current Scraper: {status['current_scraper']}")
            
            if status['errors']:
                print(f"Errors: {len(status['errors'])}")
                if args.show_errors:
                    for error in status['errors'][:3]:
                        print(f"  - {error}")
            
            if status['estimated_remaining_seconds']:
                print(f"Estimated remaining: {status['estimated_remaining_seconds']}s")
            
            print(f"\nLast updated: {time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            if status['status'] not in ['running']:
                print("Scraping is not running. Exiting monitor.")
                break
                
            time.sleep(args.interval)
            
    except KeyboardInterrupt:
        print("\nMonitoring stopped.")
    
    return 0

def main():
    parser = argparse.ArgumentParser(
        description="Production scraper CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli.py start --gktoday --drishti --max-pages 3 --wait
  python cli.py quick --max-articles 10 --pretty
  python cli.py status --pretty
  python cli.py latest --limit 5
  python cli.py monitor --interval 3
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Start command
    start_parser = subparsers.add_parser('start', help='Start scraping operation')
    start_parser.add_argument('--gktoday', action='store_true', help='Enable GKToday scraping')
    start_parser.add_argument('--drishti', action='store_true', help='Enable DrishtiIAS scraping')
    start_parser.add_argument('--max-pages', type=int, default=3, help='Maximum pages to scrape')
    start_parser.add_argument('--max-articles', type=int, default=20, help='Maximum articles to scrape')
    start_parser.add_argument('--parallel', action='store_true', default=True, help='Run scrapers in parallel')
    start_parser.add_argument('--wait', action='store_true', help='Wait for completion and show progress')
    start_parser.set_defaults(func=start_scraping_command)
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Get scraping status')
    status_parser.add_argument('--pretty', action='store_true', help='Pretty print JSON')
    status_parser.set_defaults(func=status_command)
    
    # Result command
    result_parser = subparsers.add_parser('result', help='Get last scraping result')
    result_parser.add_argument('--pretty', action='store_true', help='Pretty print JSON')
    result_parser.set_defaults(func=result_command)
    
    # Cancel command
    cancel_parser = subparsers.add_parser('cancel', help='Cancel current scraping')
    cancel_parser.set_defaults(func=cancel_command)
    
    # Quick command
    quick_parser = subparsers.add_parser('quick', help='Run quick synchronous scraping')
    quick_parser.add_argument('--gktoday', action='store_true', help='Enable GKToday scraping')
    quick_parser.add_argument('--drishti', action='store_true', help='Enable DrishtiIAS scraping')
    quick_parser.add_argument('--max-pages', type=int, default=2, help='Maximum pages to scrape')
    quick_parser.add_argument('--max-articles', type=int, default=10, help='Maximum articles to scrape')
    quick_parser.add_argument('--pretty', action='store_true', help='Pretty print JSON')
    quick_parser.set_defaults(func=quick_command)
    
    # Latest command
    latest_parser = subparsers.add_parser('latest', help='Get latest articles')
    latest_parser.add_argument('--limit', type=int, default=10, help='Number of articles to fetch')
    latest_parser.add_argument('--pretty', action='store_true', help='Pretty print JSON')
    latest_parser.set_defaults(func=latest_command)
    
    # Monitor command
    monitor_parser = subparsers.add_parser('monitor', help='Monitor scraping progress')
    monitor_parser.add_argument('--interval', type=int, default=2, help='Update interval in seconds')
    monitor_parser.add_argument('--show-errors', action='store_true', help='Show error details')
    monitor_parser.set_defaults(func=monitor_command)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    return args.func(args)

if __name__ == "__main__":
    sys.exit(main())
