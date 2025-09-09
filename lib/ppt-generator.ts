'use client';

// This is a client-side wrapper around the PowerPoint generation API
// The actual PowerPoint generation happens on the server

// Re-export types from ppt-templates.ts
import type { PPTTemplate, SlideContent, PPTGenerationOptions } from './ppt-templates';
export type { PPTTemplate, SlideContent, PPTGenerationOptions } from './ppt-templates';
export { PPT_TEMPLATES } from './ppt-templates';

/**
 * Client-side function to generate and download a PowerPoint presentation
 * This function calls the API endpoint for PowerPoint generation
 */
export async function generateAndDownloadPresentation(
  title: string,
  subtitle: string | undefined,
  templateId: string,
  articleIds: string[],
  aiArticleIds?: string[]
): Promise<void> {
  // Prepare request data
  const requestData = {
    title,
    subtitle,
    template: templateId,
    articleIds,
    aiArticleIds: aiArticleIds || []
  };
  
  // Call API to generate presentation
  const response = await fetch('/api/generate-ppt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate presentation');
  }
  
  // Get file blob and download it
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_presentation.pptx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Stub implementation to maintain compatibility with existing code
 * This will throw an error if called directly in the browser
 */
export async function generatePresentation(options: PPTGenerationOptions): Promise<Buffer> {
  throw new Error('Cannot generate presentations directly in the browser. Use the API endpoint instead.');
  // This is just to satisfy TypeScript - never executed
  return Buffer.from('');
}
