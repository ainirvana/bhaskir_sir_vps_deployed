// // lib/server/ppt-generator-enhanced.ts

// import pptxgen from 'pptxgenjs';
// import { PPTTemplate, LogicalSlide, PPTGenerationOptions, ContentBlock } from '../ppt-templates';
// import { formatDate } from '../utils';

// // --- ENHANCED CONSTANTS FOR BETTER LAYOUT ---

// const SLIDE_WIDTH = 10.0;
// const SLIDE_HEIGHT = 5.625;
// const MARGIN = 0.6; // Increased margin for better spacing
// const CONTENT_WIDTH = SLIDE_WIDTH - (MARGIN * 2);
// const TITLE_HEIGHT = 0.9; // Dedicated title area
// const CONTENT_START_Y = 1.2; // Y-position after the title
// const CONTENT_END_Y = SLIDE_HEIGHT - 0.6; // Leave space for footer
// const LINE_SPACING = 0.15; // Consistent line spacing

// /**
//  * Enhanced utility class for better text splitting and layout management
//  */
// class ContentSplitter {
//   // More accurate character estimates based on PowerPoint's default fonts
//   private static CHARS_PER_LINE = {
//     18: 65, // For paragraphs (larger font)
//     16: 75, // For bullets (medium font)
//     14: 85, // For sub-bullets (smaller font)
//   };

//   /**
//    * Enhanced text splitting with better break points
//    */
//   public static splitText(text: string, maxLines: number = 8, fontSize: 18 | 16 | 14 = 16): string[] {
//     const charsPerLine = this.CHARS_PER_LINE[fontSize];
//     const maxChars = maxLines * charsPerLine;
//     const chunks: string[] = [];

//     let remainingText = text.trim();
//     while (remainingText.length > 0) {
//       if (remainingText.length <= maxChars) {
//         chunks.push(remainingText);
//         break;
//       }

//       // Enhanced splitting logic for better readability
//       let splitPos = -1;
      
//       // Try to split at natural break points
//       const naturalBreaks = ['\n\n', '. ', '? ', '! ', '; ', ', ', ' '];
//       for (const breakChar of naturalBreaks) {
//         const pos = remainingText.lastIndexOf(breakChar, maxChars);
//         if (pos > maxChars * 0.6) { // Ensure we don't split too early
//           splitPos = pos + breakChar.length;
//           break;
//         }
//       }

//       // Fallback to character-based split
//       if (splitPos === -1) {
//         splitPos = maxChars;
//       }

//       chunks.push(remainingText.substring(0, splitPos).trim());
//       remainingText = remainingText.substring(splitPos).trim();
//     }

//     return chunks.filter(chunk => chunk.length > 0);
//   }

//   /**
//    * Calculate estimated height for text block
//    */
//   public static estimateHeight(text: string, fontSize: number, width: number): number {
//     const charsPerLine = Math.floor(width * 72 / fontSize * 1.2); // Rough calculation
//     const lines = Math.ceil(text.length / charsPerLine);
//     return Math.max(0.3, lines * (fontSize / 72) * 1.4); // Convert to inches with line spacing
//   }
// }

// /**
//  * Enhanced Dynamic Layout Manager with better positioning and overflow handling
//  */
// class DynamicLayoutManager {
//   private slide: pptxgen.Slide;
//   private currentY: number;
//   private pres: pptxgen;
//   private templateName: string;
//   private continuationSlideCount: number = 0;

//   constructor(pres: pptxgen, templateName: string) {
//     this.pres = pres;
//     this.templateName = templateName;
//     this.slide = this.createNewSlide();
//     this.currentY = CONTENT_START_Y;
//   }

//   /**
//    * Creates a new slide with proper master layout
//    */
//   private createNewSlide(): pptxgen.Slide {
//     const slide = this.pres.addSlide({ masterName: this.templateName });
//     this.currentY = CONTENT_START_Y;
//     return slide;
//   }

//   /**
//    * Calculate remaining space on current slide
//    */
//   private getRemainingSpace(): number {
//     return Math.max(0, CONTENT_END_Y - this.currentY);
//   }

//   /**
//    * Enhanced title addition with better formatting
//    */
//   public addTitle(titleText: string) {
//     // Clean up the title if it's too long
//     const cleanTitle = titleText.length > 80 ? titleText.substring(0, 77) + '...' : titleText;
    
//     this.slide.addText(cleanTitle, {
//       x: MARGIN,
//       y: 0.3,
//       w: CONTENT_WIDTH,
//       h: TITLE_HEIGHT,
//       fontSize: 28,
//       bold: true,
//       color: '2a6099',
//       align: 'left',
//       valign: 'middle'
//     });
//     this.currentY = CONTENT_START_Y;
//   }

//   /**
//    * Enhanced content block addition with proper spacing and overflow handling
//    */
//   public addContentBlock(block: ContentBlock, keywords: string[] = []) {
//     const isTitle = block.type === 'paragraph';
//     const fontSize = isTitle ? 18 : 16;
//     const bulletLevel = block.level || 0;
    
//     // Calculate proper indentation for bullets
//     const indentX = block.type === 'bullet' ? MARGIN + (bulletLevel * 0.3) : MARGIN;
//     const contentWidth = CONTENT_WIDTH - (bulletLevel * 0.3);
    
//     const baseOptions: any = {
//       x: indentX,
//       w: contentWidth,
//       fontSize: fontSize,
//       color: '333333',
//       lineSpacing: 20, // Better line spacing
//       valign: 'top'
//     };

//     // Set bullet formatting if needed
//     if (block.type === 'bullet') {
//       baseOptions.bullet = { type: 'bullet', indent: bulletLevel * 20 };
//     }

//     // Split long text into manageable chunks
//     const maxLines = isTitle ? 6 : 8;
//     const textChunks = ContentSplitter.splitText(block.text, maxLines, fontSize as 18 | 16 | 14);

//     for (let i = 0; i < textChunks.length; i++) {
//       const chunk = textChunks[i];
//       const estimatedHeight = ContentSplitter.estimateHeight(chunk, fontSize, contentWidth);
      
//       // Check if we need a new slide
//       if (estimatedHeight > this.getRemainingSpace() && this.currentY > CONTENT_START_Y) {
//         this.slide = this.createNewSlide();
//         this.continuationSlideCount++;
        
//         // Add continuation indicator
//         if (this.continuationSlideCount > 0) {
//           this.slide.addText('(continued)', {
//             x: CONTENT_WIDTH,
//             y: 0.2,
//             w: 1.5,
//             h: 0.3,
//             fontSize: 12,
//             color: '666666',
//             align: 'right',
//             italic: true
//           });
//         }
//       }

//       // Add the content with proper formatting
//       const textToRender = this.formatKeywords(chunk, keywords);
      
//       this.slide.addText(textToRender, {
//         ...baseOptions,
//         y: this.currentY,
//         h: Math.max(0.4, estimatedHeight)
//       });
      
//       this.currentY += estimatedHeight + LINE_SPACING;
//     }
    
//     // Add extra spacing after paragraph blocks
//     if (block.type === 'paragraph') {
//       this.currentY += LINE_SPACING;
//     }
//   }

//   /**
//    * Enhanced keyword formatting with better rich text support
//    */
//   private formatKeywords(text: string, keywords: string[]): pptxgen.TextProps[] {
//     if (!keywords || keywords.length === 0) {
//       return [{ text, options: {} }];
//     }

//     // Create a case-insensitive regex for all keywords
//     const keywordPattern = keywords
//       .filter(k => k && k.trim().length > 0)
//       .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special chars
//       .join('|');
    
//     if (!keywordPattern) {
//       return [{ text, options: {} }];
//     }

//     const regex = new RegExp(`\\b(${keywordPattern})\\b`, 'gi');
//     const parts = text.split(regex);
//     const result: pptxgen.TextProps[] = [];
    
//     for (let i = 0; i < parts.length; i++) {
//       const part = parts[i];
//       if (!part) continue;
      
//       const isKeyword = regex.test(part);
//       regex.lastIndex = 0; // Reset regex
      
//       result.push({
//         text: part,
//         options: isKeyword ? { bold: true, color: '2a6099' } : {}
//       });
//     }
    
//     return result.length > 0 ? result : [{ text, options: {} }];
//   }
// }

// // --- ENHANCED MASTER SLIDE DEFINITIONS ---

// /**
//  * Creates master slides with proper structure to avoid corruption
//  */
// function createMasterSlides(pres: pptxgen) {
//   // Modern template - clean and professional
//   pres.defineSlideMaster({
//     title: 'MODERN',
//     background: { fill: 'FFFFFF' },
//     objects: [
//       // Header accent line
//       { 
//         rect: { 
//           x: 0, 
//           y: 0, 
//           w: '100%', 
//           h: 0.1, 
//           fill: { color: '2a6099' }
//         } 
//       },
//       // Footer line
//       { 
//         rect: { 
//           x: 0, 
//           y: SLIDE_HEIGHT - 0.1, 
//           w: '100%', 
//           h: 0.1, 
//           fill: { color: '2a6099' }
//         } 
//       }
//     ],
//     slideNumber: { 
//       x: SLIDE_WIDTH - 1, 
//       y: SLIDE_HEIGHT - 0.5, 
//       fontFace: 'Arial',
//       fontSize: 12,
//       color: '2a6099' 
//     }
//   });

//   // Academic template - formal and structured
//   pres.defineSlideMaster({
//     title: 'ACADEMIC',
//     background: { fill: 'F8F9FA' },
//     objects: [
//       // Header bar
//       { 
//         rect: { 
//           x: 0, 
//           y: 0, 
//           w: '100%', 
//           h: 0.5, 
//           fill: { color: '4472C4' }
//         } 
//       },
//       // Footer bar
//       { 
//         rect: { 
//           x: 0, 
//           y: SLIDE_HEIGHT - 0.3, 
//           w: '100%', 
//           h: 0.3, 
//           fill: { color: '4472C4' }
//         } 
//       }
//     ],
//     slideNumber: { 
//       x: SLIDE_WIDTH - 1, 
//       y: SLIDE_HEIGHT - 0.25, 
//       fontFace: 'Arial',
//       fontSize: 12,
//       color: 'FFFFFF' 
//     }
//   });

//   // Minimal template - clean and simple
//   pres.defineSlideMaster({
//     title: 'MINIMAL',
//     background: { fill: 'FFFFFF' },
//     objects: [
//       // Subtle footer line
//       { 
//         line: { 
//           x: MARGIN, 
//           y: SLIDE_HEIGHT - 0.5, 
//           w: CONTENT_WIDTH, 
//           h: 0, 
//           line: { color: 'DADADA', width: 1 } 
//         } 
//       }
//     ],
//     slideNumber: { 
//       x: SLIDE_WIDTH - 1, 
//       y: SLIDE_HEIGHT - 0.4, 
//       fontFace: 'Arial',
//       fontSize: 11,
//       color: '999999' 
//     }
//   });
// }

// /**
//  * **ENHANCED** Generates a PowerPoint presentation with proper structure and formatting
//  */
// export async function generatePresentation(options: PPTGenerationOptions): Promise<Buffer> {
//   console.log('🎨 Starting enhanced presentation generation:', {
//     title: options.title,
//     subtitle: options.subtitle,
//     template: options.template?.name || 'unknown',
//     slideCount: options.slides?.length || 0
//   });

//   const { title, subtitle, template, slides } = options;
  
//   // Create presentation with proper settings
//   const pres = new pptxgen();
//   pres.layout = 'LAYOUT_16x9'; // Ensure 16:9 aspect ratio
//   pres.rtlMode = false; // Ensure left-to-right text direction
  
//   console.log('📝 Created presentation with proper layout settings');
  
//   // Create master slides
//   createMasterSlides(pres);
//   console.log('🎯 Created enhanced master slides');
  
//   const templateName = (typeof template === 'string' ? template : template.id).toUpperCase();
//   console.log('🎨 Using template:', templateName);

//   // --- Enhanced Title Slide ---
//   const titleSlide = pres.addSlide({ masterName: templateName });
  
//   // Main title with better positioning
//   titleSlide.addText(title, { 
//     x: 1, 
//     y: 1.8, 
//     w: 8, 
//     h: 1.2, 
//     fontSize: 40, 
//     bold: true, 
//     color: '2a6099', 
//     align: 'center',
//     valign: 'middle',
//     fontFace: 'Arial'
//   });
  
//   // Subtitle with proper spacing
//   if (subtitle) {
//     titleSlide.addText(subtitle, { 
//       x: 1, 
//       y: 3.2, 
//       w: 8, 
//       h: 0.8, 
//       fontSize: 24, 
//       color: '666666', 
//       align: 'center',
//       valign: 'middle',
//       fontFace: 'Arial'
//     });
//   }
  
//   // Date with proper formatting
//   titleSlide.addText(formatDate(new Date().toISOString()), { 
//     x: 1, 
//     y: 4.2, 
//     w: 8, 
//     h: 0.5, 
//     fontSize: 16, 
//     color: '999999', 
//     align: 'center',
//     valign: 'middle',
//     fontFace: 'Arial'
//   });
  
//   console.log('✅ Created enhanced title slide');

//   // --- Enhanced Content Slides ---
//   for (const logicalSlide of slides) {
//     console.log(`📄 Processing slide: ${logicalSlide.title}`);
    
//     try {
//       const layout = new DynamicLayoutManager(pres, templateName);
//       layout.addTitle(logicalSlide.title);
      
//       // Add content blocks with proper error handling
//       for (const block of logicalSlide.blocks || []) {
//         if (block && block.text && block.text.trim()) {
//           layout.addContentBlock(block, logicalSlide.keywords || []);
//         }
//       }
      
//       console.log(`✅ Successfully created slide: ${logicalSlide.title}`);
//     } catch (slideError) {
//       console.error(`❌ Error creating slide "${logicalSlide.title}":`, slideError);
      
//       // Create a fallback slide to prevent presentation corruption
//       const fallbackSlide = pres.addSlide({ masterName: templateName });
//       fallbackSlide.addText(logicalSlide.title, {
//         x: MARGIN,
//         y: 0.3,
//         w: CONTENT_WIDTH,
//         h: TITLE_HEIGHT,
//         fontSize: 28,
//         bold: true,
//         color: '2a6099'
//       });
//       fallbackSlide.addText('Content could not be displayed properly.', {
//         x: MARGIN,
//         y: CONTENT_START_Y,
//         w: CONTENT_WIDTH,
//         h: 1,
//         fontSize: 16,
//         color: '666666'
//       });
//     }
//   }
  
//   console.log('🔄 Generating presentation buffer...');
  
//   try {
//     // Generate the presentation with proper error handling
//     const bufferData = await pres.write({ outputType: 'base64' });
    
//     // Convert base64 to Buffer
//     const buffer = Buffer.from(bufferData as string, 'base64');
//     console.log(`📦 Generated buffer: ${buffer.length} bytes`);
//     return buffer;
//   } catch (writeError) {
//     console.error('❌ Error generating presentation buffer:', writeError);
//     throw new Error('Failed to generate presentation file. Please try again.');
//   }
// }

// /**
//  * **ENHANCED** Extracts and structures content from an article for the dynamic layout engine.
//  */
// export function extractSlidesFromArticle(article: any): LogicalSlide[] {
//   const logicalSlides: LogicalSlide[] = [];
  
//   // Create an intro slide with better content - remove generic text
//   if (article.intro && article.intro.trim()) {
//     const introText = article.intro.trim();
//     logicalSlides.push({
//       title: "Introduction & Context",
//       blocks: [
//         { 
//           type: 'paragraph', 
//           text: introText
//         }
//       ],
//       keywords: extractKeywordsFromText(introText)
//     });
//   }

//   // Process each section from the article with enhanced structure
//   if (article.sections && Array.isArray(article.sections)) {
//     article.sections.forEach((section: any, index: number) => {
//       const blocks: ContentBlock[] = [];
      
//       // Add section content as paragraph if substantial
//       if (section.content && section.content.trim() && section.content.trim().length > 50) {
//         blocks.push({ 
//           type: 'paragraph', 
//           text: section.content.trim()
//         });
//       }
      
//       // Enhanced bullet processing - ensure we have 3-4 quality points
//       if (section.section_bullets && Array.isArray(section.section_bullets)) {
//         const qualityBullets = section.section_bullets
//           .filter((bullet: any) => bullet.content && bullet.content.trim() && bullet.content.trim().length > 20)
//           .slice(0, 4) // Limit to 4 bullets max
//           .map((bullet: any) => ({
//             type: 'bullet' as const,
//             text: enhanceBulletContent(bullet.content.trim()),
//             level: 0
//           }));
        
//         blocks.push(...qualityBullets);
//       }
      
//       // If we don't have enough bullets, try to extract from content
//       const currentBulletCount = blocks.filter(b => b.type === 'bullet').length;
//       if (currentBulletCount < 3 && section.content) {
//         const extractedBullets = extractBulletsFromText(section.content, 4 - currentBulletCount);
//         blocks.push(...extractedBullets);
//       }
      
//       // Only create slide if there's substantial content
//       if (blocks.length > 0) {
//         const sectionTitle = cleanSectionTitle(section.heading || `Key Point ${index + 1}`);
//         logicalSlides.push({
//           title: sectionTitle,
//           blocks: blocks,
//           keywords: extractKeywordsFromText(section.content || section.heading || '')
//         });
//       }
//     });
//   }
  
//   return logicalSlides;
// }

// /**
//  * Extract meaningful keywords from text content
//  */
// function extractKeywordsFromText(text: string): string[] {
//   if (!text) return [];
  
//   // Common current affairs and policy keywords
//   const importantTerms = [
//     'India', 'Government', 'Policy', 'Act', 'Bill', 'Supreme Court', 'Parliament',
//     'Minister', 'PM', 'President', 'State', 'Central', 'Constitutional', 
//     'Economic', 'Social', 'Development', 'Growth', 'Reform', 'Security',
//     'International', 'Global', 'Strategic', 'National', 'Regional'
//   ];
  
//   const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
//   const keywords = words
//     .filter(word => importantTerms.some(term => term.toLowerCase().includes(word) || word.includes(term.toLowerCase())))
//     .slice(0, 5);
    
//   return keywords.length > 0 ? keywords : ['Important', 'Policy', 'India'];
// }

// /**
//  * Enhance bullet content to be more impactful
//  */
// function enhanceBulletContent(content: string): string {
//   if (!content) return '';
  
//   // Remove redundant phrases and make more direct
//   let enhanced = content
//     .replace(/^This\s+/i, '')
//     .replace(/^The\s+article\s+/i, '')
//     .replace(/\s+provides\s+/i, ' ')
//     .replace(/\s+comprehensive\s+coverage\s+/i, ' ')
//     .replace(/\s+insights?\s+/i, ' ')
//     .trim();
    
//   // Ensure it starts with a capital letter and ends with proper punctuation
//   if (enhanced.length > 0) {
//     enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
//     if (!/[.!?]$/.test(enhanced)) {
//       enhanced += '.';
//     }
//   }
  
//   return enhanced;
// }

// /**
//  * Extract bullet points from paragraph text
//  */
// function extractBulletsFromText(text: string, maxBullets: number): ContentBlock[] {
//   if (!text || maxBullets <= 0) return [];
  
//   const bullets: ContentBlock[] = [];
  
//   // Split by common delimiters and extract meaningful sentences
//   const sentences = text
//     .split(/[.!?;]/)
//     .map(s => s.trim())
//     .filter(s => s.length > 30 && s.length < 200) // Good length for bullets
//     .slice(0, maxBullets);
    
//   sentences.forEach(sentence => {
//     if (sentence) {
//       bullets.push({
//         type: 'bullet',
//         text: enhanceBulletContent(sentence),
//         level: 0
//       });
//     }
//   });
  
//   return bullets;
// }

// /**
//  * Clean and improve section titles
//  */
// function cleanSectionTitle(title: string): string {
//   if (!title) return 'Key Information';
  
//   // Remove common prefixes and clean up
//   let cleaned = title
//     .replace(/^What\s+(is|are)\s+/i, '')
//     .replace(/^Why\s+/i, '')
//     .replace(/^How\s+/i, '')
//     .replace(/\s+\?+$/, '')
//     .trim();
    
//   // Ensure proper capitalization
//   cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
//   return cleaned;
// }

// lib/server/ppt-generator-enhanced.ts

import pptxgen from 'pptxgenjs';
import { PPTTemplate, LogicalSlide, PPTGenerationOptions, ContentBlock } from '../ppt-templates';
import { formatDate } from '../utils';

// --- CORE PRESENTATION RENDERING LOGIC (No changes needed here as it is robust) ---

const SLIDE_WIDTH = 10.0;
const SLIDE_HEIGHT = 5.625;
const MARGIN = 0.5;
const CONTENT_WIDTH = SLIDE_WIDTH - (MARGIN * 2);
const TITLE_HEIGHT = 0.7;
const CONTENT_START_Y = 1.0;
const CONTENT_END_Y = SLIDE_HEIGHT - 0.3;
const LINE_SPACING = 0.1;

class ContentSplitter {
  private static CHARS_PER_LINE = { 18: 65, 16: 75, 14: 85 };
  public static splitText(text: string, maxLines: number = 8, fontSize: 18 | 16 | 14 = 16): string[] {
    const charsPerLine = this.CHARS_PER_LINE[fontSize];
    const maxChars = maxLines * charsPerLine;
    const chunks: string[] = [];
    let remainingText = text.trim();
    while (remainingText.length > 0) {
      if (remainingText.length <= maxChars) {
        chunks.push(remainingText);
        break;
      }
      let splitPos = -1;
      const naturalBreaks = ['\n\n', '. ', '? ', '! ', '; ', ', ', ' '];
      for (const breakChar of naturalBreaks) {
        const pos = remainingText.lastIndexOf(breakChar, maxChars);
        if (pos > maxChars * 0.6) {
          splitPos = pos + breakChar.length;
          break;
        }
      }
      if (splitPos === -1) {
        splitPos = maxChars;
      }
      chunks.push(remainingText.substring(0, splitPos).trim());
      remainingText = remainingText.substring(splitPos).trim();
    }
    return chunks.filter(chunk => chunk.length > 0);
  }
  public static estimateHeight(text: string, fontSize: number, width: number): number {
    const charsPerLine = Math.floor(width * 72 / fontSize * 1.2);
    const lines = Math.ceil(text.length / charsPerLine);
    return Math.max(0.25, lines * (fontSize / 72) * 1.1);
  }
}

class DynamicLayoutManager {
  private slide: pptxgen.Slide;
  private currentY: number;
  private pres: pptxgen;
  private templateName: string;
  private continuationSlideCount: number = 0;

  constructor(pres: pptxgen, templateName: string) {
    this.pres = pres;
    this.templateName = templateName;
    this.slide = this.createNewSlide();
    this.currentY = CONTENT_START_Y;
  }
  private createNewSlide(): pptxgen.Slide {
    const slide = this.pres.addSlide({ masterName: this.templateName });
    this.currentY = CONTENT_START_Y;
    return slide;
  }
  private getRemainingSpace(): number {
    return Math.max(0, CONTENT_END_Y - this.currentY);
  }
  public addTitle(titleText: string) {
    const cleanTitle = titleText.length > 80 ? titleText.substring(0, 77) + '...' : titleText;
    this.slide.addText(cleanTitle, { x: MARGIN, y: 0.2, w: CONTENT_WIDTH, h: TITLE_HEIGHT, fontSize: 24, bold: true, color: '2a6099', align: 'left', valign: 'middle' });
    this.currentY = CONTENT_START_Y;
  }
  public addContentBlock(block: ContentBlock, keywords: string[] = []) {
    // Handle QR code blocks specially
    if (block.type === 'qr_code') {
      this.addQRCode(block.text);
      return;
    }
    
    const isTitle = block.type === 'paragraph';
    const fontSize = isTitle ? 16 : 14;
    const bulletLevel = block.level || 0;
    const indentX = block.type === 'bullet' ? MARGIN + (bulletLevel * 0.2) : MARGIN;
    const contentWidth = CONTENT_WIDTH - (bulletLevel * 0.2);
    const baseOptions: any = { x: indentX, w: contentWidth, fontSize: fontSize, color: '333333', lineSpacing: 16, valign: 'top' };
    if (block.type === 'bullet') {
      baseOptions.bullet = {
        type: 'bullet',
        indent: bulletLevel * 20,
        style: '•'
      };
    }
    // For bullet points, don't split the text - keep each bullet as a single item
    if (block.type === 'bullet') {
      const estimatedHeight = ContentSplitter.estimateHeight(block.text, fontSize, contentWidth);
      if (estimatedHeight > this.getRemainingSpace() && this.currentY > CONTENT_START_Y) {
        this.slide = this.createNewSlide();
        this.continuationSlideCount++;
        if (this.continuationSlideCount > 0) {
          this.slide.addText('(continued)', { x: CONTENT_WIDTH, y: 0.2, w: 1.5, h: 0.3, fontSize: 12, color: '666666', align: 'right', italic: true });
        }
      }
      const textToRender = this.formatKeywords(block.text, keywords);
      this.slide.addText(textToRender, { ...baseOptions, y: this.currentY, h: Math.max(0.3, estimatedHeight) });
      this.currentY += Math.max(0.3, estimatedHeight) + LINE_SPACING;
    } else {
      // For paragraphs, use the existing splitting logic
      const maxLines = isTitle ? 6 : 8;
      const textChunks = ContentSplitter.splitText(block.text, maxLines, fontSize as 18 | 16 | 14);
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const estimatedHeight = ContentSplitter.estimateHeight(chunk, fontSize, contentWidth);
        if (estimatedHeight > this.getRemainingSpace() && this.currentY > CONTENT_START_Y) {
          this.slide = this.createNewSlide();
          this.continuationSlideCount++;
          if (this.continuationSlideCount > 0) {
            this.slide.addText('(continued)', { x: CONTENT_WIDTH, y: 0.2, w: 1.5, h: 0.3, fontSize: 12, color: '666666', align: 'right', italic: true });
          }
        }
        const textToRender = this.formatKeywords(chunk, keywords);
        this.slide.addText(textToRender, { ...baseOptions, y: this.currentY, h: Math.max(0.3, estimatedHeight) });
        this.currentY += Math.max(0.3, estimatedHeight) + LINE_SPACING;
      }
    }
    if (block.type === 'paragraph') {
      this.currentY += LINE_SPACING;
    }
  }
  private formatKeywords(text: string, keywords: string[]): pptxgen.TextProps[] {
    if (!keywords || keywords.length === 0) return [{ text, options: {} }];
    const keywordPattern = keywords.filter(k => k && k.trim().length > 0).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (!keywordPattern) return [{ text, options: {} }];
    const regex = new RegExp(`\\b(${keywordPattern})\\b`, 'gi');
    const parts = text.split(regex);
    const result: pptxgen.TextProps[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      const isKeyword = regex.test(part);
      regex.lastIndex = 0;
      result.push({ text: part, options: isKeyword ? { bold: true, color: '2a6099' } : {} });
    }
    return result.length > 0 ? result : [{ text, options: {} }];
  }

  /**
   * Add QR code to the slide
   */
  private addQRCode(url: string) {
    try {
      // Check if we have enough space for QR code (needs about 2 inches)
      const qrCodeSize = 2.0;
      const requiredSpace = qrCodeSize + 0.5; // QR code + some padding
      
      if (requiredSpace > this.getRemainingSpace() && this.currentY > CONTENT_START_Y) {
        this.slide = this.createNewSlide();
        this.continuationSlideCount++;
      }
      
      // Center the QR code horizontally
      const qrCodeX = (SLIDE_WIDTH - qrCodeSize) / 2;
      
      // Generate QR code URL using a free QR code API
      const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
      
      // Add QR code image
      this.slide.addImage({
        path: qrCodeImageUrl,
        x: qrCodeX,
        y: this.currentY,
        w: qrCodeSize,
        h: qrCodeSize
      });
      
      this.currentY += qrCodeSize + 0.2;
      
      console.log(`✅ Added QR code for: ${url}`);
    } catch (error) {
      console.error('❌ Error adding QR code:', error);
      // Fallback: just add the URL as text
      this.slide.addText(`Quiz URL: ${url}`, {
        x: MARGIN,
        y: this.currentY,
        w: CONTENT_WIDTH,
        h: 0.4,
        fontSize: 12,
        color: '666666',
        align: 'center'
      });
      this.currentY += 0.6;
    }
  }
}

function createMasterSlides(pres: pptxgen) {
  pres.defineSlideMaster({ title: 'MODERN', background: { fill: 'FFFFFF' }, objects: [{ rect: { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: '2a6099' } } }, { rect: { x: 0, y: SLIDE_HEIGHT - 0.1, w: '100%', h: 0.1, fill: { color: '2a6099' } } }], slideNumber: { x: SLIDE_WIDTH - 1, y: SLIDE_HEIGHT - 0.5, fontFace: 'Arial', fontSize: 12, color: '2a6099' } });
  pres.defineSlideMaster({ title: 'ACADEMIC', background: { fill: 'F8F9FA' }, objects: [{ rect: { x: 0, y: 0, w: '100%', h: 0.5, fill: { color: '4472C4' } } }, { rect: { x: 0, y: SLIDE_HEIGHT - 0.3, w: '100%', h: 0.3, fill: { color: '4472C4' } } }], slideNumber: { x: SLIDE_WIDTH - 1, y: SLIDE_HEIGHT - 0.25, fontFace: 'Arial', fontSize: 12, color: 'FFFFFF' } });
  pres.defineSlideMaster({ title: 'MINIMAL', background: { fill: 'FFFFFF' }, objects: [{ line: { x: MARGIN, y: SLIDE_HEIGHT - 0.5, w: CONTENT_WIDTH, h: 0, line: { color: 'DADADA', width: 1 } } }], slideNumber: { x: SLIDE_WIDTH - 1, y: SLIDE_HEIGHT - 0.4, fontFace: 'Arial', fontSize: 11, color: '999999' } });
}

export async function generatePresentation(options: PPTGenerationOptions): Promise<Buffer> {
  console.log('🎨 Starting enhanced presentation generation:', { title: options.title, subtitle: options.subtitle, template: options.template?.name || 'unknown', slideCount: options.slides?.length || 0 });
  const { title, subtitle, template, slides } = options;
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.rtlMode = false;
  console.log('📝 Created presentation with proper layout settings');
  createMasterSlides(pres);
  console.log('🎯 Created enhanced master slides');
  const templateName = (typeof template === 'string' ? template : template.id).toUpperCase();
  console.log('🎨 Using template:', templateName);
  const titleSlide = pres.addSlide({ masterName: templateName });
  titleSlide.addText(title, { x: 1, y: 1.8, w: 8, h: 1.2, fontSize: 40, bold: true, color: '2a6099', align: 'center', valign: 'middle', fontFace: 'Arial' });
  if (subtitle) {
    titleSlide.addText(subtitle, { x: 1, y: 3.2, w: 8, h: 0.8, fontSize: 24, color: '666666', align: 'center', valign: 'middle', fontFace: 'Arial' });
  }
  titleSlide.addText(formatDate(new Date().toISOString()), { x: 1, y: 4.2, w: 8, h: 0.5, fontSize: 16, color: '999999', align: 'center', valign: 'middle', fontFace: 'Arial' });
  console.log('✅ Created enhanced title slide');
  for (const logicalSlide of slides) {
    console.log(`📄 Processing slide: ${logicalSlide.title}`);
    try {
      const layout = new DynamicLayoutManager(pres, templateName);
      layout.addTitle(logicalSlide.title);
      for (const block of logicalSlide.blocks || []) {
        if (block && block.text && block.text.trim()) {
          layout.addContentBlock(block, logicalSlide.keywords || []);
        }
      }
      console.log(`✅ Successfully created slide: ${logicalSlide.title}`);
    } catch (slideError) {
      console.error(`❌ Error creating slide "${logicalSlide.title}":`, slideError);
      const fallbackSlide = pres.addSlide({ masterName: templateName });
      fallbackSlide.addText(logicalSlide.title, { x: MARGIN, y: 0.3, w: CONTENT_WIDTH, h: TITLE_HEIGHT, fontSize: 28, bold: true, color: '2a6099' });
      fallbackSlide.addText('Content could not be displayed properly.', { x: MARGIN, y: CONTENT_START_Y, w: CONTENT_WIDTH, h: 1, fontSize: 16, color: '666666' });
    }
  }
  console.log('🔄 Generating presentation buffer...');
  try {
    const bufferData = await pres.write({ outputType: 'base64' });
    const buffer = Buffer.from(bufferData as string, 'base64');
    console.log(`📦 Generated buffer: ${buffer.length} bytes`);
    return buffer;
  } catch (writeError) {
    console.error('❌ Error generating presentation buffer:', writeError);
    throw new Error('Failed to generate presentation file. Please try again.');
  }
}

// --- ENHANCED CONTENT EXTRACTION LOGIC ---

/**
 * **ENHANCED**
 * Extracts and structures content from an article for the dynamic layout engine.
 * This is the non-AI fallback logic.
 */
export function extractSlidesFromArticle(article: any): LogicalSlide[] {
  const logicalSlides: LogicalSlide[] = [];
  
  if (article.intro && article.intro.trim()) {
    const introText = article.intro.trim();
    logicalSlides.push({
      title: "Introduction & Context",
      blocks: [ { type: 'paragraph', text: introText } ],
      keywords: extractKeywordsFromText(introText)
    });
  }

  if (article.sections && Array.isArray(article.sections)) {
    article.sections.forEach((section: any, index: number) => {
      const blocks: ContentBlock[] = [];
      const sectionText = section.content?.trim() || '';
      
      if (sectionText.length > 50) {
        blocks.push({ type: 'paragraph', text: sectionText });
      }
      
      let bullets: ContentBlock[] = [];
      if (section.section_bullets && Array.isArray(section.section_bullets)) {
        bullets = section.section_bullets
          .map((bullet: any) => bullet.content?.trim())
          .filter((text: string | undefined): text is string => !!text && text.length > 15)
          .slice(0, 6)
          .map((text: string) => ({
            type: 'bullet' as const,
            text: enhanceBulletContent(text),
            level: 0
          }));
      }
      
      blocks.push(...bullets);
      
      const currentBulletCount = blocks.filter(b => b.type === 'bullet').length;
      if (currentBulletCount < 5 && sectionText) {
        const extractedBullets = extractBulletsFromText(sectionText, 6 - currentBulletCount);
        blocks.push(...extractedBullets);
      }
      
      if (blocks.length > 0) {
        const sectionTitle = cleanSectionTitle(section.heading || `Key Point ${index + 1}`);
        logicalSlides.push({
          title: sectionTitle,
          blocks: blocks,
          keywords: extractKeywordsFromText(sectionText || section.heading || '')
        });
      }
    });
  }
  
  return logicalSlides;
}

/**
 * **ENHANCED** 
 * Extract meaningful keywords from text content with a better term list and logic.
 */
function extractKeywordsFromText(text: string): string[] {
  if (!text) return [];
  
  // Expanded list of common current affairs and policy keywords for better matching.
  const importantTerms = [
    'India', 'Government', 'Policy', 'Act', 'Bill', 'Ordinance', 'Supreme Court', 'Parliament',
    'Minister', 'PM', 'President', 'State', 'Central', 'Constitutional', 'Amendment',
    'Economic', 'Social', 'Development', 'Growth', 'Reform', 'Security', 'Defence',
    'International', 'Global', 'Strategic', 'National', 'Regional', 'Geopolitical',
    'UPSC', 'Governance', 'Scheme', 'Mission', 'Commission', 'Judiciary', 'Framework'
  ];
  
  const textLower = text.toLowerCase();
  const keywords = new Set<string>();

  // Use a Set to store unique keywords found in the text
  importantTerms.forEach(term => {
    if (textLower.includes(term.toLowerCase())) {
        keywords.add(term);
    }
  });
    
  return Array.from(keywords).slice(0, 7); // Return up to 7 unique keywords
}

/**
 * **ENHANCED** 
 * Simplified and safer function to clean up bullet point text.
 */
function enhanceBulletContent(content: string): string {
  if (!content) return '';
  
  // Focus on basic cleanup: trim, capitalize, and ensure proper punctuation.
  // This is much more reliable than trying to replace specific words.
  let enhanced = content.trim();
    
  if (enhanced.length > 0) {
    enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
    if (!/[.!?]$/.test(enhanced)) {
      enhanced += '.';
    }
  }
  
  return enhanced;
}

/**
 * **ENHANCED** 
 * Extract bullet points from paragraph text using a more robust method.
 */
function extractBulletsFromText(text: string, maxBullets: number): ContentBlock[] {
  if (!text || maxBullets <= 0) return [];
  
  // Use a regex that correctly matches full sentences ending in punctuation.
  // This is far more reliable than using .split() on punctuation.
  const sentences = text
    .match(/[^.!?]+[.!?]+/g) 
    ?.map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200) // Filter for sentences of a reasonable length
    .slice(0, maxBullets) || [];
    
  // If we don't have enough sentences, try splitting by other delimiters
  if (sentences.length < maxBullets) {
    const additionalSentences = text
      .split(/[;,]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 150)
      .slice(0, maxBullets - sentences.length);
    sentences.push(...additionalSentences);
  }
    
  return sentences.map(sentence => ({
    type: 'bullet',
    text: enhanceBulletContent(sentence), // Use our safer enhancement function
    level: 0
  }));
}

/**
 * Clean and improve section titles (no changes needed).
 */
function cleanSectionTitle(title: string): string {
  if (!title) return 'Key Information';
  
  let cleaned = title
    .replace(/^What\s+(is|are)\s+/i, '')
    .replace(/^Why\s+/i, '')
    .replace(/^How\s+/i, '')
    .replace(/\s+\?+$/, '')
    .trim();
    
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  return cleaned;
}