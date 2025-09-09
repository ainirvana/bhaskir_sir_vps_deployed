// Server-side PowerPoint generation module
import pptxgen from 'pptxgenjs';
import { PPT_TEMPLATES, PPTTemplate, LogicalSlide, SlideContent, PPTGenerationOptions } from '../ppt-templates';

/**
 * Creates master slides for the templates
 * @param pres - PptxGenJS instance
 */
function createMasterSlides(pres: any) {
  // Modern template
  pres.defineSlideMaster({
    title: 'MODERN',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 5.3, w: '100%', h: 0.4, fill: { color: '2a6099' } } }
    ],
    slideNumber: { x: 9.0, y: 5.3, color: '2a6099' }
  });

  // Academic template
  pres.defineSlideMaster({
    title: 'ACADEMIC',
    background: { color: 'F1F1F1' },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '4472C4' } } },
      { rect: { x: 0, y: 5.3, w: '100%', h: 0.4, fill: { color: '4472C4' } } }
    ],
    slideNumber: { x: 9.0, y: 5.3, color: 'FFFFFF' }
  });

  // Minimal template
  pres.defineSlideMaster({
    title: 'MINIMAL',
    background: { color: 'FFFFFF' },
    objects: [
      { line: { x: 0.5, y: 5.3, w: 9.0, h: 0, line: { color: 'DADADA', width: 1 } } }
    ],
    slideNumber: { x: 9.0, y: 5.4, color: '999999' }
  });
}

/**
 * Generates a PowerPoint presentation from articles
 * @param options - Configuration options for the presentation
 * @returns Buffer containing the generated presentation
 */
export async function generatePresentation(options: PPTGenerationOptions): Promise<Buffer> {
  const { title, subtitle, template, slides } = options;
  
  // Create new presentation
  const pres = new pptxgen();
  
  // Create master slides
  createMasterSlides(pres);
  
  // Get template ID string
  const templateId = typeof template === 'string' ? template : template.id;
  
  // Add title slide
  const titleSlide = pres.addSlide({ masterName: templateId.toUpperCase() });
  
  titleSlide.addText(title, {
    x: 1,
    y: 2,
    w: 8,
    h: 1.5,
    fontSize: 36,
    bold: true,
    color: '2a6099',
    align: 'center'
  });
  
  if (subtitle) {
    titleSlide.addText(subtitle, {
      x: 1,
      y: 3.5,
      w: 8,
      h: 1,
      fontSize: 24,
      color: '666666',
      align: 'center'
    });
  }
  
  // Add current date
  titleSlide.addText(new Date().toLocaleDateString(), {
    x: 1,
    y: 4.5,
    w: 8,
    h: 0.5,
    fontSize: 16,
    color: '999999',
    align: 'center'
  });
  
  // Add content slides
  slides.forEach((slideContent: SlideContent) => {
    const slide = pres.addSlide({ masterName: templateId.toUpperCase() });
    
    // Add slide title
    slide.addText(slideContent.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: '2a6099'
    });
    
    // Add content (skip images for now to avoid HTTP/HTTPS issues)
    if (slideContent.content) {
      slide.addText(slideContent.content, {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 1.5,
        fontSize: 16,
        color: '333333'
      });
    }
    
    // Add bullet points if available
    if (slideContent.bulletPoints && slideContent.bulletPoints.length > 0) {
      const bulletText = slideContent.bulletPoints.map((point: string) => `• ${point}`).join('\n');
      slide.addText(bulletText, {
        x: 0.5,
        y: 3.2,
        w: 9,
        h: 2.0,
        fontSize: 14,
        color: '333333'
      });
    }
  });
  
  // Generate the presentation as a buffer
  return new Promise((resolve, reject) => {
    try {
      pres.writeFile({ fileName: 'temp.pptx' }).then(() => {
        // Since we can't get buffer directly in this version, 
        // we'll need to read the file and return it
        const fs = require('fs');
        const buffer = fs.readFileSync('temp.pptx');
        fs.unlinkSync('temp.pptx'); // Clean up
        resolve(buffer);
      }).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Extracts content from an article for presentation slides
 * @param article - Article data
 * @returns Generated slide content
 */
export function extractSlidesFromArticle(article: any): SlideContent[] {
  const slides: SlideContent[] = [];
  
  // Title slide (without image to avoid HTTP/HTTPS issues)
  slides.push({
    title: article.title,
    content: article.intro || ''
  });
  
  // Additional slides from sections if available
  if (article.sections && article.sections.length > 0) {
    article.sections.forEach((section: any) => {
      const slideContent: SlideContent = {
        title: section.heading || 'Section',
        content: section.content || '',
      };
      
      // Add bullet points if available
      if (section.section_bullets && section.section_bullets.length > 0) {
        slideContent.bulletPoints = section.section_bullets.map((bullet: any) => bullet.content);
      }
      
      slides.push(slideContent);
    });
  }
  
  return slides;
}
