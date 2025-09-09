import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const command = `cd production_scrapers && python cli.py status --pretty`
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000, // 30 second timeout
      cwd: process.cwd()
    })

    if (stderr && !stderr.includes('warning')) {
      console.error('Scraper status stderr:', stderr)
    }

    let status
    try {
      status = JSON.parse(stdout)
    } catch {
      // If JSON parsing fails, return basic status
      status = { 
        status: 'unknown',
        message: 'Status check completed',
        output: stdout,
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Scraper status error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to get scraper status',
        status: 'error'
      },
      { status: 500 }
    )
  }
}
