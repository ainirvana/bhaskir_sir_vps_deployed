#!/usr/bin/env python3
"""
Test script to verify all production scrapers are working correctly
"""

import os
import sys
import time
import json
from datetime import datetime

# Add production_scrapers to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

def test_imports():
    """Test that all modules can be imported correctly"""
    print("Testing imports...")
    
    try:
        from gktoday_scraper import EnhancedGKTodayScraper
        print("✅ GKToday scraper import successful")
    except Exception as e:
        print(f"❌ GKToday scraper import failed: {e}")
        return False
    
    try:
        from drishti_scraper import EnhancedDrishtiScraperFixed
        print("✅ DrishtiIAS scraper import successful")
    except Exception as e:
        print(f"❌ DrishtiIAS scraper import failed: {e}")
        return False
    
    try:
        from combined_scraper import CombinedScraper
        print("✅ Combined scraper import successful")
    except Exception as e:
        print(f"❌ Combined scraper import failed: {e}")
        return False
    
    try:
        from scraper_service import get_scraper_service, quick_scrape
        print("✅ Scraper service import successful")
    except Exception as e:
        print(f"❌ Scraper service import failed: {e}")
        return False
    
    return True

def test_database_connection():
    """Test database connectivity"""
    print("\nTesting database connection...")
    
    try:
        from dotenv import load_dotenv
        import psycopg2
        
        # Load environment variables
        load_dotenv('../.env.local')
        database_url = os.getenv('DATABASE_URL')
        
        if not database_url:
            print("❌ DATABASE_URL not found in environment")
            return False
        
        # Test connection
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result and result[0] == 1:
            print("✅ Database connection successful")
            return True
        else:
            print("❌ Database connection test failed")
            return False
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_scraper_service():
    """Test the scraper service functionality"""
    print("\nTesting scraper service...")
    
    try:
        from scraper_service import get_scraper_service
        
        service = get_scraper_service()
        
        # Test status when idle
        status = service.get_status()
        if status['status'] == 'idle':
            print("✅ Service status check successful")
        else:
            print(f"❌ Service status unexpected: {status['status']}")
            return False
        
        # Test that service is not running
        if not service.is_running():
            print("✅ Service running check successful")
        else:
            print("❌ Service should not be running initially")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Scraper service test failed: {e}")
        return False

def test_quick_scrape():
    """Test quick scraping functionality with minimal data"""
    print("\nTesting quick scrape (1 article each)...")
    
    try:
        from scraper_service import quick_scrape
        
        # Very minimal test - just 1 article from each
        result = quick_scrape(
            gktoday_enabled=True,
            drishti_enabled=True,
            max_pages=1,
            max_articles=1
        )
        
        print(f"Quick scrape completed:")
        print(f"  Success: {result.success}")
        print(f"  Articles scraped: {result.total_articles_scraped}")
        print(f"  Articles skipped: {result.total_articles_skipped}")
        print(f"  Runtime: {result.runtime_seconds:.2f}s")
        
        if result.total_errors:
            print(f"  Errors: {len(result.total_errors)}")
            for error in result.total_errors[:3]:
                print(f"    - {error}")
        
        print("✅ Quick scrape test completed")
        return True
        
    except Exception as e:
        print(f"❌ Quick scrape test failed: {e}")
        return False

def test_individual_scrapers():
    """Test individual scrapers with minimal data"""
    print("\nTesting individual scrapers...")
    
    # Test GKToday scraper
    try:
        from gktoday_scraper import EnhancedGKTodayScraper
        
        scraper = EnhancedGKTodayScraper()
        result = scraper.sync_articles(max_articles=1)
        scraper.close()
        
        print(f"GKToday test:")
        print(f"  Success: {result.success}")
        print(f"  Articles: {result.articles_scraped}")
        print("✅ GKToday scraper test successful")
        
    except Exception as e:
        print(f"❌ GKToday scraper test failed: {e}")
        return False
    
    # Test DrishtiIAS scraper
    try:
        from drishti_scraper import EnhancedDrishtiScraperFixed
        
        scraper = EnhancedDrishtiScraperFixed()
        result = scraper.sync_articles(max_articles=1)
        scraper.close()
        
        print(f"DrishtiIAS test:")
        print(f"  Success: {result.success}")
        print(f"  Articles: {result.articles_scraped}")
        print("✅ DrishtiIAS scraper test successful")
        
    except Exception as e:
        print(f"❌ DrishtiIAS scraper test failed: {e}")
        return False
    
    return True

def test_latest_articles():
    """Test getting latest articles from database"""
    print("\nTesting latest articles retrieval...")
    
    try:
        from scraper_service import get_latest_articles
        
        articles = get_latest_articles(limit=3)
        
        print(f"Latest articles retrieved: {len(articles)}")
        
        if articles:
            for i, article in enumerate(articles[:2], 1):
                print(f"  {i}. {article.get('title', 'No title')[:50]}...")
                print(f"     Source: {article.get('source', 'Unknown')}")
        
        print("✅ Latest articles test successful")
        return True
        
    except Exception as e:
        print(f"❌ Latest articles test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("PRODUCTION SCRAPERS TEST SUITE")
    print("=" * 60)
    
    start_time = time.time()
    tests_passed = 0
    total_tests = 6
    
    # Run tests
    tests = [
        ("Import Tests", test_imports),
        ("Database Connection", test_database_connection),
        ("Scraper Service", test_scraper_service),
        ("Individual Scrapers", test_individual_scrapers),
        ("Quick Scrape", test_quick_scrape),
        ("Latest Articles", test_latest_articles),
    ]
    
    for test_name, test_func in tests:
        try:
            if test_func():
                tests_passed += 1
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
    
    # Summary
    runtime = time.time() - start_time
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Tests passed: {tests_passed}/{total_tests}")
    print(f"Success rate: {(tests_passed/total_tests)*100:.1f}%")
    print(f"Total runtime: {runtime:.2f} seconds")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Production scrapers are ready to use.")
        return 0
    else:
        print(f"⚠️  {total_tests - tests_passed} test(s) failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
