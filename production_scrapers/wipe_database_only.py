#!/usr/bin/env python3
"""
Script to ONLY wipe the database without scraping
This allows us to test the production scrapers on a clean database
"""

import os
import sys
import logging
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env.local')

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

def wipe_database():
    """Wipe the PostgreSQL database tables completely"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        logger.info("Wiping database tables...")
        
        # Drop tables in correct order (considering foreign key constraints)
        tables_to_drop = [
            'section_bullets',
            'sections', 
            'gk_today_content',
            'quiz_attempts',
            'student_invitations',
            'scraped_content'
        ]
        
        for table in tables_to_drop:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
                logger.info(f"Dropped table: {table}")
            except Exception as e:
                logger.warning(f"Could not drop table {table}: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        logger.info("Database wiped successfully")
        return True
    except Exception as e:
        logger.error(f"Error wiping database: {e}")
        return False

def initialize_database():
    """Initialize a fresh database with required tables"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        logger.info("Initializing database tables...")
        
        # Create main content table for both GKToday and DrishtiIAS
        cursor.execute('''
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
        ''')
        
        # Create sections table for structured content
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sections (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                article_id UUID REFERENCES gk_today_content(id) ON DELETE CASCADE,
                heading TEXT,
                content TEXT,
                type TEXT CHECK (type IN ('paragraph', 'list')),
                sequence_order INTEGER
            )
        ''')
        
        # Create section_bullets table for bullet points
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS section_bullets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                bullet_order INTEGER
            )
        ''')
        
        conn.commit()
        cursor.close()
        conn.close()
        logger.info("Database initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        return False

def main():
    """Main function - wipe and initialize database only"""
    logger.info("=" * 60)
    logger.info("WIPING DATABASE FOR PRODUCTION SCRAPER TESTING")
    logger.info("=" * 60)
    
    # Step 1: Wipe database
    logger.info("Step 1: Wiping database...")
    if not wipe_database():
        logger.error("Failed to wipe database. Exiting.")
        return 1
    
    # Step 2: Initialize fresh database
    logger.info("Step 2: Initializing fresh database...")
    if not initialize_database():
        logger.error("Failed to initialize database. Exiting.")
        return 1
    
    logger.info("=" * 60)
    logger.info("SUCCESS: Database wiped and ready for production scraper testing!")
    logger.info("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
