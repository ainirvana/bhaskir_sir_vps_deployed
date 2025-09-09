import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      maxArticles = 20, 
      maxPages = 3,
      sources = ['gktoday', 'drishti'],
      parallel = true 
    } = body

    // Build command arguments
    const sourceArgs = sources.includes('gktoday') && sources.includes('drishti') 
      ? '--gktoday --drishti' 
      : sources.includes('gktoday') 
        ? '--gktoday' 
        : '--drishti'

    const command = `cd production_scrapers && source ../venv/bin/activate && python cli.py quick --max-articles ${maxArticles} --max-pages ${maxPages} ${sourceArgs} --pretty`
    
    console.log(`Executing scraper command: ${command}`)
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 600000, // 10 minute timeout
      cwd: process.cwd(),
      shell: '/bin/bash' // Use bash to support source command
    })

    if (stderr && !stderr.includes('warning')) {
      console.error('Scraper stderr:', stderr)
    }

    let result
    try {
      // Find the first { character to extract only the JSON part
      const jsonStart = stdout.indexOf('{')
      const jsonString = jsonStart >= 0 ? stdout.substring(jsonStart).trim() : stdout
      console.log('Raw stdout:', stdout)
      console.log('Extracted JSON string:', jsonString)
      result = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw stdout for debugging:', JSON.stringify(stdout))
      // If JSON parsing fails, return raw output
      result = { 
        success: true, 
        message: 'Scraper completed',
        output: stdout,
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Scraper sync error:', error)
    
    // Check if it's a timeout error
    if (error?.code === 'TIMEOUT') {
      return NextResponse.json({
        success: false,
        error: 'Scraper operation timed out - it may still be running in background'
      }, { status: 408 })
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to sync content',
        details: error?.stderr || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
