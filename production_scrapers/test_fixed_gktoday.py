#!/usr/bin/env python3
"""
Test the fixed GKToday scraper with legacy logic
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env.local')

# Add the directory to the path to import our scraper
sys.path.insert(0, os.path.dirname(__file__))

from gktoday_scraper import EnhancedGKTodayScraper

def test_gktoday_scraper():
    """Test the GKToday scraper with the copied legacy logic"""
    scraper = None
    try:
        print("=" * 60)
        print("TESTING FIXED GKTODAY SCRAPER WITH LEGACY LOGIC")
        print("=" * 60)
        
        scraper = EnhancedGKTodayScraper()
        
        if not scraper.connect_to_db():
            print("Failed to connect to database!")
            return False
        
        print("\nTesting article discovery on GKToday homepage...")
        
        # Test just the page scraping without detailed content
        page_articles, next_page = scraper.scrape_page("https://www.gktoday.in", get_detailed_content=False)
        
        print(f"\nFound {len(page_articles)} articles on homepage:")
        for i, article in enumerate(page_articles[:5]):  # Show first 5
            print(f"  {i+1}. {article['title']}")
            print(f"     URL: {article['url']}")
            print(f"     Date: {article['date']}")
            print()
        
        if page_articles:
            print("SUCCESS: Articles found successfully with legacy logic!")
            return True
        else:
            print("FAILURE: No articles found")
            return False
            
    except Exception as e:
        print(f"Error testing scraper: {e}")
        return False
    finally:
        if scraper:
            scraper.close()

if __name__ == "__main__":
    success = test_gktoday_scraper()
    sys.exit(0 if success else 1)
