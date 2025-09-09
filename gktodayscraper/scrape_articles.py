# Your updated scraping code
def scrape_articles(self, get_detailed_content=False, max_pages=5):
    """Scrape articles from multiple pages and save to database"""
    current_url = self.base_url
    page_count = 1
    seen_urls = set()  # Track all seen URLs across pages
    latest_date_str = None
    latest_date = None
    articles_saved = 0
    
    while current_url and page_count <= max_pages:
        print(f"\nScraping page {page_count}: {current_url}")
        
        # Get articles from current page
        page_articles, dates, next_page = self.scrape_page(current_url, get_detailed_content)
        
        # Set latest date from first page if not set
        if not latest_date_str and page_articles:
            # Find first article with a valid date
            for article in page_articles:
                if article['date'] != "No date":
                    latest_date_str = article['date']
                    latest_date = self.parse_date(latest_date_str)
                    print(f"Found latest date: {latest_date_str}")
                    break
            
            if not latest_date_str:
                print("Could not determine latest date from articles")
                break

        # Process articles from current page
        current_page_articles = []
        found_different_date = False
        
        for article in page_articles:
            if article['url'] and article['url'] not in seen_urls:
                article_date = self.parse_date(article['date']) if article['date'] != "No date" else None
                
                # Only process articles from the latest date
                if article_date and latest_date:
                    if article_date.date() == latest_date.date():
                        current_page_articles.append(article)
                        seen_urls.add(article['url'])
                    else:
                        print(f"\nFound article from different date ({article['date']}). Will process remaining latest date articles first.")
                        found_different_date = True
        
        # Save all articles from the current page that match the latest date
        for article in current_page_articles:
            try:
                self.db.insert_article(article)
                articles_saved += 1
                print(f"Saved article: {article['title']}")
            except Exception as e:
                print(f"Error saving article {article['title']}: {e}")
                if "duplicate key value violates unique constraint" not in str(e):
                    raise
        
        # If we found an article from a different date, stop after processing this page
        if found_different_date:
            break
            
        # Check for next page
        if next_page:
            # Validate next page URL
            if next_page == current_url or next_page in seen_urls:
                print("Next page URL already seen, stopping pagination")
                break
            current_url = next_page
            page_count += 1
            print(f"Moving to page {page_count}")
            time.sleep(2)  # Be polite to the server
        else:
            print("No next page found")
            break
    
    print(f"\nTotal articles saved to database: {articles_saved}")
