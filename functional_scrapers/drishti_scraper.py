import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from urllib.parse import urljoin
import logging
import os
import psycopg2
from psycopg2.extras import DictCursor, register_uuid
import uuid
import re
import time
from dotenv import load_dotenv

# Load environment variables
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
dotenv_path = os.path.join(root_dir, '.env.local')
load_dotenv(dotenv_path)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(root_dir, "drishti_scraper.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EnhancedDrishtiScraperFixed:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        self.base_url = "https://www.drishtiias.com"
        self.init_database()

    def init_database(self):
        """Initialize database connection"""
        try:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not found in environment variables")
            
            self.conn = psycopg2.connect(database_url)
            self.cursor = self.conn.cursor(cursor_factory=DictCursor)
            register_uuid()
            self._create_tables()
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            raise

    def _create_tables(self):
        """Create tables if they don't exist"""
        try:
            # Create articles table
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS gk_today_content (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title TEXT NOT NULL,
                    url TEXT UNIQUE NOT NULL,
                    image_url TEXT,
                    published_date DATE,
                    source_name TEXT DEFAULT 'DrishtiIAS',
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

    def close(self):
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")

    def fetch_page(self, url, max_retries=3):
        """Fetch webpage with retry logic"""
        for attempt in range(max_retries):
            try:
                logger.info(f"Fetching URL: {url} (Attempt {attempt + 1})")
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    logger.error(f"Failed to fetch {url} after {max_retries} attempts")
                    return None

    def clean_text(self, text):
        """Clean and normalize text"""
        if not text:
            return ""
        # Remove extra whitespace and normalize
        text = ' '.join(text.split())
        # Remove unwanted characters but preserve more punctuation
        text = re.sub(r'[^\w\s\-.,;:()[\]/&%@#$+=<>?!\'\"°•]', '', text)
        # Remove common navigation text
        text = re.sub(r'\b(Source:|Read more|Click here|Next article|Previous article)\b.*', '', text, flags=re.IGNORECASE)
        return text.strip()

    def extract_date(self, text):
        """Extract date from text"""
        if not text:
            return None
        
        date_patterns = [
            r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{4})',
            r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                if len(match.groups()) == 3:
                    if match.group(1).isdigit():
                        return f"{match.group(1)} {match.group(2)}, {match.group(3)}"
                    else:
                        return f"{match.group(2)} {match.group(1)}, {match.group(3)}"
        return None

    def extract_metadata(self, soup):
        """Extract article metadata"""
        metadata = {}
        
        # Title
        title_elem = soup.find('h1', id='dynamic-title')
        if not title_elem:
            title_elem = soup.find('h1', class_='content-title')
        metadata['title'] = self.clean_text(title_elem.get_text()) if title_elem else "N/A"
        
        # Date and reading time
        actions = soup.find('ul', class_='actions')
        if actions:
            date_elem = actions.find('li', class_='date')
            metadata['date'] = self.clean_text(date_elem.get_text()) if date_elem else "N/A"
        else:
            article_text = soup.get_text()
            extracted_date = self.extract_date(article_text)
            metadata['date'] = extracted_date if extracted_date else "N/A"
        
        # Star rating
        star_rating = soup.find('div', class_='starRating')
        if star_rating:
            checked_stars = len(star_rating.find_all('span', class_='checked'))
            metadata['importance_rating'] = f"{checked_stars}/5"
        else:
            metadata['importance_rating'] = "N/A"
        
        return metadata

    def extract_content_sections(self, soup):
        """Extract main content sections with improved logic"""
        intro = ""
        sections = []
        
        # Try multiple selectors for article content
        article_detail = None
        content_selectors = [
            'div.article-detail',
            'div.detail-content', 
            'div.content-detail',
            'div.article-content',
            'main',
            'article'
        ]
        
        for selector in content_selectors:
            article_detail = soup.select_one(selector)
            if article_detail:
                break
        
        if not article_detail:
            # Fallback: find the largest div with text content
            all_divs = soup.find_all('div')
            if all_divs:
                article_detail = max(all_divs, key=lambda x: len(x.get_text()), default=None)
        
        if not article_detail:
            return intro, sections
        
        # Get intro paragraph - look for first substantial paragraph
        paragraphs = article_detail.find_all('p')
        for p in paragraphs:
            text = self.clean_text(p.get_text())
            if text and len(text) > 50 and not any(x in text.lower() for x in ['source:', 'read more', 'click here']):
                intro = text
                break
        
        # Extract sections with better logic
        current_section = {"heading": "Main Content", "content": "", "bullet_points": []}
        found_headings = False
        
        # Get all content elements
        content_elements = article_detail.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'ul', 'ol', 'div'])
        
        for element in content_elements:
            # Skip navigation and metadata elements
            if element.get('class') and any(cls in str(element.get('class')).lower() for cls in 
                ['next-post', 'tags-new', 'starrating', 'actions', 'navigation', 'footer', 'header']):
                continue
            
            # Skip if element is too small or contains only whitespace
            element_text = self.clean_text(element.get_text())
            if not element_text or len(element_text) < 10:
                continue
                
            if element.name in ['h1', 'h2', 'h3', 'h4', 'h5']:
                # Save previous section if it has content
                if current_section["content"] or current_section["bullet_points"]:
                    sections.append(current_section)
                
                # Start new section
                heading_text = element_text
                current_section = {
                    "heading": heading_text,
                    "content": "",
                    "bullet_points": []
                }
                found_headings = True
                
            elif element.name == 'p':
                # Skip very short paragraphs and navigation text
                if len(element_text) > 20 and not any(x in element_text.lower() for x in 
                    ['source:', 'read more', 'click here', 'next article', 'previous article']):
                    if current_section["content"]:
                        current_section["content"] += " " + element_text
                    else:
                        current_section["content"] = element_text
                        
            elif element.name in ['ul', 'ol']:
                # Extract list items
                for li in element.find_all('li', recursive=False):
                    li_text = self.clean_text(li.get_text())
                    if li_text and len(li_text) > 5:
                        current_section["bullet_points"].append(li_text)
        
        # Add the last section
        if current_section["content"] or current_section["bullet_points"]:
            sections.append(current_section)
        
        # If no sections found, create one from intro
        if not sections and intro:
            sections.append({
                "heading": "Article Content",
                "content": intro,
                "bullet_points": []
            })
        
        return intro, sections

    def extract_images(self, soup):
        """Extract main image URL"""
        main_image = None
        
        # Look for images in article content, avoiding tracking pixels
        for img in soup.find_all('img'):
            src = img.get('src', '')
            if src and not any(x in src.lower() for x in ['facebook.com', 'google-analytics', 'tracking', 'pixel']):
                # Check if it's a content image
                if any(x in src.lower() for x in ['content', 'analysis', 'article', 'news']) or img.get('alt'):
                    if not src.startswith('http'):
                        src = urljoin(self.base_url, src)
                    main_image = src
                    break
        
        return main_image

    def check_article_exists(self, url):
        """Check if an article already exists in the database"""
        try:
            self.cursor.execute("SELECT id FROM gk_today_content WHERE url = %s", (url,))
            return self.cursor.fetchone() is not None
        except Exception as e:
            logger.error(f"Error checking article existence: {e}")
            return False

    def scrape_article_content(self, url):
        """Scrape article content and return structured data"""
        try:
            response = self.fetch_page(url)
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            metadata = self.extract_metadata(soup)
            intro, sections = self.extract_content_sections(soup)
            image_url = self.extract_images(soup)
            
            article_data = {
                'title': metadata['title'],
                'url': url,
                'date': metadata['date'],
                'image_url': image_url,
                'intro': intro,
                'importance_rating': metadata.get('importance_rating', 'N/A'),
                'sections': sections
            }
            
            return article_data
            
        except Exception as e:
            logger.error(f"Error scraping article content from {url}: {e}")
            return None

    def insert_article(self, article_data):
        """Insert article into gk_today_content table"""
        try:
            # Check if article already exists
            if self.check_article_exists(article_data['url']):
                logger.info(f"Article already exists: {article_data['title']}")
                return None
            
            # Parse date
            published_date = None
            if article_data.get('date') and article_data['date'] != 'N/A':
                try:
                    from dateutil import parser as date_parser
                    published_date = date_parser.parse(article_data['date']).date()
                except:
                    published_date = None
            
            # Insert article
            article_id = uuid.uuid4()
            self.cursor.execute("""
                INSERT INTO gk_today_content 
                (id, title, url, image_url, published_date, source_name, intro, importance_rating, date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                article_id,
                article_data['title'],
                article_data['url'],
                article_data.get('image_url'),
                published_date,
                'DrishtiIAS',
                article_data.get('intro', ''),
                article_data.get('importance_rating'),
                article_data.get('date')
            ))
            
            result = self.cursor.fetchone()
            if result:
                article_id = result[0]
                logger.info(f"Inserted new article: {article_data['title']}")
                
                # Insert sections
                if 'sections' in article_data:
                    for idx, section in enumerate(article_data['sections']):
                        section_id = uuid.uuid4()
                        self.cursor.execute("""
                            INSERT INTO sections (id, article_id, heading, content, type, sequence_order)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            RETURNING id
                        """, (
                            section_id,
                            article_id,
                            section['heading'],
                            section['content'],
                            'list' if section.get('bullet_points') else 'paragraph',
                            idx
                        ))
                        
                        section_result = self.cursor.fetchone()
                        if section_result and section.get('bullet_points'):
                            section_id = section_result[0]
                            for bullet_idx, bullet in enumerate(section['bullet_points']):
                                self.cursor.execute("""
                                    INSERT INTO section_bullets (id, section_id, content, bullet_order)
                                    VALUES (%s, %s, %s, %s)
                                """, (uuid.uuid4(), section_id, bullet, bullet_idx))
                
                self.conn.commit()
                return article_id
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error inserting article: {e}")
            raise

    def get_date_url(self, days_ago=0):
        """Generate URL for specific date"""
        date = datetime.now() - timedelta(days=days_ago)
        return f"https://www.drishtiias.com/current-affairs-news-analysis-editorials/news-analysis/{date.strftime('%d-%m-%Y')}"

    def extract_article_links(self, soup):
        """Extract article links from news analysis page"""
        if not soup:
            return []
        
        articles = []
        
        # Method 1: Look for h1 tags with dynamic-title id
        for h1 in soup.find_all('h1', id='dynamic-title'):
            a_tag = h1.find('a')
            if a_tag and a_tag.get('href'):
                articles.append({
                    "title": a_tag.get_text(strip=True),
                    "url": urljoin(self.base_url, a_tag['href'])
                })
        
        # Method 2: Look for other heading tags with links
        for heading in soup.find_all(['h1', 'h2', 'h3']):
            a_tag = heading.find('a')
            if a_tag and a_tag.get('href'):
                href = a_tag.get('href')
                if '/daily-news-analysis/' in href or '/daily-updates/' in href:
                    articles.append({
                        "title": a_tag.get_text(strip=True),
                        "url": urljoin(self.base_url, href)
                    })
        
        # Remove duplicates
        seen = set()
        unique_articles = []
        for art in articles:
            if art["url"] not in seen and art["title"]:
                unique_articles.append(art)
                seen.add(art["url"])
        
        return unique_articles

    def scrape_recent_articles(self, max_days=3, sync_until_existing=True):
        """Scrape articles from recent days with sync support"""
        logger.info(f"Starting to scrape articles from the last {max_days} days")
        articles_scraped = 0
        existing_article_count = 0
        consecutive_existing = 0
        max_consecutive_existing = 3
        
        for days_ago in range(max_days):
            try:
                date_url = self.get_date_url(days_ago)
                current_date = (datetime.now() - timedelta(days=days_ago)).strftime('%d-%m-%Y')
                logger.info(f"Checking articles for {current_date} at {date_url}")
                
                response = self.fetch_page(date_url)
                if not response:
                    logger.warning(f"Could not access page for {current_date}")
                    continue
                
                soup = BeautifulSoup(response.content, 'html.parser')
                article_links = self.extract_article_links(soup)
                logger.info(f"Found {len(article_links)} articles for {current_date}")
                
                if not article_links:
                    logger.info(f"No articles found for {current_date}")
                    continue
                
                day_existing_count = 0
                day_scraped_count = 0
                
                for i, article_link in enumerate(article_links):
                    try:
                        article_url = article_link["url"]
                        article_title = article_link["title"]
                        
                        logger.info(f"Processing article {i+1}/{len(article_links)}: {article_title}")
                        
                        # Check if article already exists
                        if self.check_article_exists(article_url):
                            logger.info(f"Article already exists: {article_title}")
                            existing_article_count += 1
                            day_existing_count += 1
                            consecutive_existing += 1
                            
                            # If sync mode and found enough existing articles, stop
                            if sync_until_existing and consecutive_existing >= max_consecutive_existing:
                                logger.info(f"Found {consecutive_existing} consecutive existing articles. Stopping.")
                                return articles_scraped
                            continue
                        
                        # Reset consecutive counter since we found a new article
                        consecutive_existing = 0
                        
                        article_data = self.scrape_article_content(article_url)
                        if not article_data:
                            logger.warning(f"Could not scrape content for: {article_title}")
                            continue
                        
                        article_id = self.insert_article(article_data)
                        if article_id:
                            logger.info(f"Successfully saved article to database with ID: {article_id}")
                            articles_scraped += 1
                            day_scraped_count += 1
                        
                        time.sleep(2)  # Be respectful to the server
                        
                    except Exception as e:
                        logger.error(f"Error processing article: {e}")
                
                logger.info(f"Day summary for {current_date}: {day_scraped_count} new articles scraped, {day_existing_count} existing articles found")
                
                # If sync mode and found existing articles, we might want to stop
                if sync_until_existing and day_existing_count > 0 and days_ago > 0:
                    logger.info("Found existing articles, but continuing to check remaining days...")
                
                if days_ago < max_days - 1:
                    logger.info("Waiting before processing next day...")
                    time.sleep(3)
                    
            except Exception as e:
                logger.error(f"Error processing day {days_ago}: {e}")
        
        logger.info(f"=== SCRAPING COMPLETE ===")
        logger.info(f"Total new articles saved to database: {articles_scraped}")
        logger.info(f"Total existing articles found: {existing_article_count}")
        return articles_scraped

def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Enhanced Drishti IAS Article Scraper (Fixed)")
    parser.add_argument("--days", type=int, default=3, help="Number of days to check for articles (default: 3)")
    parser.add_argument("--sync", action="store_true", help="Sync mode - stop when finding existing articles")
    
    args = parser.parse_args()
    
    try:
        scraper = EnhancedDrishtiScraperFixed()
        logger.info(f"Scraping articles from the last {args.days} days")
        count = scraper.scrape_recent_articles(max_days=args.days, sync_until_existing=args.sync)
        logger.info(f"Successfully scraped and saved {count} new articles")
        return count
        
    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        if 'scraper' in locals() and hasattr(scraper, 'conn'):
            scraper.close()

if __name__ == "__main__":
    main()
