# Educational Platform

An educational platform with article browsing, educational content, and knowledge sharing capabilities.

## Recent Changes (May 29, 2025)

- Simplified the platform to remove authentication requirements
- Updated the scraper to use environment variables for database connection
- Created API endpoints to fetch articles from the database
- Built UI components to display articles on the web portal
- Disabled role management functionality (to be added back later)

## Features

- **Article Browsing:** Access educational articles scraped from GKToday
- **Content Organization:** Articles are categorized and easy to navigate
- **Clean UI:** Modern, responsive user interface built with Next.js and Tailwind CSS

## Database Setup

This application uses a PostgreSQL database hosted on Supabase. Follow these steps to set up the database:

### 1. Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Connection Details
NEXT_PUBLIC_SUPABASE_URL=https://nukbivdxxzjwfoyjzblw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# External PostgreSQL Connection
DATABASE_URL=postgresql://postgres.nukbivdxxzjwfoyjzblw:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Replace `[password]` with the actual database password.

### 2. Initialize Database Schema

To initialize the database schema, run:

```bash
node scripts/run-migration.js
```

### 3. Run the Scraper

To populate the database with educational content from GKToday, run:

```bash
python fixed_scraper.py
```

Or you can use the "Run Scraper" button on the home page after starting the application.

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Project Structure

- `/app`: Next.js application routes and API endpoints
- `/components`: UI components
- `/lib`: Utility functions and database connections
- `fixed_scraper.py`: Python script to scrape educational content from GKToday

## Technical Stack

- **Frontend:** Next.js with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend:** Next.js API routes
- **Database:** PostgreSQL via Supabase
- **Data Collection:** Python scraper for GKToday content

## Future Enhancements

- Reintroduce user authentication and role management
- Add MCQ/quiz functionality
- Implement slide presentations for educational content
- Create admin dashboard for content management

This will create all necessary tables in the database.

### 3. Verify Setup

To verify that your database setup is working correctly, run:

```bash
node scripts/verify-setup.js
```

This will check that all environment variables are set correctly and that the application can connect to the database.

### 4. Working with Slides

You can use the slides database utility to manage slides and directories:

```bash
# List all slide directories
node scripts/slides-db-util.js listDirs

# List slides in a directory
node scripts/slides-db-util.js list <directory-id>

# Create a new directory
node scripts/slides-db-util.js createDir "Directory Name" "Optional description"

# Create a new slide
node scripts/slides-db-util.js createSlide <directory-id> "Slide Title" "Slide Content"
```

### 5. Import Scraped Content

To import scraped content into the database, place JSON files in the `data/scraped` directory and run:

```bash
node scripts/import-scraped-content.js
```

## Running the Application

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will be available at http://localhost:3000.

## Features

- **Slide Management**: Create and organize educational slides into directories
- **Student Registration**: Manage student accounts and invitations
- **Content Management**: Import and manage scraped educational content
- **Authentication**: User authentication and role-based access control
