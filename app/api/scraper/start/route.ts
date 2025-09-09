import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      maxPages = 3,
      maxArticles = 50,
      sources = ['gktoday', 'drishti'],
      parallel = false
    } = body

    // Build command arguments
    const sourceArgs = sources.includes('gktoday') && sources.includes('drishti') 
      ? '--gktoday --drishti' 
      : sources.includes('gktoday') 
        ? '--gktoday' 
        : '--drishti'

    const parallelArg = parallel ? '--parallel' : ''

    const command = `cd production_scrapers && python cli.py start ${sourceArgs} --max-pages ${maxPages} --max-articles ${maxArticles} ${parallelArg}`
    
    console.log(`Starting background scraper: ${command}`)
    
    // Start the scraper in background (don't wait for completion)
    const { stdout, stderr } = await execAsync(command, {
      timeout: 10000, // Just wait for startup confirmation
      cwd: process.cwd()
    })

    if (stderr && !stderr.includes('warning')) {
      console.error('Scraper start stderr:', stderr)
    }

    return NextResponse.json({
      success: true,
      message: 'Background scraping started',
      command: command,
      timestamp: new Date().toISOString(),
      note: 'Use /api/scraper/status to monitor progress'
    })

  } catch (error: any) {
    console.error('Scraper start error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to start scraper',
        details: error?.stderr || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const command = `cd production_scrapers && python cli.py cancel`
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 10000,
      cwd: process.cwd()
    })

    if (stderr && !stderr.includes('warning')) {
      console.error('Scraper cancel stderr:', stderr)
    }

    return NextResponse.json({
      success: true,
      message: 'Scraper operation cancelled',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Scraper cancel error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to cancel scraper'
      },
      { status: 500 }
    )
  }
}
