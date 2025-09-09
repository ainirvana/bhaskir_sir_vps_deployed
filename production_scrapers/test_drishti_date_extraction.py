#!/usr/bin/env python3
"""
Test script to verify Drishti IAS date extraction improvements
"""

import sys
import os
import logging
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from production_scrapers.drishti_scraper import EnhancedDrishtiScraperFixed

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def test_date_extraction():
    """Test the enhanced date extraction functionality"""
    print("🧪 Testing Drishti IAS Date Extraction")
    print("=" * 50)
    
    scraper = EnhancedDrishtiScraperFixed()
    
    # Test date extraction patterns
    test_cases = [
        "Published on 29 January, 2025",
        "Date: January 29, 2025",
        "29th January 2025",
        "Jan 29, 2025",
        "29/01/2025",
        "2025-01-29",
        "29-01-2025",
        "This article was published on 15 December, 2024 and updated recently",
        "No date information here"
    ]
    
    print("Testing date extraction patterns:")
    for i, test_text in enumerate(test_cases, 1):
        extracted_date = scraper.extract_date(test_text)
        print(f"{i:2d}. Input: '{test_text}'")
        print(f"    Output: {extracted_date}")
        print()
    
    # Test with a real Drishti IAS article
    print("🌐 Testing with real Drishti IAS article...")
    
    # Test URL - recent article
    test_url = "https://www.drishtiias.com/daily-news-analysis/india-s-first-air-quality-sensor-network"
    
    try:
        article_data = scraper.scrape_article_content(test_url)
        
        if article_data:
            print(f"✅ Successfully scraped article:")
            print(f"   Title: {article_data['title']}")
            print(f"   Date (string): {article_data.get('date', 'N/A')}")
            print(f"   Date (parsed): {article_data.get('published_date', 'N/A')}")
            print(f"   Image URL: {article_data.get('image_url', 'N/A')}")
            print(f"   Intro length: {len(article_data.get('intro', ''))}")
            print(f"   Sections count: {len(article_data.get('sections', []))}")
            print(f"   Importance: {article_data.get('importance_rating', 'N/A')}")
        else:
            print("❌ Failed to scrape article")
            
    except Exception as e:
        print(f"❌ Error testing real article: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Date extraction test completed!")

if __name__ == "__main__":
    test_date_extraction()