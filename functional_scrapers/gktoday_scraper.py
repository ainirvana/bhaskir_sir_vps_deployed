import requests
from bs4 import BeautifulSoup
import csv
import json
from datetime import datetime
import time
import os
import sys
import re
from dateutil import parser
import psycopg2
from psycopg2.extras import DictCursor, register_uuid
import uuid
import logging

# Database configuration - using the DATABASE_URL from .env.local
from dotenv import load_dotenv

# Load environment variables from .env.local
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
dotenv_path = os.path.join(root_dir, '.env.local')
load_dotenv(dotenv_path)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(root_dir, "gktoday_scraper.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Get the database connection string from environment
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

class DatabaseManager:
    def __init__(self):
        self.conn = None
        self.cursor = None
        register_uuid()
        
    def connect(self):
        try:
            self.conn = psycopg2.connect(DATABASE_URL)
            self.cursor = self.conn.cursor(cursor_factory=DictCursor)
            self._create_tables()
            logger.info("Successfully connected to the database")
        except Exception as e:
            logger.error(f"Error connecting to the database: {e}")
            raise

    def _create_tables(self):
        try:
            # Create articles table
            self.cursor.execute("""
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
            """)

            # Create sections table
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS sections (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    article_id UUID REFERENCES gk_today_content(id),
                    heading TEXT,
                    content TEXT,
                    type TEXT CHECK (type IN ('paragraph', 'list')),
                    sequence_order INTEGER
                )
            """)

            # Create section_bullets table
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS section_bullets (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    section_id UUID REFERENCES sections(id),
                    content TEXT NOT NULL,
                    bullet_order INTEGER
                )
            """)

            self.conn.commit()
            logger.info("Database tables created successfully")
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error creating tables: {e}")
            raise

    def check_article_exists(self, url):
        """Check if an article already exists in the database"""
        try:
            self.cursor.execute("SELECT id FROM gk_today_content WHERE url = %s", (url,))
            return self.cursor.fetchone() is not None
        except Exception as e:
            logger.error(f"Error checking article existence: {e}")
            return False

    def insert_article(self, article_data):
        try:
            # First check if article already exists
            if self.check_article_exists(article_data['url']):
                logger.info(f"Article already exists: {article_data['title']}")
                return None
            
            # Parse date
            published_date = None
            if article_data.get('date') and article_data['date'] != "No date":
                try:
                    published_date = parser.parse(article_data['date']).date()
                except Exception as e:
                    logger.warning(f"Could not parse date '{article_data['date']}': {e}")
            
            # Insert article
            self.cursor.execute("""
                INSERT INTO gk_today_content (title, url, image_url, published_date, intro, sequence_order, date, source_name)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                article_data['title'],
                article_data['url'],
                article_data.get('image_url', ''),
                published_date,
                article_data.get('content', ''),
                article_data.get('sequence_order', 0),
                article_data.get('date', ''),
                'GKToday'
            ))
            
            result = self.cursor.fetchone()
            if not result:
                logger.warning(f"Article insert failed: {article_data['title']}")
                return None
                
            article_id = result[0]
            logger.info(f"Inserted new article: {article_data['title']}")

            # Insert sections and bullet points
            if 'sections' in article_data:
                for idx, section in enumerate(article_data['sections']):
                    self.cursor.execute("""
                        INSERT INTO sections (article_id, heading, content, type, sequence_order)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        article_id,
                        section['title'],
                        section['content'],
                        'list' if section.get('bullet_points') else 'paragraph',
                        idx
                    ))
                    
                    section_id = self.cursor.fetchone()[0]

                    # Insert bullet points if any
                    if section.get('bullet_points'):
                        for bullet_idx, bullet in enumerate(section['bullet_points']):
                            self.cursor.execute("""
                                INSERT INTO section_bullets (section_id, content, bullet_order)
                                VALUES (%s, %s, %s)
                            """, (section_id, bullet, bullet_idx))

            self.conn.commit()
            return article_id
            
        except psycopg2.IntegrityError as e:
            self.conn.rollback()
            if "duplicate key value violates unique constraint" in str(e):
                logger.info(f"Duplicate article skipped: {article_data['title']}")
                return None
            else:
                logger.error(f"Database integrity error: {e}")
                raise
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error inserting article data: {e}")
            raise

    def close(self):
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")

class EnhancedGKTodayScraper:
    def __init__(self):
        self.base_url = "https://www.gktoday.in"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        self.latest_date = None
        self.latest_date_parsed = None
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.db = None
        self.connect_to_db()

    def connect_to_db(self):
        try:
            self.db = DatabaseManager()
            self.db.connect()
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def get_next_page_url(self, soup):
        """Find the URL of the next page"""
        # Method 1: Look for numbered pagination links
        if soup.select('.page-numbers'):
            current = None
            highest = 1
            
            # Find current and highest page numbers
            for item in soup.select('.page-numbers'):
                text = item.get_text(strip=True)
                if text.isdigit():
                    num = int(text)
                    if 'current' in item.get('class', []):
                        current = num
                    elif num > highest:
                        highest = num
            
            # If we found the current page, construct next page URL
            if current and current < highest:
                return f"{self.base_url}/page/{current + 1}/"
        
        # Method 2: Look for "next" link
        next_selectors = [
            '.next.page-numbers',
            'a.next',
            'a.next-posts',
            'a[rel="next"]'
        ]
        
        for selector in next_selectors:
            next_link = soup.select_one(selector)
            if next_link and next_link.name == 'a':
                href = next_link.get('href')
                if href:
                    return href if href.startswith('http') else self.base_url + href
        
        return None

    def get_page_content(self, url, retries=3):
        """Fetch page content with error handling and retries"""
        for attempt in range(retries):
            try:
                logger.info(f"Fetching: {url} (Attempt {attempt + 1})")
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                return response.text
            except requests.exceptions.RequestException as e:
                logger.warning(f"Error fetching {url} (Attempt {attempt + 1}): {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    logger.error(f"Failed to fetch {url} after {retries} attempts")
                    return None
    
    def get_detailed_article_content(self, article_url):
        """Get detailed content from the article page including bulleted lists and images"""
        if not article_url:
            return {"content": "", "sections": [], "image_url": ""}
        
        try:
            logger.info(f"Fetching detailed content from: {article_url}")
            content_html = self.get_page_content(article_url)
            if not content_html:
                return {"content": "", "sections": [], "image_url": ""}
            soup = BeautifulSoup(content_html, 'html.parser')
            
            article_content = {
                "content": "",
                "sections": [],
                "image_url": ""
            }
            
            # Look for main content container
            content_selectors = ['.post-content', '.entry-content', 'article', '.single-post-content', '.content', 'main']
            
            main_content = None
            for selector in content_selectors:
                content_container = soup.select_one(selector)
                if content_container:
                    main_content = content_container
                    break
            
            if not main_content:
                # Fallback to largest text container
                all_divs = soup.find_all('div')
                main_content = max(all_divs, key=lambda x: len(x.get_text()), default=None)
            
            if main_content:
                # Find the first paragraph and image
                paragraphs = main_content.find_all('p')
                for p in paragraphs:
                    text = p.get_text(strip=True)
                    if text and len(text) > 50:
                        article_content["content"] = text
                        break
                
                # Find image
                img_element = main_content.find('img')
                if img_element and 'src' in img_element.attrs:
                    article_content["image_url"] = img_element['src']
                    if not article_content["image_url"].startswith('http'):
                        article_content["image_url"] = self.base_url + article_content["image_url"]
                
                # Extract sections from headings with content
                headings = main_content.find_all(['h2', 'h3', 'h4'])
                for heading in headings:
                    section_title = heading.get_text(strip=True)
                    section_content = ""
                    bullet_points = []
                    current = heading.find_next_sibling()
                    
                    while current and current.name not in ['h2', 'h3', 'h4']:
                        if current.name == 'p':
                            section_content += current.get_text(strip=True) + " "
                        elif current.name == 'ul':
                            # Extract bullet points
                            for li in current.find_all('li'):
                                bullet_point = li.get_text(strip=True)
                                if bullet_point:
                                    bullet_points.append(bullet_point)
                        current = current.find_next_sibling()
                    
                    if section_content.strip() or bullet_points:
                        section = {
                            "title": section_title,
                            "content": section_content.strip(),
                            "bullet_points": bullet_points
                        }
                        article_content["sections"].append(section)
            
            return article_content
        except Exception as e:
            logger.error(f"Error getting detailed content: {e}")
            return {"content": "", "sections": [], "image_url": ""}
    
    def extract_article_data(self, article_element):
        """Extract article data from BS4 element"""
        try:
            # Skip if this is a pagination element or sidebar
            skip_classes = ['navigation', 'pagination', 'nav-links', 'page-numbers', 'sidebar', 'widget']
            if any(cls in str(article_element.get('class', [])).lower() for cls in skip_classes):
                return None
                
            # Find title and link
            title = "No title"
            article_url = ""
            
            # Look for link in common patterns
            link_candidates = [
                article_element.select_one('h1 a, h2 a, h3 a'),  # Headings with links
                article_element.select_one('.entry-title a'),     # WordPress style
                article_element.select_one('.post-title a'),      # Common blog style
                article_element.find('a', {'rel': 'bookmark'}),   # Another WordPress style
                article_element.find('a')                         # Any link as last resort
            ]
            
            for link in filter(None, link_candidates):
                href = link.get('href', '')
                if href and not any(x in href.lower() for x in ['/page/', '/tag/', '/category/', '/author/']):
                    title = link.get_text(strip=True)
                    article_url = href if href.startswith('http') else self.base_url + href
                    if len(title) > 5:  # Valid title found
                        break
            
            # Skip if we don't have both title and URL
            if len(title) <= 5 or not article_url:
                return None
            
            # Find date - look for the specific format "May dd, 2025"
            date = "No date"
            text_content = article_element.get_text()
            date_pattern = r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+2025\b'
            date_match = re.search(date_pattern, text_content)
            if date_match:
                date = date_match.group(0)
                # Ensure consistent format
                if ',' not in date:
                    date = date.replace(' 2025', ', 2025')
            
            # Find content
            content = ""
            paragraphs = article_element.find_all('p')
            for p in paragraphs:
                p_text = p.get_text(strip=True)
                # Look for a substantial paragraph that's not just a date
                if len(p_text) > 100 and not re.search(r'\b2025\b', p_text):
                    content = p_text
                    break
            
            return {
                'title': title,
                'url': article_url,
                'date': date,
                'content': content,
                'scraped_at': datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error extracting article data: {e}")
            return None
    
    def scrape_page(self, page_url, get_detailed_content=False):
        """Scrape a single page"""
        html_content = self.get_page_content(page_url)
        if not html_content:
            return [], [], None
        
        soup = BeautifulSoup(html_content, 'html.parser')
        seen_urls = set()  # Track seen URLs within this page
        
        # Find articles with different selectors
        article_selectors = [
            'article',  # Most common
            '.post',    # Common WordPress
            '.news-item', 
            'div[class*="post"]',
            '.entry',   # Another common WordPress
            '.article', 
            '.type-post',
            '.blog-post',
            '.content-area main article'
        ]
        
        articles = []
        for selector in article_selectors:
            found = soup.select(selector)
            if found:
                # Filter out navigation elements
                articles.extend([a for a in found if not any(cls in str(a.get('class', [])).lower() 
                    for cls in ['nav', 'navigation', 'pagina', 'page-numbers'])])
        
        # If no articles found with selectors, try finding all links that look like articles
        if not articles:
            all_links = soup.find_all('a', href=True)
            potential_articles = []
            for link in all_links:
                href = link['href']
                # Look for links that seem to be articles
                if (self.base_url in href and '/20' in href 
                    and not '/page/' in href 
                    and not any(x in href.lower() for x in ['feed', 'rss', 'atom', 'json'])):
                    container = link.find_parent(['article', 'div', 'section'])
                    if container and container not in potential_articles:
                        potential_articles.append(container)
            if potential_articles:
                articles = potential_articles
        
        page_articles = []
        page_dates = []
        
        # Process found articles
        for idx, article in enumerate(articles):
            article_data = self.extract_article_data(article)
            if article_data and article_data['url'] and article_data['url'] not in seen_urls:
                article_data['sequence_order'] = idx  # Add sequence order based on position on page
                seen_urls.add(article_data['url'])
                
                if get_detailed_content:
                    logger.info(f"Processing article: {article_data['title']}")
                    detailed = self.get_detailed_article_content(article_data['url'])
                    if detailed and (detailed['content'] or detailed['sections']):
                        article_data.update(detailed)
                    else:
                        logger.warning(f"Could not get detailed content for {article_data['url']}")
                
                page_articles.append(article_data)
                
                parsed_date = self.parse_date(article_data['date'])
                if parsed_date:
                    page_dates.append(parsed_date)
        
        # Find next page URL
        next_page = self.get_next_page_url(soup)
        
        if page_articles:
            logger.info(f"Found {len(page_articles)} articles on this page")
        return page_articles, page_dates, next_page
    
    def parse_date(self, date_string):
        """Parse date string to datetime"""
        try:
            return parser.parse(date_string)
        except:
            return None
            
    def scrape_articles(self, get_detailed_content=False, max_pages=20, sync_until_existing=True):
        """Scrape articles from multiple pages and save to database, continuing until we find existing articles"""
        current_url = self.base_url
        page_count = 1
        seen_urls = set()  # Track all seen URLs across pages
        existing_article_count = 0
        consecutive_existing = 0
        max_consecutive_existing = 3  # Stop after finding this many consecutive existing articles
        articles_saved = 0
        
        while current_url and page_count <= max_pages:
            logger.info(f"Scraping page {page_count}: {current_url}")
            
            # Get articles from current page
            page_articles, dates, next_page = self.scrape_page(current_url, get_detailed_content)
            
            new_articles_on_this_page = False
            
            # Process articles on this page
            for article in page_articles:
                if article['url'] and article['url'] not in seen_urls:
                    seen_urls.add(article['url'])
                    try:
                        # Check if article already exists by trying to insert it
                        article_id = self.db.insert_article(article)
                        
                        if article_id:
                            articles_saved += 1
                            consecutive_existing = 0  # Reset counter since we found a new article
                            new_articles_on_this_page = True
                            logger.info(f"Saved new article: {article['title']} (Date: {article['date']})")
                        else:
                            # Article already exists
                            existing_article_count += 1
                            consecutive_existing += 1
                            logger.info(f"Article already exists: {article['title']} (Date: {article['date']})")
                            
                            # If we've found enough consecutive existing articles, assume we've caught up
                            if sync_until_existing and consecutive_existing >= max_consecutive_existing:
                                logger.info(f"Found {consecutive_existing} consecutive existing articles. Stopping scraping.")
                                break
                    except Exception as e:
                        if "duplicate key value violates unique constraint" in str(e):
                            existing_article_count += 1
                            consecutive_existing += 1
                            logger.info(f"Article already exists (by constraint): {article['title']}")
                            
                            if sync_until_existing and consecutive_existing >= max_consecutive_existing:
                                logger.info(f"Found {consecutive_existing} consecutive existing articles. Stopping scraping.")
                                break
                        else:
                            logger.error(f"Error saving article {article['title']}: {e}")
                            raise
            
            # Stop if we've found enough consecutive existing articles
            if sync_until_existing and consecutive_existing >= max_consecutive_existing:
                logger.info("Stopped scraping as we've found enough consecutive existing articles")
                break
            
            # Check for next page
            if next_page:
                # Validate next page URL
                if next_page == current_url or next_page in seen_urls:
                    logger.info("Next page URL already seen, stopping pagination")
                    break
                current_url = next_page
                page_count += 1
                logger.info(f"Moving to page {page_count}")
                time.sleep(2)  # Be polite to the server
            else:
                logger.info("No next page found")
                break
        
        logger.info(f"Total new articles saved to database: {articles_saved}")
        logger.info(f"Total existing articles found: {existing_article_count}")
        return articles_saved

def main():
    scraper = None
    try:
        scraper = EnhancedGKTodayScraper()
        logger.info("Starting to scrape GKToday...")
        count = scraper.scrape_articles(get_detailed_content=True, max_pages=20, sync_until_existing=True)
        logger.info(f"Scraping completed! Saved {count} new articles.")
        return count
    except Exception as e:
        logger.error(f"An error occurred: {e}")
        raise
    finally:
        if scraper and scraper.db:
            scraper.db.close()

if __name__ == "__main__":
    main()
