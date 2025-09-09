import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get('source') || 'all';
    const days = url.searchParams.get('days') || '3';
    
    console.log(`Starting scraper with source: ${source}, days: ${days}`);
    
    // Path to the production scrapers directory
    const scrapersPath = join(process.cwd(), 'production_scrapers');
    
    // Build the command arguments
    const args = ['cli.py', 'quick'];
    
    // Add source-specific flags
    if (source === 'gktoday') {
      args.push('--gktoday');
    } else if (source === 'drishti') {
      args.push('--drishti');
    } else {
      // If source is 'all', add both flags
      args.push('--gktoday', '--drishti');
    }
    
    // Add max articles parameter for better control
    args.push('--max-articles', '30');  // Reasonable default for last 3 days
    
    // Execute the Python scraper with virtual environment
    const result = await new Promise<{success: boolean, message: string, output: string}>((resolve, reject) => {
      // Use bash to activate virtual environment and run Python
      const bashCommand = `source ../venv/bin/activate && python ${args.join(' ')}`;
      const python = spawn('bash', ['-c', bashCommand], {
        cwd: scrapersPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          console.error(`Scraper failed with code ${code}`);
          console.error('stderr:', stderr);
          resolve({
            success: false,
            message: `Scraper failed with exit code ${code}`,
            output: stderr || stdout
          });
        } else {
          console.log('Scraper completed successfully');
          console.log('stdout:', stdout);
          resolve({
            success: true,
            message: 'Scraper ran successfully',
            output: stdout
          });
        }
      });
      
      python.on('error', (error) => {
        console.error('Failed to start scraper:', error);
        reject(error);
      });
    });
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      details: result.output
    });
  } catch (error) {
    console.error('Error running scraper:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
