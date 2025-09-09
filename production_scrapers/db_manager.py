#!/usr/bin/env python3
"""
Database management script for wiping and setting up the articles database
"""

import os
import sys
import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Load environment variables
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
dotenv_path = os.path.join(root_dir, '.env.local')
load_dotenv(dotenv_path)

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL not found in .env.local")
    return psycopg2.connect(database_url)

def list_tables():
    """List all tables in the database"""
    print("📋 Checking current database tables...")
    
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cursor:
                cursor.execute("""
                    SELECT table_name, table_type
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """)
                
                tables = cursor.fetchall()
                
                if tables:
                    print(f"Found {len(tables)} table(s):")
                    for table in tables:
                        print(f"  - {table['table_name']} ({table['table_type']})")
                else:
                    print("  ✅ No tables found - database is clean")
                
                return [table['table_name'] for table in tables if table['table_type'] == 'BASE TABLE']
                
    except Exception as e:
        print(f"❌ Error listing tables: {e}")
        return []

def count_articles():
    """Count articles in the database"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM articles")
                count = cursor.fetchone()[0]
                print(f"📊 Current articles count: {count}")
                return count
    except Exception as e:
        print(f"❌ Error counting articles (table might not exist): {e}")
        return 0

def wipe_database():
    """Wipe all tables from the database"""
    print("🗑️  Wiping database...")
    
    tables = list_tables()
    
    if not tables:
        print("✅ Database is already clean")
        return True
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Disable foreign key checks temporarily
                cursor.execute("SET session_replication_role = 'replica';")
                
                # Drop all tables
                for table in tables:
                    print(f"  🗑️  Dropping table: {table}")
                    cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
                
                # Re-enable foreign key checks
                cursor.execute("SET session_replication_role = 'origin';")
                
                conn.commit()
                print("✅ Database wiped successfully")
                return True
                
    except Exception as e:
        print(f"❌ Error wiping database: {e}")
        return False

def create_articles_table():
    """Create the articles table with proper schema"""
    print("🏗️  Creating articles table...")
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS articles (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        title TEXT NOT NULL,
                        content TEXT NOT NULL,
                        source TEXT NOT NULL,
                        url TEXT UNIQUE NOT NULL,
                        published_date DATE,
                        importance TEXT,
                        tags TEXT[],
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Create indexes for better performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_published_date ON articles(published_date)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url)")
                
                conn.commit()
                print("✅ Articles table created successfully")
                return True
                
    except Exception as e:
        print(f"❌ Error creating articles table: {e}")
        return False

def verify_setup():
    """Verify the database setup"""
    print("🔍 Verifying database setup...")
    
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cursor:
                # Check table exists
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'articles'
                """)
                
                if cursor.fetchone():
                    print("✅ Articles table exists")
                else:
                    print("❌ Articles table not found")
                    return False
                
                # Check columns
                cursor.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'articles' AND table_schema = 'public'
                    ORDER BY ordinal_position
                """)
                
                columns = cursor.fetchall()
                print(f"📋 Table columns ({len(columns)}):")
                for col in columns:
                    print(f"  - {col['column_name']} ({col['data_type']})")
                
                # Check indexes
                cursor.execute("""
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename = 'articles' AND schemaname = 'public'
                """)
                
                indexes = cursor.fetchall()
                print(f"🔗 Indexes ({len(indexes)}):")
                for idx in indexes:
                    print(f"  - {idx['indexname']}")
                
                return True
                
    except Exception as e:
        print(f"❌ Error verifying setup: {e}")
        return False

def main():
    """Main function"""
    print("=" * 60)
    print("DATABASE MANAGEMENT SCRIPT")
    print("=" * 60)
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
    else:
        command = "full"
    
    if command == "list":
        list_tables()
    elif command == "count":
        count_articles()
    elif command == "wipe":
        wipe_database()
        list_tables()
    elif command == "create":
        create_articles_table()
        verify_setup()
    elif command == "verify":
        verify_setup()
    elif command == "full":
        # Full reset process
        print("🚀 Starting full database reset...")
        
        # Step 1: Show current state
        list_tables()
        count_articles()
        
        # Step 2: Wipe database
        if wipe_database():
            # Step 3: Verify wipe
            list_tables()
            
            # Step 4: Create fresh table
            if create_articles_table():
                # Step 5: Verify setup
                verify_setup()
                print("\n🎉 Database reset completed successfully!")
            else:
                print("\n❌ Failed to create articles table")
                return 1
        else:
            print("\n❌ Failed to wipe database")
            return 1
    else:
        print("Usage: python db_manager.py [list|count|wipe|create|verify|full]")
        print("  list   - List all tables")
        print("  count  - Count articles")
        print("  wipe   - Drop all tables")
        print("  create - Create articles table")
        print("  verify - Verify database setup")
        print("  full   - Complete reset (default)")
        return 1
    
    return 0

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⏹️  Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
