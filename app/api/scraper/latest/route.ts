import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '10'
    
    const command = `cd production_scrapers && python cli.py latest --limit ${limit} --pretty`
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000, // 30 second timeout
      cwd: process.cwd()
    })

    if (stderr && !stderr.includes('warning')) {
      console.error('Latest articles stderr:', stderr)
    }

    let articles
    try {
      articles = JSON.parse(stdout)
    } catch {
      // If JSON parsing fails, try to extract useful info
      articles = {
        success: false,
        message: 'Failed to parse latest articles',
        output: stdout
      }
    }

    return NextResponse.json({
      success: true,
      data: articles,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Latest articles error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to get latest articles'
      },
      { status: 500 }
    )
  }
}
