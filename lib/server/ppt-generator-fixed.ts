// lib/server/ppt-generator-fixed.ts

import pptxgen from 'pptxgenjs';
import { PPTTemplate, LogicalSlide, PPTGenerationOptions, ContentBlock } from '../ppt-templates';
import { formatDate } from '../utils'; // Assuming you have this utility

// --- ENHANCED CONSTANTS FOR BETTER LAYOUT ---

const SLIDE_WIDTH = 10.0;
const SLIDE_HEIGHT = 5.625;
const MARGIN = 0.6; // Increased margin for better spacing
const CONTENT_WIDTH = SLIDE_WIDTH - (MARGIN * 2);
const TITLE_HEIGHT = 0.9; // Dedicated title area
const CONTENT_START_Y = 1.2; // Y-position after the title
const CONTENT_END_Y = SLIDE_HEIGHT - 0.6; // Leave space for footer
const LINE_SPACING = 0.15; // Consistent line spacing

/**
 * Enhanced utility class for better text splitting and layout management
 */
class ContentSplitter {
  // More accurate character estimates based on PowerPoint's default fonts
  private static CHARS_PER_LINE = {
    18: 65, // For paragraphs (larger font)
    16: 75, // For bullets (medium font)
    14: 85, // For sub-bullets (smaller font)
  };

  private static LINES_PER_SLIDE = 12; // Conservative estimate for better readability

  /**
   * Enhanced text splitting with better break points
   * @param text The text to split.
   * @param maxLines The maximum number of lines allowed per chunk.
   * @param fontSize The font size used.
   * @returns An array of text chunks.
   */
  public static splitText(text: string, maxLines: number = 8, fontSize: 18 | 16 | 14 = 16): string[] {
    const charsPerLine = this.CHARS_PER_LINE[fontSize];
    const maxChars = maxLines * charsPerLine;
    let splitPos = -1;
    let chunks: string[] = [];
    let remainingText = text;

    // Enhanced splitting logic for better readability
    while (remainingText.length > 0) {
      splitPos = remainingText.lastIndexOf(' ', maxChars);
      if (splitPos === -1) splitPos = maxChars;

      chunks.push(remainingText.substring(0, splitPos + 1));
      remainingText = remainingText.substring(splitPos + 1).trim();
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Calculate estimated height for text block
   */
  public static estimateHeight(text: string, fontSize: number, width: number): number {
    const charsPerLine = Math.floor(width * 72 / fontSize * 1.2); // Rough calculation
    const lines = Math.ceil(text.length / charsPerLine);
    return Math.max(0.3, lines * (fontSize / 72) * 1.4); // Convert to inches with line spacing
  }
}

/**
 * Manages the layout of a single slide, tracking vertical space
 * to prevent elements from overlapping.
 */
class DynamicLayoutManager {
  private pres: pptxgen;
  private slide: pptxgen.Slide;
  private currentY: number;
  private templateName: string;

  constructor(pres: pptxgen, templateName: string) {
    this.pres = pres;
    this.templateName = templateName;
    this.slide = this.createNewSlide();
    this.currentY = MARGIN;
  }

  private createNewSlide(): pptxgen.Slide {
    const newSlide = this.pres.addSlide({ masterName: this.templateName });
    this.currentY = MARGIN; // Reset Y for new slide
    return newSlide;
  }
  
  private getRemainingSpace(): number {
    return CONTENT_END_Y - this.currentY;
  }

  // A very basic height estimation function.
  // This is the key to dynamic layouts. It can be improved with more precise calculations.
  private estimateTextHeight(text: string, options: any): number {
    const lines = text.split('\n').length;
    const fontSize = options.fontSize || 18;
    // Estimate: font size in points -> inches. (72 points per inch)
    // Add line spacing factor.
    return (lines * fontSize / 72) * 1.5;
  }

  /**
   * Adds a title to the slide.
   * @param titleText The text of the title.
   */
  public addTitle(titleText: string) {
    this.slide.addText(titleText, {
      x: MARGIN,
      y: this.currentY,
      w: CONTENT_WIDTH,
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: '2a6099'
    });
    this.currentY = CONTENT_START_Y;
  }

  /**
   * Adds a block of content (paragraph or bullet) to the slide, handling overflow.
   * @param block The content block to add.
   * @param keywords AI-extracted keywords to bold.
   */
  public addContentBlock(block: ContentBlock, keywords: string[] = []) {
    const options: any = {
      x: MARGIN,
      y: this.currentY,
      w: CONTENT_WIDTH,
      fontSize: block.type === 'paragraph' ? 16 : 14,
      color: '333333',
      bullet: block.type === 'bullet',
      // Indent nested bullets
      ...(block.level && { indentLevel: block.level }),
    };

    // Use the content splitter to handle large text blocks
    const maxLinesPerChunk = 15;
    const textChunks = ContentSplitter.splitText(block.text, maxLinesPerChunk, options.fontSize as 14|16);

    for (const chunk of textChunks) {
      const textToRender = this.formatKeywords(chunk, keywords);
      const estimatedHeight = this.estimateTextHeight(chunk, options);
      
      if (estimatedHeight > this.getRemainingSpace()) {
        this.slide = this.createNewSlide(); // Create a continuation slide
        this.currentY = CONTENT_START_Y;
      }

      this.slide.addText(textToRender, { ...options, y: this.currentY, h: estimatedHeight });
      this.currentY += estimatedHeight + 0.1; // Add a small margin
    }
  }
  
  /**
   * Formats the text to bold the specified keywords.
   * `pptxgenjs` can accept an array of text objects for rich formatting.
   * @param text The input text.
   * @param keywords The keywords to bold.
   * @returns An array of pptxgen.TextProps objects.
   */
  private formatKeywords(text: string, keywords: string[]): pptxgen.TextProps[] {
    if (!keywords || keywords.length === 0) return [{ text }];

    // Create a regex to find all keywords (case-insensitive)
    const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
    const parts = text.split(regex);
    
    return parts.map(part => {
      const isKeyword = regex.test(part);
      // Reset regex state for next test
      regex.lastIndex = 0; 
      return { text: part, options: { bold: isKeyword } };
    });
  }
}

// --- CORE PRESENTATION GENERATION LOGIC ---

/**
 * Creates master slides for the templates. (No changes needed here)
 */
function createMasterSlides(pres: pptxgen) {
  // Modern template
  pres.defineSlideMaster({
    title: 'MODERN',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 5.3, w: '100%', h: 0.4, fill: { color: '2a6099' } } }
    ],
    slideNumber: { x: 9.0, y: 5.3, color: '2a6099' }
  });
  // ... other templates are the same
   pres.defineSlideMaster({
    title: 'ACADEMIC',
    background: { color: 'F1F1F1' },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '4472C4' } } },
      { rect: { x: 0, y: 5.3, w: '100%', h: 0.4, fill: { color: '4472C4' } } }
    ],
    slideNumber: { x: 9.0, y: 5.3, color: 'FFFFFF' }
  });

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
 * **ENHANCED** Generates a PowerPoint presentation using a dynamic layout engine.
 * @param options - Configuration options for the presentation.
 * @returns Buffer containing the generated presentation.
 */
export async function generatePresentation(options: PPTGenerationOptions): Promise<Buffer> {
  console.log('🎨 Starting generatePresentation with options:', {
    title: options.title,
    subtitle: options.subtitle,
    template: options.template?.name || 'unknown',
    slideCount: options.slides?.length || 0
  });

  const { title, subtitle, template, slides } = options;
  const pres = new pptxgen();
  
  console.log('📝 Created new pptxgen instance');
  
  createMasterSlides(pres);
  console.log('🎯 Created master slides');
  
  const templateName = (typeof template === 'string' ? template : template.id).toUpperCase();
  console.log('🎨 Using template:', templateName);

  // --- Title Slide ---
  const titleSlide = pres.addSlide({ masterName: templateName });
  titleSlide.addText(title, { x: 1, y: 2, w: 8, h: 1.5, fontSize: 36, bold: true, color: '2a6099', align: 'center' });
  if (subtitle) {
    titleSlide.addText(subtitle, { x: 1, y: 3.5, w: 8, h: 1, fontSize: 24, color: '666666', align: 'center' });
  }
  titleSlide.addText(formatDate(new Date().toISOString()), { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 16, color: '999999', align: 'center' });
  console.log('✅ Created title slide');

  // --- Content Slides (using the new Dynamic Layout Engine) ---
  for (const logicalSlide of slides) {
    console.log(`📄 Processing slide: ${logicalSlide.title}`);
    const layout = new DynamicLayoutManager(pres, templateName);
    layout.addTitle(logicalSlide.title);
    
    for (const block of logicalSlide.blocks) {
      layout.addContentBlock(block, logicalSlide.keywords);
    }
    console.log(`✅ Completed slide: ${logicalSlide.title}`);
  }
  
  console.log('🔄 Generating presentation buffer...');
  // Generate the presentation as a buffer
  const buffer = await pres.write();
  const bufferLength = buffer instanceof ArrayBuffer ? buffer.byteLength : 
                      buffer instanceof Uint8Array ? buffer.length :
                      typeof buffer === 'string' ? buffer.length : 'unknown';
  console.log(`📦 Generated buffer: ${bufferLength} bytes`);
  return buffer as Buffer;
}

/**
 * **ENHANCED** Extracts and structures content from an article for the dynamic layout engine.
 * @param article - Article data from the scraper.
 * @returns An array of LogicalSlide objects.
 */
export function extractSlidesFromArticle(article: any): LogicalSlide[] {
  const logicalSlides: LogicalSlide[] = [];
  
  // Create an intro slide
  if (article.intro) {
    logicalSlides.push({
      title: article.title, // Use main title for the intro slide
      blocks: [{ type: 'paragraph', text: article.intro }]
    });
  }

  // Process each section from the article
  if (article.sections && article.sections.length > 0) {
    article.sections.forEach((section: any) => {
      const blocks: ContentBlock[] = [];
      
      if (section.content) {
        blocks.push({ type: 'paragraph', text: section.content });
      }
      
      if (section.section_bullets && section.section_bullets.length > 0) {
        section.section_bullets.forEach((bullet: any) => {
          blocks.push({ type: 'bullet', text: bullet.content });
        });
      }
      
      if (blocks.length > 0) {
        logicalSlides.push({
          title: section.heading || 'More Information',
          blocks: blocks,
          // Placeholder for AI keyword extraction
          keywords: ['Policy', 'India', 'Economic'] 
        });
      }
    });
  }
  
  return logicalSlides;
}