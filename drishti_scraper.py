import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime, timedelta
import time
import logging
import os
from dateutil import parser
import psycopg2
from psycopg2.extras import DictCursor, register_uuid
import uuid
from urllib.parse import urljoin
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("drishti_scraper.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables from .env.local
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.local')
load_dotenv(dotenv_path)

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
        """
        Ensure we have all the necessary tables.
        We're using the same table structure as GKToday content,
        but adding a different source_name.
        """
        try:
            # First check if tables exist from GKToday scraper
            self.cursor.execute("""
                SELECT EXISTS(
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'gk_today_content'
                )
            """)
            table_exists = self.cursor.fetchone()[0]
            
            if not table_exists:
                logger.info("Creating necessary tables...")
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
                        importance_rating TEXT
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
                logger.info("Tables created successfully")
            else:
                logger.info("Tables already exist, checking for missing columns")
                
                # Check if importance_rating column exists
                self.cursor.execute("""
                    SELECT EXISTS(
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'gk_today_content' AND column_name = 'importance_rating'
                    )
                """)
                
                if not self.cursor.fetchone()[0]:
                    logger.info("Adding importance_rating column to gk_today_content table")
                    self.cursor.execute("""
                        ALTER TABLE gk_today_content ADD COLUMN importance_rating TEXT
                    """)
            
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error setting up tables: {e}")
            raise

    def insert_article(self, article_data):
        """
        Insert a Drishti IAS article into the database with the same structure as GKToday
        but marked as from 'DrishtiIAS'
        """
        try:
            # First check if article already exists
            self.cursor.execute("SELECT id FROM gk_today_content WHERE url = %s", (article_data['url'],))
            existing = self.cursor.fetchone()
            
            if existing:
                logger.info(f"Article already exists: {article_data['title']}")
                return existing[0]  # Return existing article ID
            
            # Convert date string to date object or None if not valid
            published_date = None
            if 'date' in article_data and article_data['date'] != "N/A":
                try:
                    # Parse date formats like "May 31, 2025"
                    published_date = parser.parse(article_data['date']).date()
                except Exception as e:
                    logger.warning(f"Could not parse date '{article_data['date']}': {e}")
            
            # Insert article
            self.cursor.execute("""
                INSERT INTO gk_today_content 
                (title, url, image_url, published_date, source_name, intro, importance_rating)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                article_data['title'],
                article_data['url'],
                article_data.get('image_url', None),
                published_date,
                'DrishtiIAS',  # Source name
                article_data.get('intro', ''),
                article_data.get('importance_rating', None)
            ))
            
            article_id = self.cursor.fetchone()[0]
            logger.info(f"Inserted new article: {article_data['title']}")

            # Insert sections and bullet points
            if 'sections' in article_data and article_data['sections']:
                for idx, section in enumerate(article_data['sections']):
                    # Determine section type (paragraph or list)
                    section_type = 'paragraph'
                    section_content = section.get('content', '')
                    
                    # Insert the section
                    self.cursor.execute("""
                        INSERT INTO sections 
                        (article_id, heading, content, type, sequence_order)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        article_id,
                        section.get('heading', ''),
                        section_content,
                        section_type,
                        idx
                    ))
                    
                    section_id = self.cursor.fetchone()[0]
                    
                    # Insert bullet points if any
                    if 'bullet_points' in section and section['bullet_points']:
                        for bullet_idx, bullet in enumerate(section['bullet_points']):
                            self.cursor.execute("""
                                INSERT INTO section_bullets 
                                (section_id, content, bullet_order)
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


class DrishtiScraper:
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
        self.db = None
        self.connect_to_db()
    
    def connect_to_db(self):
        try:
            self.db = DatabaseManager()
            self.db.connect()
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def fetch_page(self, url, max_retries=3):
        """Fetch the webpage with retry logic"""
        for attempt in range(max_retries):
            try:
                logger.info(f"Fetching URL: {url} (Attempt {attempt + 1})")
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    logger.error(f"Failed to fetch {url} after {max_retries} attempts")
                    return None
    
    def clean_text(self, text):
        """Clean and normalize text"""
        if not text:
            return ""
        # Remove extra whitespace and normalize
        text = ' '.join(text.split())
        # Remove unwanted characters but keep more punctuation for readability
        text = re.sub(r'[^\w\s\-.,;:()[\]/&%@#$+=<>?!\'\"°]', '', text)
        return text.strip()
    
    def extract_metadata(self, soup):
        """Extract article metadata"""
        metadata = {}
        
        # Title
        title_elem = soup.find('h1', id='dynamic-title')
        metadata['title'] = self.clean_text(title_elem.get_text()) if title_elem else "N/A"
        
        # Date and reading time
        actions = soup.find('ul', class_='actions')
        if actions:
            date_elem = actions.find('li', class_='date')
            read_elem = actions.find('li', class_='read')
            metadata['date'] = self.clean_text(date_elem.get_text()) if date_elem else "N/A"
            metadata['reading_time'] = self.clean_text(read_elem.get_text()) if read_elem else "N/A"
        
        # Tags
        tags_section = soup.find('div', class_='tags-new')
        if tags_section:
            tag_links = tags_section.find_all('a')
            metadata['tags'] = [self.clean_text(tag.get_text()) for tag in tag_links]
        else:
            metadata['tags'] = []
        
        # Star rating
        star_rating = soup.find('div', class_='starRating')
        if star_rating:
            checked_stars = len(star_rating.find_all('span', class_='checked'))
            metadata['importance_rating'] = f"{checked_stars}/5"
        else:
            metadata['importance_rating'] = "N/A"
        
        # Source
        source_link = soup.find('a', href=True, target='_blank')
        if source_link and 'Source:' in source_link.get_text():
            metadata['source'] = self.clean_text(source_link.get_text())
        else:
            metadata['source'] = "N/A"
        
        return metadata
    
    def extract_content_sections(self, soup):
        """Extract main content sections for database format"""
        sections = []
        
        # Find the main article content
        article_detail = soup.find('div', class_='article-detail')
        if not article_detail:
            return sections
        
        # Extract first paragraph for introduction
        intro_paragraph = ""
        first_p = article_detail.find('p')
        if first_p:
            intro_paragraph = self.clean_text(first_p.get_text())
            
        # Process headings and content blocks
        current_heading = ""
        current_content = ""
        current_bullet_points = []
        in_list = False
        
        # Extract all text content with structure
        elements = article_detail.find_all(['h2', 'h3', 'h4', 'h5', 'p', 'ul', 'ol'])
        
        for element in elements:
            # Skip navigation and metadata elements
            if any(cls in element.get('class', []) for cls in ['next-post', 'tags-new', 'starRating', 'actions']):
                continue
            
            # Handle headings
            if element.name in ['h2', 'h3', 'h4', 'h5']:
                # If we have gathered content for a section, save it
                if current_content or current_bullet_points:
                    sections.append({
                        'heading': current_heading,
                        'content': current_content,
                        'bullet_points': current_bullet_points
                    })
                    
                # Start a new section
                current_heading = self.clean_text(element.get_text())
                current_content = ""
                current_bullet_points = []
                in_list = False
                
            # Handle paragraphs
            elif element.name == 'p':
                text = self.clean_text(element.get_text())
                if text:
                    if in_list:
                        # If we were in a list, end it and start paragraph content
                        in_list = False
                    current_content += text + " "
                    
            # Handle lists
            elif element.name in ['ul', 'ol']:
                in_list = True
                for li in element.find_all('li'):
                    bullet_point = self.clean_text(li.get_text())
                    if bullet_point:
                        current_bullet_points.append(bullet_point)
        
        # Don't forget to add the final section
        if current_content or current_bullet_points:
            sections.append({
                'heading': current_heading,
                'content': current_content.strip(),
                'bullet_points': current_bullet_points
            })
        
        return intro_paragraph, sections
    
    def extract_images(self, soup):
        """Extract the main image URL"""
        main_image = None
        
        # Look for main content image
        article_detail = soup.find('div', class_='article-detail')
        if article_detail:
            img_tags = article_detail.find_all('img')
            for img in img_tags:
                if 'src' in img.attrs and (
                    'content-img' in img.get('class', []) or 
                    img.get('alt') or 
                    'analysis' in img.get('src', '').lower()
                ):
                    src = img.get('src', '')
                    # Convert relative URLs to absolute
                    if src and not src.startswith('http'):
                        src = f"https://www.drishtiias.com{src}"
                    main_image = src
                    break
        
        return main_image
    
    def get_date_url(self, days_ago=0):
        """Generate URL for a specific date's news analysis"""
        date = datetime.now() - timedelta(days=days_ago)
        return f"https://www.drishtiias.com/current-affairs-news-analysis-editorials/news-analysis/{date.strftime('%d-%m-%Y')}"
    
    def extract_article_links(self, url):
        """Extract article links from a date page"""
        try:
            response = self.fetch_page(url)
            if not response:
                return []
                
            soup = BeautifulSoup(response.content, 'html.parser')
            articles = []
            
            # Find article links in main content area
            content_div = soup.find('div', class_='detail-content')
            if not content_div:
                return []
                
            # Look for links in headings
            for heading in content_div.find_all(['h1', 'h2', 'h3']):
                a_tag = heading.find('a')
                if a_tag and a_tag.get('href'):
                    link = a_tag['href']
                    # Make sure it's an absolute URL
                    if not link.startswith('http'):
                        link = urljoin("https://www.drishtiias.com", link)
                        
                    articles.append({
                        "title": a_tag.get_text(strip=True),
                        "url": link
                    })
            
            # Remove duplicates
            seen = set()
            unique_articles = []
            for art in articles:
                if art["url"] not in seen:
                    unique_articles.append(art)
                    seen.add(art["url"])
            
            return unique_articles
            
        except Exception as e:
            logger.error(f"Error extracting article links from {url}: {e}")
            return []
    
    def scrape_article(self, url):
        """Scrape individual article and format data for database insertion"""
        try:
            # Fetch the page
            response = self.fetch_page(url)
            if not response:
                return None
                
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract metadata
            metadata = self.extract_metadata(soup)
            
            # Extract content
            intro, content_sections = self.extract_content_sections(soup)
            
            # Extract main image
            image_url = self.extract_images(soup)
            
            # Format article data for database
            article_data = {
                'title': metadata['title'],
                'url': url,
                'date': metadata['date'],
                'image_url': image_url,
                'intro': intro,
                'importance_rating': metadata['importance_rating'],
                'sections': content_sections
            }
            
            logger.info(f"Successfully scraped article: {metadata['title']}")
            return article_data
            
        except Exception as e:
            logger.error(f"Error scraping article {url}: {e}")
            return None
    
    def scrape_recent_articles(self, max_days=7, max_articles=None):
        """Scrape articles from recent days"""
        all_article_links = []
        articles_scraped = 0
        
        # Collect links from recent days
        for days_ago in range(max_days):
            url = self.get_date_url(days_ago)
            logger.info(f"Checking for articles from {days_ago} days ago: {url}")
            
            article_links = self.extract_article_links(url)
            if article_links:
                logger.info(f"Found {len(article_links)} articles for {days_ago} days ago")
                all_article_links.extend(article_links)
            else:
                logger.info(f"No articles found for {days_ago} days ago")
            
            # Be gentle to the server
            time.sleep(2)
        
        # Process the articles
        for article in all_article_links:
            if max_articles and articles_scraped >= max_articles:
                break
                
            logger.info(f"Scraping article: {article['title']}")
            article_data = self.scrape_article(article['url'])
            
            if article_data:
                try:
                    # Insert into database
                    article_id = self.db.insert_article(article_data)
                    if article_id:
                        articles_scraped += 1
                        logger.info(f"Successfully saved article {article_data['title']} to database with ID {article_id}")
                    else:
                        logger.info(f"Article {article_data['title']} already exists in database")
                except Exception as e:
                    logger.error(f"Error saving article to database: {e}")
            
            # Be gentle to the server
            time.sleep(3)
        
        return articles_scraped

    def scrape_specific_article(self, url):
        """Scrape a specific article URL"""
        article_data = self.scrape_article(url)
        
        if article_data:
            try:
                # Insert into database
                article_id = self.db.insert_article(article_data)
                if article_id:
                    logger.info(f"Successfully saved article {article_data['title']} to database with ID {article_id}")
                    return True
                else:
                    logger.info(f"Article {article_data['title']} already exists in database")
                    return False
            except Exception as e:
                logger.error(f"Error saving article to database: {e}")
                return False
        return False

def main():
    """Main execution function with command line options"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Drishti IAS Article Scraper")
    parser.add_argument("--url", help="Specific URL to scrape")
    parser.add_argument("--days", type=int, default=7, help="Number of days to check for articles (default: 7)")
    parser.add_argument("--max", type=int, help="Maximum number of articles to scrape")
    
    args = parser.parse_args()
    
    try:
        scraper = DrishtiScraper()
        
        if args.url:
            # Scrape specific URL
            logger.info(f"Scraping specific URL: {args.url}")
            success = scraper.scrape_specific_article(args.url)
            if success:
                logger.info("URL successfully scraped and saved")
            else:
                logger.info("Failed to scrape or save the article")
        else:
            # Scrape recent articles
            logger.info(f"Scraping articles from the last {args.days} days (max: {args.max or 'unlimited'})")
            count = scraper.scrape_recent_articles(max_days=args.days, max_articles=args.max)
            logger.info(f"Successfully scraped and saved {count} new articles")
            
    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        if scraper and scraper.db:
            scraper.db.close()

if __name__ == "__main__":
    main()
