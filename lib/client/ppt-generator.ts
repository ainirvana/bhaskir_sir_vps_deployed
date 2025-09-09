'use client';

// This is a client-side wrapper around the PowerPoint generation API
// The actual PowerPoint generation happens on the server

// Re-export types and constants from ppt-templates.ts
export type { PPTTemplate, LogicalSlide, PPTGenerationOptions } from '../ppt-templates';
export { PPT_TEMPLATES } from '../ppt-templates';

/**
 * Client-side function to generate and download a PowerPoint presentation
 * This function calls the API endpoint for PowerPoint generation
 */
export async function generateAndDownloadPresentation(
  title: string,
  subtitle: string | undefined,
  templateId: string,
  articleIds: string[],
  aiEnabledArticles?: string[]
): Promise<void> {
  console.log('🎯 Starting presentation generation with params:', {
    title,
    subtitle,
    templateId,
    articleIds,
    aiEnabledArticles
  });

  // Validate required parameters
  if (!title || !templateId || !articleIds || articleIds.length === 0) {
    throw new Error('Missing required parameters: title, templateId, and articleIds');
  }

  // Prepare request data
  const requestData = {
    title,
    subtitle,
    templateId: templateId,
    articleIds,
    useAiForArticleIds: aiEnabledArticles || []
  };
  
  console.log('📤 Sending request to API:', requestData);
  
  // Call API to generate presentation
  const response = await fetch('/api/generate-ppt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  console.log('📥 API Response status:', response.status, response.statusText);
  console.log('📥 API Response headers:', Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API Error:', errorData);
    throw new Error(errorData.error || 'Failed to generate presentation');
  }
  
  // Get file blob and download it
  const blob = await response.blob();
  console.log('📦 Received blob:', blob.size, 'bytes, type:', blob.type);
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_presentation.pptx`;
  document.body.appendChild(a);
  
  console.log('🔗 Created download link:', a.download);
  
  a.click();
  
  console.log('✅ Download initiated');
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    console.log('🧹 Cleaned up download link');
  }, 100);
}
