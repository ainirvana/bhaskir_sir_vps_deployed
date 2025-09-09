"""
Production-ready GKToday scraper with smart sync capabilities
Optimized for Next.js integration and production use
"""

import requests
from bs4 import BeautifulSoup
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
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

# Load environment variables from parent directory
from dotenv import load_dotenv
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
dotenv_path = os.path.join(root_dir, '.env.local')
load_dotenv(dotenv_path)

# Set up logging
logger = logging.getLogger(__name__)

@dataclass
class ScrapingResult:
    """Result of a scraping operation"""
    success: bool
    articles_scraped: int
    articles_skipped: int
    errors: List[str]
    runtime_seconds: float

class DatabaseManager:
    """Enhanced database manager with production optimizations"""
    
    def __init__(self):
        self.conn = None
        self.cursor = None
        register_uuid()
        
    def connect(self):
        """Connect to database with proper error handling"""
        try:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL environment variable is not set")
            
            self.conn = psycopg2.connect(database_url)
            self.cursor = self.conn.cursor(cursor_factory=DictCursor)
            self._ensure_tables()
            logger.info("Database connection established successfully")
            return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def _ensure_tables(self):
        """Ensure all required tables exist"""
        try:
            # Check if main table exists
            self.cursor.execute("""
                SELECT EXISTS(
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'gk_today_content'
                )
            """)
            
            if not self.cursor.fetchone()[0]:
                logger.info("Creating database tables...")
                self._create_tables()
            else:
                logger.debug("Database tables already exist")
                
        except Exception as e:
            logger.error(f"Error checking/creating tables: {e}")
            raise
    
    def _create_tables(self):
        """Create all required tables"""
        tables_sql = [
            """
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
                importance_rating TEXT,
                date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS sections (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                article_id UUID REFERENCES gk_today_content(id) ON DELETE CASCADE,
                heading TEXT,
                content TEXT,
                type TEXT CHECK (type IN ('paragraph', 'list')),
                sequence_order INTEGER
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS section_bullets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                bullet_order INTEGER
            )
            """
        ]
        
        for sql in tables_sql:
            self.cursor.execute(sql)
        
        self.conn.commit()
        logger.info("Database tables created successfully")
    
    def article_exists(self, url: str) -> bool:
        """Check if article already exists in database"""
        try:
            self.cursor.execute("SELECT 1 FROM gk_today_content WHERE url = %s", (url,))
            return self.cursor.fetchone() is not None
        except Exception as e:
            logger.error(f"Error checking article existence: {e}")
            return False
    
    def insert_article(self, article_data: Dict) -> Optional[str]:
        """Insert article into database - EXACT COPY from working legacy scraper"""
        try:
            # First check if article already exists
            self.cursor.execute("SELECT id FROM gk_today_content WHERE url = %s", (article_data['url'],))
            existing = self.cursor.fetchone()
            
            if existing:
                logger.info(f"Article already exists: {article_data['title']}")
                return existing[0]  # Return existing article ID
            
            # Insert article using original schema
            self.cursor.execute("""
                INSERT INTO gk_today_content (title, url, image_url, published_date, intro, sequence_order, source_name)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (url) DO NOTHING
                RETURNING id
            """, (
                article_data['title'],
                article_data['url'],
                article_data.get('image_url', ''),
                parser.parse(article_data['date']).date() if article_data['date'] != "No date" else None,
                article_data.get('content', ''),
                article_data.get('sequence_order', 0),
                'GKToday'
            ))
            
            result = self.cursor.fetchone()
            if not result:
                logger.info(f"Article already exists (skipped): {article_data['title']}")
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
                        'list' if section['bullet_points'] else 'paragraph',
                        idx
                    ))
                    
                    section_id = self.cursor.fetchone()[0]

                    # Insert bullet points if any
                    if section['bullet_points']:
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
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.debug("Database connection closed")

class EnhancedGKTodayScraper:
    """Production-ready GKToday scraper with smart sync capabilities"""
    
    def __init__(self):
        self.base_url = "https://www.gktoday.in"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.db = DatabaseManager()
        self.rate_limit_delay = int(os.getenv('SCRAPER_RATE_LIMIT', '2'))
        
    def connect_to_db(self) -> bool:
        """Connect to database"""
        return self.db.connect()
    
    def fetch_page(self, url: str, retries: int = 3) -> Optional[requests.Response]:
        """Fetch page with retry logic"""
        for attempt in range(retries):
            try:
                logger.debug(f"Fetching {url} (attempt {attempt + 1})")
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                logger.warning(f"Fetch attempt {attempt + 1} failed: {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    logger.error(f"Failed to fetch {url} after {retries} attempts")
        return None
    
    def get_next_page_url(self, soup: BeautifulSoup) -> Optional[str]:
        """Find next page URL - using robust legacy logic"""
        try:
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
            
            # Method 3: Look for any link that seems to be the next page
            for link in soup.find_all('a', href=True):
                href = link.get('href', '')
                if '/page/' in href and href.endswith('/'):
                    try:
                        page_num = int(href.split('/page/')[1].strip('/'))
                        if page_num > 1:
                            return href if href.startswith('http') else self.base_url + href
                    except ValueError:
                        continue
            
            return None
            
        except Exception as e:
            logger.debug(f"Error finding next page: {e}")
            return None
    
    def parse_date(self, date_string: str) -> Optional[datetime]:
        """Parse date string with multiple format support"""
        if not date_string:
            return None
            
        date_formats = [
            '%B %d, %Y',
            '%b %d, %Y', 
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%m/%d/%Y'
        ]
        
        # Clean the date string
        date_string = re.sub(r'[^\w\s,/-]', '', date_string.strip())
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_string, fmt)
            except ValueError:
                continue
        
        # Try using dateutil parser as fallback
        try:
            return parser.parse(date_string)
        except:
            logger.warning(f"Could not parse date: {date_string}")
            return None
    
    def extract_article_data(self, article_element) -> Optional[Dict]:
        """Extract article data from BS4 element - EXACT COPY from working legacy scraper"""
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
    
    def get_detailed_content(self, article_url: str) -> Optional[Dict]:
        """Get detailed content from the article page - EXACT COPY from working legacy scraper"""
        if not article_url:
            return {"content": "", "sections": [], "image_url": ""}
        
        try:
            logger.info(f"Fetching detailed content from: {article_url}")
            response = self.fetch_page(article_url)
            if not response:
                return {"content": "", "sections": [], "image_url": ""}
            soup = BeautifulSoup(response.content, 'html.parser')
            
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
                # Find the first paragraph after the date and the image below date
                date_element = main_content.find(string=lambda s: isinstance(s, str) and "2025" in s)
                if date_element and date_element.parent:
                    # Look for image after date
                    img_element = date_element.parent.find_next('img')
                    if img_element and 'src' in img_element.attrs:
                        article_content["image_url"] = img_element['src']
                        if not article_content["image_url"].startswith('http'):
                            article_content["image_url"] = self.base_url + article_content["image_url"]
                    
                    next_p = date_element.parent.find_next('p')
                    if next_p:
                        article_content["content"] = next_p.get_text(strip=True)
                
                # Extract sections from headings with bulleted lists
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
    
    def scrape_page(self, page_url: str, get_detailed_content: bool = True) -> Tuple[List[Dict], Optional[str]]:
        """Scrape articles from a single page"""
        logger.debug(f"Scraping page: {page_url}")
        
        response = self.fetch_page(page_url)
        if not response:
            return [], None
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find article containers - using robust legacy logic
        article_selectors = [
            'article',  # Most common
            '.post',    # Common WordPress
            '.news-item', 
            'div[class*="post"]',  # CRITICAL: This is what GKToday uses!
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
        
        # If no articles found with selectors, try finding all links that look like articles (FALLBACK LOGIC)
        if not articles:
            logger.debug("No articles found with selectors, trying fallback link discovery...")
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
                logger.debug(f"Found {len(articles)} articles using fallback logic")
        
        if not articles:
            logger.warning(f"No articles found on page: {page_url}")
            return [], None
        
        page_articles = []
        for article_elem in articles:
            article_data = self.extract_article_data(article_elem)
            if article_data:
                # Get detailed content if requested
                if get_detailed_content:
                    detailed_content = self.get_detailed_content(article_data['url'])
                    if detailed_content:
                        article_data.update(detailed_content)
                
                page_articles.append(article_data)
        
        # Find next page URL
        next_page_url = self.get_next_page_url(soup)
        
        logger.info(f"Found {len(page_articles)} articles on page")
        return page_articles, next_page_url
    
    def sync_articles(self, max_pages: int = 10, max_articles: int = 100) -> ScrapingResult:
        """
        Sync latest articles, stopping when existing articles are found
        This is the main method for production use
        """
        start_time = time.time()
        logger.info(f"Starting GKToday article sync (max_pages: {max_pages}, max_articles: {max_articles})")
        
        if not self.connect_to_db():
            return ScrapingResult(
                success=False,
                articles_scraped=0,
                articles_skipped=0,
                errors=["Database connection failed"],
                runtime_seconds=time.time() - start_time
            )
        
        articles_scraped = 0
        articles_skipped = 0
        errors = []
        current_url = self.base_url
        pages_scraped = 0
        consecutive_existing = 0
        max_consecutive_existing = 5  # Stop after 5 consecutive existing articles
        
        try:
            while current_url and pages_scraped < max_pages and articles_scraped < max_articles:
                logger.info(f"Scraping page {pages_scraped + 1}: {current_url}")
                
                page_articles, next_url = self.scrape_page(current_url, get_detailed_content=True)
                
                if not page_articles:
                    logger.warning("No articles found on page, continuing...")
                    current_url = next_url
                    pages_scraped += 1
                    continue
                
                page_new_articles = 0
                page_existing_articles = 0
                
                for article in page_articles:
                    if articles_scraped >= max_articles:
                        break
                    
                    try:
                        # Check if article exists before processing
                        if self.db.article_exists(article['url']):
                            articles_skipped += 1
                            page_existing_articles += 1
                            consecutive_existing += 1
                            logger.debug(f"Skipping existing article: {article['title']}")
                        else:
                            # Insert new article
                            article_id = self.db.insert_article(article)
                            if article_id:
                                articles_scraped += 1
                                page_new_articles += 1
                                consecutive_existing = 0  # Reset counter
                                logger.info(f"✓ Scraped new article: {article['title']}")
                            else:
                                articles_skipped += 1
                                page_existing_articles += 1
                                consecutive_existing += 1
                        
                        # Add rate limiting
                        time.sleep(self.rate_limit_delay)
                        
                    except Exception as e:
                        error_msg = f"Error processing article {article.get('title', 'Unknown')}: {e}"
                        logger.error(error_msg)
                        errors.append(error_msg)
                
                logger.info(f"Page {pages_scraped + 1} summary: {page_new_articles} new, {page_existing_articles} existing")
                
                # Stop if we've found too many consecutive existing articles
                if consecutive_existing >= max_consecutive_existing:
                    logger.info(f"Found {consecutive_existing} consecutive existing articles. Stopping sync.")
                    break
                
                current_url = next_url
                pages_scraped += 1
                
                # Add delay between pages
                if current_url:
                    time.sleep(self.rate_limit_delay + 1)
        
        except Exception as e:
            error_msg = f"Critical error during scraping: {e}"
            logger.error(error_msg)
            errors.append(error_msg)
        
        finally:
            self.db.close()
        
        runtime = time.time() - start_time
        
        result = ScrapingResult(
            success=len(errors) == 0,
            articles_scraped=articles_scraped,
            articles_skipped=articles_skipped,
            errors=errors,
            runtime_seconds=runtime
        )
        
        logger.info(f"GKToday sync completed: {articles_scraped} new articles, {articles_skipped} skipped, {runtime:.2f}s")
        
        return result
    
    def close(self):
        """Clean up resources"""
        if self.db:
            self.db.close()

def main():
    """Main function for testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description="GKToday Scraper")
    parser.add_argument("--max-pages", type=int, default=5, help="Maximum pages to scrape")
    parser.add_argument("--max-articles", type=int, default=50, help="Maximum articles to scrape")
    parser.add_argument("--log-level", default="INFO", help="Log level")
    
    args = parser.parse_args()
    
    # Set up logging
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    scraper = EnhancedGKTodayScraper()
    try:
        result = scraper.sync_articles(
            max_pages=args.max_pages,
            max_articles=args.max_articles
        )
        
        print(f"\n=== SCRAPING COMPLETED ===")
        print(f"Success: {result.success}")
        print(f"Articles scraped: {result.articles_scraped}")
        print(f"Articles skipped: {result.articles_skipped}")
        print(f"Runtime: {result.runtime_seconds:.2f} seconds")
        
        if result.errors:
            print(f"Errors: {len(result.errors)}")
            for error in result.errors:
                print(f"  - {error}")
        
        return 0 if result.success else 1
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        return 1
    finally:
        scraper.close()

if __name__ == "__main__":
    sys.exit(main())
