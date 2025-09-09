"""
Production-ready DrishtiIAS scraper with smart sync capabilities
Optimized for Next.js integration and production use
Handles multiple articles per day correctly
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from dateutil import parser
from urllib.parse import urljoin
import logging
import os
import psycopg2
from psycopg2.extras import DictCursor, register_uuid
import uuid
import re
import time
import sys
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

# Load environment variables from parent directory
try:
    from dotenv import load_dotenv
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    dotenv_path = os.path.join(root_dir, '.env.local')
    load_dotenv(dotenv_path)
except ImportError:
    # Handle case where python-dotenv is not installed
    pass

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

class EnhancedDrishtiScraperFixed:
    """Production-ready DrishtiIAS scraper with smart sync capabilities"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        self.base_url = "https://www.drishtiias.com"
        self.conn = None
        self.cursor = None
        self.rate_limit_delay = int(os.getenv('SCRAPER_RATE_LIMIT', '2'))
        
    def init_database(self) -> bool:
        """Initialize database connection"""
        try:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not found in environment variables")
            
            self.conn = psycopg2.connect(database_url)
            self.cursor = self.conn.cursor(cursor_factory=DictCursor)
            register_uuid()
            
            self._ensure_tables()
            logger.info("Database connection established successfully")
            return True
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
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
            
            table_exists = self.cursor.fetchone()[0]
            
            # If table exists, ensure it has all required columns
            if table_exists:
                self._ensure_columns()
            
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
                source_name TEXT DEFAULT 'DrishtiIAS',
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
    
    def _ensure_columns(self):
        """Ensure all required columns exist in gk_today_content table"""
        required_columns = [
            ('date', 'TEXT'),
            ('importance_rating', 'TEXT'),
            ('image_url', 'TEXT'),
            ('intro', 'TEXT'),
            ('sequence_order', 'INTEGER'),
            ('scraped_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
        ]
        
        for column_name, column_type in required_columns:
            try:
                self.cursor.execute(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'gk_today_content' AND column_name = %s
                """, (column_name,))
                
                if not self.cursor.fetchone():
                    logger.info(f"Adding missing column: {column_name}")
                    self.cursor.execute(f"ALTER TABLE gk_today_content ADD COLUMN {column_name} {column_type}")
                    
            except Exception as e:
                logger.warning(f"Could not add column {column_name}: {e}")
        
        self.conn.commit()
    
    def get_date_url(self, days_ago: int = 0) -> str:
        """Generate URL for a specific date"""
        date = datetime.now() - timedelta(days=days_ago)
        return f"https://www.drishtiias.com/current-affairs-news-analysis-editorials/news-analysis/{date.strftime('%d-%m-%Y')}"
    
    def fetch_page(self, url: str, max_retries: int = 3) -> Optional[requests.Response]:
        """Fetch webpage with retry logic"""
        for attempt in range(max_retries):
            try:
                logger.debug(f"Fetching {url} (attempt {attempt + 1})")
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                logger.warning(f"Fetch attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    logger.error(f"Failed to fetch {url} after {max_retries} attempts")
        return None
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        text = ' '.join(text.split())
        text = re.sub(r'[^\w\s\-.,;:()[\]/&%@#$+=<>?!\'\"°]', '', text)
        return text.strip()
    
    def extract_date(self, text: str) -> Optional[str]:
        """Extract and parse date from text with enhanced patterns"""
        if not text:
            return None
        
        # Enhanced date patterns for DrishtiIAS
        date_patterns = [
            # Standard formats: "29 January, 2025" or "January 29, 2025"
            r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{4})',
            r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})',
            
            # Full month names: "29 January 2025" or "January 29 2025"
            r'(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})',
            r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})',
            
            # Date with ordinal: "29th January, 2025"
            r'(\d{1,2})(st|nd|rd|th)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{4})',
            r'(\d{1,2})(st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})',
            
            # Numeric formats: "29/01/2025", "01/29/2025", "2025-01-29"
            r'(\d{1,2})/(\d{1,2})/(\d{4})',
            r'(\d{4})-(\d{1,2})-(\d{1,2})',
            r'(\d{1,2})-(\d{1,2})-(\d{4})'
        ]
        
        for i, pattern in enumerate(date_patterns):
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groups()
                
                try:
                    if i < 4:  # Standard and full month name patterns
                        if pattern.startswith(r'(\d'):  # Day first
                            day, month, year = groups[0], groups[1], groups[2]
                        else:  # Month first
                            month, day, year = groups[0], groups[1], groups[2]
                        return f"{month} {day}, {year}"
                    
                    elif i < 6:  # Ordinal patterns
                        day, ordinal, month, year = groups[0], groups[1], groups[2], groups[3]
                        return f"{month} {day}, {year}"
                    
                    else:  # Numeric patterns
                        if i == 6:  # DD/MM/YYYY or MM/DD/YYYY
                            part1, part2, year = groups
                            # Assume DD/MM/YYYY for DrishtiIAS (Indian format)
                            day, month = part1, part2
                        elif i == 7:  # YYYY-MM-DD
                            year, month, day = groups
                        else:  # DD-MM-YYYY
                            day, month, year = groups
                        
                        # Convert to readable format
                        try:
                            date_obj = datetime(int(year), int(month), int(day))
                            return date_obj.strftime('%B %d, %Y')
                        except ValueError:
                            continue
                            
                except (ValueError, IndexError):
                    continue
        
        return None
    
    def extract_metadata(self, soup: BeautifulSoup) -> Dict:
        """Extract article metadata with enhanced date extraction"""
        metadata = {}
        
        # Title
        title_elem = soup.find('h1', id='dynamic-title')
        if not title_elem:
            title_elem = soup.find('h1', class_='content-title')
        if not title_elem:
            title_elem = soup.find('h1')
        metadata['title'] = self.clean_text(title_elem.get_text()) if title_elem else "N/A"
        
        # Enhanced date extraction with multiple strategies
        date_found = False
        
        # Strategy 1: Look for date in actions list
        actions = soup.find('ul', class_='actions')
        if actions:
            date_elem = actions.find('li', class_='date')
            if date_elem:
                date_text = self.clean_text(date_elem.get_text())
                if date_text and date_text != "N/A":
                    metadata['date'] = date_text
                    date_found = True
            
            read_elem = actions.find('li', class_='read')
            metadata['reading_time'] = self.clean_text(read_elem.get_text()) if read_elem else "N/A"
        
        # Strategy 2: Look for date in meta tags
        if not date_found:
            meta_date = soup.find('meta', {'property': 'article:published_time'})
            if not meta_date:
                meta_date = soup.find('meta', {'name': 'date'})
            if not meta_date:
                meta_date = soup.find('meta', {'name': 'publish-date'})
            
            if meta_date and meta_date.get('content'):
                try:
                    from dateutil import parser as date_parser
                    parsed_date = date_parser.parse(meta_date['content'])
                    metadata['date'] = parsed_date.strftime('%B %d, %Y')
                    date_found = True
                except:
                    pass
        
        # Strategy 3: Look for date patterns in the page text
        if not date_found:
            # Look for date near the title or in article content
            article_detail = soup.find('div', class_='article-detail') or soup.find('div', class_='detail-content')
            if article_detail:
                article_text = article_detail.get_text()
            else:
                article_text = soup.get_text()
            
            extracted_date = self.extract_date(article_text)
            metadata['date'] = extracted_date if extracted_date else "N/A"
            if extracted_date:
                date_found = True
        
        # Strategy 4: Extract from URL if it contains date pattern
        if not date_found:
            url_text = soup.find('link', {'rel': 'canonical'})
            if url_text and url_text.get('href'):
                url = url_text['href']
                # Look for date pattern in URL like /2025/01/29/ or /29-01-2025/
                url_date_match = re.search(r'/(\d{4})/(\d{1,2})/(\d{1,2})/', url)
                if not url_date_match:
                    url_date_match = re.search(r'/(\d{1,2})-(\d{1,2})-(\d{4})/', url)
                
                if url_date_match:
                    try:
                        if len(url_date_match.groups()) == 3:
                            if url_date_match.group(1).startswith('20'):  # Year first
                                year, month, day = url_date_match.groups()
                            else:  # Day first
                                day, month, year = url_date_match.groups()
                            
                            date_obj = datetime(int(year), int(month), int(day))
                            metadata['date'] = date_obj.strftime('%B %d, %Y')
                            date_found = True
                    except:
                        pass
        
        # Fallback: Set reading time if not found
        if 'reading_time' not in metadata:
            metadata['reading_time'] = "N/A"
        
        # Tags
        tags_section = soup.find('div', class_='tags-new')
        if tags_section:
            tag_links = tags_section.find_all('a')
            metadata['tags'] = [self.clean_text(tag.get_text()) for tag in tag_links]
        else:
            metadata['tags'] = []
        
        # Star rating (importance)
        star_rating = soup.find('div', class_='starRating')
        if star_rating:
            checked_stars = len(star_rating.find_all('span', class_='checked'))
            metadata['importance_rating'] = f"{checked_stars}/5"
        else:
            metadata['importance_rating'] = "N/A"
        
        return metadata
    
    def extract_content_sections(self, soup: BeautifulSoup) -> Tuple[str, List[Dict]]:
        """Extract main content sections"""
        intro = ""
        sections = []
        
        # Find the main article content
        article_detail = soup.find('div', class_='article-detail')
        if not article_detail:
            article_detail = soup.find('div', class_='detail-content')
        if not article_detail:
            return intro, sections
        
        # Get the intro paragraph
        intro_p = article_detail.find('p')
        if intro_p:
            intro = self.clean_text(intro_p.get_text())
        
        current_section = {"heading": "", "content": "", "bullet_points": []}
        
        # Process all elements in order
        for element in article_detail.find_all(['h2', 'h3', 'h4', 'p', 'ul', 'ol']):
            # Skip navigation and metadata elements
            if element.get('class') and any(cls in element.get('class', []) for cls in ['next-post', 'tags-new', 'starRating', 'actions']):
                continue
            
            # Handle headings
            if element.name in ['h2', 'h3', 'h4']:
                # Save previous section if it has content
                if current_section["content"] or current_section["bullet_points"]:
                    sections.append(current_section)
                
                # Start new section
                heading_text = self.clean_text(element.get_text())
                current_section = {
                    "heading": heading_text,
                    "content": "",
                    "bullet_points": []
                }
            
            # Handle paragraphs
            elif element.name == 'p':
                text = self.clean_text(element.get_text())
                if text and len(text) > 10:  # Filter out very short paragraphs
                    if current_section["content"]:
                        current_section["content"] += " " + text
                    else:
                        current_section["content"] = text
            
            # Handle lists - EXACT COPY from working legacy scraper
            elif element.name in ['ul', 'ol']:
                # Extract list items with proper nesting
                for li in element.find_all('li', recursive=False):
                    # Get direct text content (excluding nested lists)
                    li_clone = li.__copy__()
                    for nested in li_clone.find_all(['ul', 'ol']):
                        nested.decompose()
                    
                    main_text = self.clean_text(li_clone.get_text())
                    if main_text and len(main_text) > 5:
                        current_section["bullet_points"].append(main_text)
                        
                        # Handle nested lists as sub-points
                        nested_lists = li.find_all(['ul', 'ol'], recursive=False)
                        for nested_list in nested_lists:
                            for nested_li in nested_list.find_all('li', recursive=False):
                                nested_text = self.clean_text(nested_li.get_text())
                                if nested_text and len(nested_text) > 5:
                                    # Add as indented sub-point
                                    current_section["bullet_points"].append(f"  • {nested_text}")
        
        # Add the last section
        if current_section["content"] or current_section["bullet_points"]:
            sections.append(current_section)
        
        return intro, sections
    
    def extract_images(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract main image URL"""
        # Look for main image
        main_image = None
        
        # Try finding image in article content
        content_img = soup.find('img', class_='content-img')
        if content_img and content_img.get('src'):
            src = content_img.get('src')
            # Convert relative URLs to absolute
            if not src.startswith('http'):
                src = urljoin(self.base_url, src)
            main_image = src
        
        # Try finding any other relevant image
        if not main_image:
            for img in soup.find_all('img'):
                src = img.get('src', '')
                if (src and 
                    not any(skip in src.lower() for skip in ['facebook', 'twitter', 'pixel', 'track']) and
                    ('analysis' in src.lower() or 'content' in src.lower())):
                    # Convert relative URLs to absolute
                    if not src.startswith('http'):
                        src = urljoin(self.base_url, src)
                    main_image = src
                    break
        
        return main_image
    
    def extract_article_links(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract article links from news analysis page"""
        if not soup:
            return []
        
        articles = []
        
        # Method 1: Look for h1 tags with id='dynamic-title' containing links
        for h1 in soup.find_all('h1', id='dynamic-title'):
            a_tag = h1.find('a')
            if a_tag and a_tag.get('href'):
                articles.append({
                    "title": a_tag.get_text(strip=True),
                    "link": urljoin(self.base_url, a_tag['href'])
                })
        
        # Method 2: Look for all h1, h2, h3 tags with links (for multiple articles per day)
        for heading in soup.find_all(['h1', 'h2', 'h3']):
            a_tag = heading.find('a')
            if a_tag and a_tag.get('href'):
                href = a_tag.get('href')
                # Only include daily-news-analysis or daily-updates links
                if '/daily-news-analysis/' in href or '/daily-updates/' in href:
                    articles.append({
                        "title": a_tag.get_text(strip=True),
                        "link": urljoin(self.base_url, href)
                    })
        
        # Method 3: Look for links in the main content area
        content_area = soup.find('div', class_='detail-content') or soup.find('div', class_='article-detail')
        if content_area:
            for a_tag in content_area.find_all('a', href=True):
                href = a_tag.get('href')
                if '/daily-news-analysis/' in href or '/daily-updates/' in href:
                    # Make sure it's not a duplicate and has meaningful text
                    title = a_tag.get_text(strip=True)
                    if title and len(title) > 10:  # Filter out short/meaningless links
                        articles.append({
                            "title": title,
                            "link": urljoin(self.base_url, href)
                        })
        
        # Remove duplicates based on URL
        seen = set()
        unique_articles = []
        for art in articles:
            if art["link"] not in seen and art["title"]:
                unique_articles.append(art)
                seen.add(art["link"])
        
        return unique_articles
    
    def scrape_article_content(self, url: str) -> Optional[Dict]:
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
            
            # Convert date string to date object if possible
            published_date = None
            date_string = metadata['date']
            if date_string != "N/A":
                try:
                    from dateutil import parser as date_parser
                    published_date = date_parser.parse(date_string).date()
                except:
                    published_date = None
            
            # Format article data for database
            article_data = {
                'title': metadata['title'],
                'url': url,
                'date': date_string,  # Keep original date string
                'published_date': published_date,
                'image_url': image_url,
                'intro': intro[:500] if intro else '',  # Limit intro length
                'importance_rating': metadata.get('importance_rating', 'N/A'),
                'sections': content_sections
            }
            
            logger.debug(f"Successfully scraped article: {metadata['title']} - Date: {date_string}")
            return article_data
            
        except Exception as e:
            logger.error(f"Error scraping article {url}: {e}")
            return None
    
    def article_exists(self, url: str) -> bool:
        """Check if article already exists in database"""
        try:
            self.cursor.execute("SELECT 1 FROM gk_today_content WHERE url = %s", (url,))
            return self.cursor.fetchone() is not None
        except Exception as e:
            logger.error(f"Error checking article existence: {e}")
            return False
    
    def insert_article(self, article_data: Dict) -> Optional[str]:
        """Insert article into database"""
        try:
            # Check if article already exists
            if self.article_exists(article_data['url']):
                logger.debug(f"Article already exists: {article_data['title']}")
                return None
            
            # Generate ID
            article_id = uuid.uuid4()
            
            # Insert main article with proper date handling
            self.cursor.execute("""
                INSERT INTO gk_today_content 
                (id, title, url, image_url, published_date, intro, source_name, date, importance_rating)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                article_id,
                article_data['title'],
                article_data['url'],
                article_data.get('image_url', ''),
                article_data.get('published_date'),  # Already parsed date object
                article_data.get('intro', ''),
                'DrishtiIAS',
                article_data.get('date', 'N/A'),  # Original date string
                article_data.get('importance_rating', 'N/A')
            ))
            
            # Insert sections if available
            if 'sections' in article_data:
                for section_order, section in enumerate(article_data['sections']):
                    section_id = uuid.uuid4()
                    self.cursor.execute("""
                        INSERT INTO sections 
                        (id, article_id, heading, content, type, sequence_order)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        section_id,
                        article_id,
                        section.get('heading', ''),
                        section.get('content', ''),
                        'list' if section.get('bullet_points') else 'paragraph',
                        section_order
                    ))
                    
                    # Insert bullet points if available
                    if 'bullet_points' in section:
                        for bullet_order, bullet in enumerate(section['bullet_points']):
                            self.cursor.execute("""
                                INSERT INTO section_bullets 
                                (section_id, content, bullet_order)
                                VALUES (%s, %s, %s)
                            """, (section_id, bullet, bullet_order))
            
            self.conn.commit()
            logger.info(f"Successfully inserted article: {article_data['title']}")
            return str(article_id)
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error inserting article: {e}")
            return None
    
    def sync_articles(self, max_days: int = 7, max_articles: int = 100) -> ScrapingResult:
        """
        Sync latest articles from DrishtiIAS
        This is the main method for production use
        """
        start_time = time.time()
        logger.info(f"Starting DrishtiIAS article sync (max_days: {max_days}, max_articles: {max_articles})")
        
        if not self.init_database():
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
        consecutive_existing = 0
        max_consecutive_existing = 5  # Stop after 5 consecutive existing articles
        
        try:
            for days_ago in range(max_days):
                if articles_scraped >= max_articles:
                    break
                
                current_date = (datetime.now() - timedelta(days=days_ago)).strftime('%d-%m-%Y')
                date_url = self.get_date_url(days_ago)
                
                logger.info(f"Checking articles for {current_date} at {date_url}")
                
                # Fetch the page for this day
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
                
                day_scraped = 0
                day_existing = 0
                
                for i, article_link in enumerate(article_links):
                    if articles_scraped >= max_articles:
                        break
                    
                    try:
                        article_url = article_link["link"]
                        article_title = article_link["title"]
                        
                        logger.debug(f"Processing article {i+1}/{len(article_links)}: {article_title}")
                        
                        # Check if article already exists
                        if self.article_exists(article_url):
                            articles_skipped += 1
                            day_existing += 1
                            consecutive_existing += 1
                            logger.debug(f"Skipping existing article: {article_title}")
                            continue
                        
                        # Scrape the article
                        article_data = self.scrape_article_content(article_url)
                        
                        if not article_data:
                            logger.warning(f"Could not scrape article: {article_title}")
                            continue
                        
                        # Insert into database
                        article_id = self.insert_article(article_data)
                        if article_id:
                            articles_scraped += 1
                            day_scraped += 1
                            consecutive_existing = 0  # Reset counter
                            logger.info(f"✓ Scraped new article: {article_data['title']}")
                        
                        # Rate limiting
                        time.sleep(self.rate_limit_delay)
                        
                    except Exception as e:
                        error_msg = f"Error processing article {article_link.get('title', 'Unknown')}: {e}"
                        logger.error(error_msg)
                        errors.append(error_msg)
                
                logger.info(f"Day {current_date} summary: {day_scraped} new articles, {day_existing} existing articles")
                
                # Stop if we've found too many consecutive existing articles
                if consecutive_existing >= max_consecutive_existing:
                    logger.info(f"Found {consecutive_existing} consecutive existing articles. Stopping sync.")
                    break
                
                # Add delay between days
                if days_ago < max_days - 1:
                    time.sleep(self.rate_limit_delay + 1)
        
        except Exception as e:
            error_msg = f"Critical error during scraping: {e}"
            logger.error(error_msg)
            errors.append(error_msg)
        
        finally:
            self.close()
        
        runtime = time.time() - start_time
        
        result = ScrapingResult(
            success=len(errors) == 0,
            articles_scraped=articles_scraped,
            articles_skipped=articles_skipped,
            errors=errors,
            runtime_seconds=runtime
        )
        
        logger.info(f"DrishtiIAS sync completed: {articles_scraped} new articles, {articles_skipped} skipped, {runtime:.2f}s")
        
        return result
    
    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.debug("Database connection closed")

def main():
    """Main function for testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description="DrishtiIAS Scraper")
    parser.add_argument("--max-days", type=int, default=3, help="Maximum days to check")
    parser.add_argument("--max-articles", type=int, default=50, help="Maximum articles to scrape")
    parser.add_argument("--log-level", default="INFO", help="Log level")
    
    args = parser.parse_args()
    
    # Set up logging
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    scraper = EnhancedDrishtiScraperFixed()
    try:
        result = scraper.sync_articles(
            max_days=args.max_days,
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
