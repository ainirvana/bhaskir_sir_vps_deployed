// // app/api/generate-ppt/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// // FIXED: Import SupabaseClient type from the official package
// import { SupabaseClient } from '@supabase/supabase-js';
// import { createServerClient } from '@/lib/supabase';

// // Import our NEW, ENHANCED generator and its corresponding types
// import { 
//   generatePresentation,
//   extractSlidesFromArticle // This now returns LogicalSlide[]
// } from '@/lib/server/ppt-generator-enhanced'; 
// import { PPTGenerationOptions, LogicalSlide, PPT_TEMPLATES } from '@/lib/ppt-templates';

// // Import our NEW, ENHANCED AI service
// import { generateSlidesFromArticle as generateSlidesFromArticleAI } from '@/lib/gemini-service';

// // --- HELPER TYPES for Supabase data ---
// interface Bullet {
//   content: string;
// }

// interface Section {
//   heading: string | null;
//   content: string | null;
//   section_bullets: Bullet[] | null;
// }

// // --- HELPER FUNCTIONS to keep the main route clean ---

// /**
//  * Fetches the full, combined text content of an article for AI processing.
//  * @param articleId The ID of the article to fetch.
//  * @param supabase The Supabase client instance.
//  * @returns A single string containing all article content.
//  */
// async function getArticleContentForAI(articleId: string, supabase: SupabaseClient): Promise<string> {
//   const { data: article, error } = await supabase
//     .from('gk_today_content')
//     .select(`
//       title,
//       intro,
//       sections (
//         heading,
//         content,
//         section_bullets ( content )
//       )
//     `)
//     .eq('id', articleId)
//     .single();

//   if (error || !article) {
//     console.error(`Error fetching article ${articleId} for AI:`, error);
//     return '';
//   }

//   let fullContent = `Title: ${article.title}\n\n`;
//   if (article.intro) {
//     fullContent += `Introduction: ${article.intro}\n\n`;
//   }

//   if (article.sections && Array.isArray(article.sections)) {
//     // FIXED: Added explicit types for 'section' and 'bullet'
//     article.sections.forEach((section: Section) => {
//       fullContent += `Section: ${section.heading || 'Content'}\n`;
//       if (section.content) {
//         fullContent += `${section.content}\n`;
//       }
//       if (section.section_bullets && Array.isArray(section.section_bullets)) {
//         section.section_bullets.forEach((bullet: Bullet) => {
//           fullContent += `- ${bullet.content}\n`;
//         });
//       }
//       fullContent += '\n';
//     });
//   }

//   return fullContent;
// }

// /**
//  * Fetches an article with its sections and bullets in a structured format
//  * for our manual (but enhanced) extraction function.
//  * @param articleId The ID of the article to fetch.
//  * @param supabase The Supabase client instance.
//  * @returns A structured article object.
//  */
// async function getStructuredArticle(articleId: string, supabase: SupabaseClient): Promise<any | null> {
//     const { data: article, error } = await supabase
//     .from('gk_today_content')
//     .select(`
//       id,
//       title,
//       intro,
//       sections (
//         heading,
//         content,
//         section_bullets ( content )
//       )
//     `)
//     .eq('id', articleId)
//     .single();

//   if (error) {
//     console.error(`Error fetching structured article ${articleId}:`, error);
//     return null;
//   }
//   return article;
// }


// // --- MAIN API ROUTE ---

// export async function POST(req: NextRequest) {
//   try {
//     const data = await req.json();
//     console.log('🎯 PPT API received data:', data);
    
//     // Renamed template to templateId for clarity
//     const { title, subtitle, templateId, articleIds, useAiForArticleIds = [] } = data;

//     // --- Validation ---
//     if (!title || !templateId || !articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
//       console.error('❌ Missing required parameters:', { title, templateId, articleIds });
//       return NextResponse.json({ error: 'Missing required parameters: title, templateId, and articleIds' }, { status: 400 });
//     }
//     const selectedTemplate = PPT_TEMPLATES.find(t => t.id === templateId);
//     if (!selectedTemplate) {
//       console.error('❌ Invalid template:', templateId);
//       return NextResponse.json({ error: 'Invalid template selected' }, { status: 400 });
//     }

//     console.log('✅ Validation passed, template found:', selectedTemplate.name);

//     const supabase = createServerClient();
//     const allLogicalSlides: LogicalSlide[] = [];

//     // --- Content Processing Loop ---
//     // This loop now correctly orchestrates our new services with article separation.
//     for (let i = 0; i < articleIds.length; i++) {
//       const id = articleIds[i];
//       let slidesForArticle: LogicalSlide[] = [];
//       let articleTitle = '';

//       if (useAiForArticleIds.includes(id)) {
//         // AI Path: Get raw content -> Generate LogicalSlides with AI
//         console.log(`Using AI to process article: ${id}`);
//         const articleContent = await getArticleContentForAI(id, supabase);
//         if (articleContent) {
//           // Extract title from content for the separator slide
//           const titleMatch = articleContent.match(/Title:\s*(.+)/);
//           articleTitle = titleMatch ? titleMatch[1].trim() : `Article ${i + 1}`;
//           slidesForArticle = await generateSlidesFromArticleAI(articleContent, articleTitle);
//         }
//       } else {
//         // Manual Path: Get structured content -> Extract LogicalSlides
//         console.log(`Using manual extraction for article: ${id}`);
//         const structuredArticle = await getStructuredArticle(id, supabase);
//         if (structuredArticle) {
//           articleTitle = structuredArticle.title || `Article ${i + 1}`;
//           slidesForArticle = extractSlidesFromArticle(structuredArticle);
//         }
//       }
      
//       // Add article separator slide (except for the first article)
//       if (slidesForArticle.length > 0) {
//         if (i > 0) {
//           // Add a visual separator slide between articles
//           const separatorSlide: LogicalSlide = {
//             title: "📚 Next Topic",
//             blocks: [
//               {
//                 type: "bullet",
//                 text: "Exploring another critical aspect of current affairs"
//               },
//               {
//                 type: "bullet",
//                 text: "Building comprehensive understanding of policy landscape"
//               }
//             ],
//             keywords: ["Transition", "Policy", "Current Affairs"]
//           };
//           allLogicalSlides.push(separatorSlide);
//         }
        
//         // Add article title slide with better formatting
//         const articleTitleSlide: LogicalSlide = {
//           title: articleTitle,
//           blocks: [
//             {
//               type: "bullet",
//               text: "Important policy developments and their implications"
//             },
//             {
//               type: "bullet", 
//               text: "Current affairs analysis for competitive examinations"
//             },
//             {
//               type: "bullet",
//               text: "Key facts and figures for comprehensive understanding"
//             },
//             {
//               type: "bullet",
//               text: "Significance for India's governance and society"
//             }
//           ],
//           keywords: ["Policy", "Current Affairs", "Analysis", "India", "Governance"]
//         };
//         allLogicalSlides.push(articleTitleSlide);
        
//         // Add the actual content slides
//         allLogicalSlides.push(...slidesForArticle);
        
//         console.log(`📄 Added ${slidesForArticle.length + 1} slides for article: ${articleTitle}`);
//       }
//     }

//     // Add a summary slide if there are multiple articles
//     if (articleIds.length > 1) {
//       const summarySlide: LogicalSlide = {
//         title: "📋 Summary & Key Takeaways",
//         blocks: [
//           {
//             type: "bullet",
//             text: "Critical policy updates and their nationwide impact"
//           },
//           {
//             type: "bullet",
//             text: "Strategic importance for India's development agenda"
//           },
//           {
//             type: "bullet",
//             text: "Examination relevance for UPSC and state services"
//           },
//           {
//             type: "bullet",
//             text: "Long-term implications for governance and society"
//           },
//           {
//             type: "bullet",
//             text: "Interconnections with other policy frameworks"
//           }
//         ],
//         keywords: ["Policy Impact", "UPSC", "Governance", "Strategic", "Development"]
//       };
//       allLogicalSlides.push(summarySlide);
//       console.log(`📋 Added summary slide for ${articleIds.length} articles`);
//     }

//     if (allLogicalSlides.length === 0) {
//       console.error('❌ No slides generated from articles');
//       return NextResponse.json({ error: 'Could not generate any slide content from the selected articles.' }, { status: 404 });
//     }

//     console.log(`📊 Generated ${allLogicalSlides.length} logical slides`);

//     // --- Presentation Generation ---
//     // Pass the perfectly structured data to our new generator.
//     const options: PPTGenerationOptions = {
//       title,
//       subtitle,
//       template: selectedTemplate,
//       slides: allLogicalSlides, // The format is now correct!
//     };

//     console.log('🎨 Starting presentation generation...');
//     const buffer = await generatePresentation(options);
//     console.log(`📦 Generated presentation buffer: ${buffer.length} bytes`);

//     // --- Response ---
//     const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_presentation.pptx`;
//     console.log(`📤 Sending presentation as: ${filename}`);
    
//     return new NextResponse(buffer, {
//       headers: {
//         'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
//         'Content-Disposition': `attachment; filename="${filename}"`,
//       },
//     });

//   } catch (error: any) {
//     console.error('Fatal error in generate-ppt route:', error);
//     return NextResponse.json(
//       { error: 'Failed to generate presentation.', details: error.message },
//       { status: 500 }
//     );
//   }
// }

// // GET endpoint to fetch available templates (no changes needed)
// export async function GET() {
//   return NextResponse.json({ templates: PPT_TEMPLATES });
// }







// app/api/generate-ppt/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase';

// Import our enhanced generator and its corresponding types
import { 
  generatePresentation,
  extractSlidesFromArticle
} from '@/lib/server/ppt-generator-enhanced'; 
import { PPTGenerationOptions, LogicalSlide, PPT_TEMPLATES } from '@/lib/ppt-templates';

// Import our enhanced AI service
import { generateSlidesFromArticle as generateSlidesFromArticleAI } from '@/lib/gemini-service';

// --- HELPER TYPES for Supabase data ---
interface Bullet {
  content: string;
}

interface Section {
  heading: string | null;
  content: string | null;
  section_bullets: Bullet[] | null;
}

// --- HELPER FUNCTIONS (No changes needed here) ---

async function getArticleContentForAI(articleId: string, supabase: SupabaseClient): Promise<string> {
  const { data: article, error } = await supabase
    .from('gk_today_content')
    .select(`
      title,
      intro,
      sections (
        heading,
        content,
        section_bullets ( content )
      )
    `)
    .eq('id', articleId)
    .single();

  if (error || !article) {
    console.error(`Error fetching article ${articleId} for AI:`, error);
    return '';
  }

  let fullContent = `Title: ${article.title}\n\n`;
  if (article.intro) {
    fullContent += `Introduction: ${article.intro}\n\n`;
  }

  if (article.sections && Array.isArray(article.sections)) {
    article.sections.forEach((section: Section) => {
      fullContent += `Section: ${section.heading || 'Content'}\n`;
      if (section.content) {
        fullContent += `${section.content}\n`;
      }
      if (section.section_bullets && Array.isArray(section.section_bullets)) {
        section.section_bullets.forEach((bullet: Bullet) => {
          fullContent += `- ${bullet.content}\n`;
        });
      }
      fullContent += '\n';
    });
  }

  return fullContent;
}

async function getStructuredArticle(articleId: string, supabase: SupabaseClient): Promise<any | null> {
    const { data: article, error } = await supabase
    .from('gk_today_content')
    .select(`
      id,
      title,
      intro,
      sections (
        heading,
        content,
        section_bullets ( content )
      )
    `)
    .eq('id', articleId)
    .single();

  if (error) {
    console.error(`Error fetching structured article ${articleId}:`, error);
    return null;
  }
  return article;
}


// --- MAIN API ROUTE ---

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('🎯 PPT API received data:', data);
    
    const { title, subtitle, templateId, articleIds, useAiForArticleIds = [], quizLink = null } = data;

    // --- Validation ---
    if (!title || !templateId || !articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      console.error('❌ Missing required parameters:', { title, templateId, articleIds });
      return NextResponse.json({ error: 'Missing required parameters: title, templateId, and articleIds' }, { status: 400 });
    }
    const selectedTemplate = PPT_TEMPLATES.find(t => t.id === templateId);
    if (!selectedTemplate) {
      console.error('❌ Invalid template:', templateId);
      return NextResponse.json({ error: 'Invalid template selected' }, { status: 400 });
    }

    console.log('✅ Validation passed, template found:', selectedTemplate.name);

    const supabase = createServerClient();
    const allLogicalSlides: LogicalSlide[] = [];

    // --- Content Processing Loop ---
    for (let i = 0; i < articleIds.length; i++) {
      const id = articleIds[i];
      let slidesForArticle: LogicalSlide[] = [];
      let articleTitle = '';

      if (useAiForArticleIds.includes(id)) {
        // AI Path: Get raw content -> Generate LogicalSlides with AI
        console.log(`🤖 Using AI to process article: ${id}`);
        const articleContent = await getArticleContentForAI(id, supabase);
        if (articleContent) {
          const titleMatch = articleContent.match(/Title:\s*(.+)/);
          articleTitle = titleMatch ? titleMatch[1].trim() : `Article ${i + 1}`;
          slidesForArticle = await generateSlidesFromArticleAI(articleContent, articleTitle);
        }
      } else {
        // Manual Path: Get structured content -> Extract LogicalSlides
        console.log(`📝 Using manual extraction for article: ${id}`);
        const structuredArticle = await getStructuredArticle(id, supabase);
        if (structuredArticle) {
          articleTitle = structuredArticle.title || `Article ${i + 1}`;
          slidesForArticle = extractSlidesFromArticle(structuredArticle);
        }
      }
      
      if (slidesForArticle.length > 0) {
        // Add a visual separator slide between articles (but not before the first one).
        if (i > 0) {
          const separatorSlide: LogicalSlide = {
            title: "📚 Next Topic",
            blocks: [
              {
                type: "bullet",
                text: "Exploring another critical aspect of current affairs."
              },
              {
                type: "bullet",
                text: "Building comprehensive understanding of the policy landscape."
              }
            ],
            keywords: ["Transition", "Policy", "Current Affairs"]
          };
          allLogicalSlides.push(separatorSlide);
        }
        
        // --- ENHANCEMENT: REMOVED GENERIC ARTICLE TITLE SLIDE ---
        // The AI is now responsible for creating a proper introductory slide.
        // We no longer inject a low-quality, hardcoded title slide.
        
        // Add the actual, high-quality content slides from the AI or manual extraction
        allLogicalSlides.push(...slidesForArticle);
        
        // --- ENHANCEMENT: Updated log to be accurate ---
        console.log(`📄 Added ${slidesForArticle.length} high-quality slides for article: ${articleTitle}`);
      }
    }

    // Add QR code slide if quiz link is provided
    if (quizLink) {
      const qrCodeSlide: LogicalSlide = {
        title: "📱 Take the Quiz!",
        blocks: [
          {
            type: "bullet",
            text: "Scan the QR code below to access the interactive quiz"
          },
          {
            type: "bullet",
            text: "Test your understanding of the topics covered"
          },
          {
            type: "bullet",
            text: "Get instant feedback on your answers"
          },
          {
            type: "qr_code",
            text: quizLink
          },
          {
            type: "bullet",
            text: `Quiz Link: ${quizLink}`
          }
        ],
        keywords: ["Quiz", "Interactive", "Assessment", "QR Code"]
      };
      allLogicalSlides.push(qrCodeSlide);
      console.log(`📱 Added QR code slide for quiz: ${quizLink}`);
    }

    if (allLogicalSlides.length === 0) {
      console.error('❌ No slides generated from articles');
      return NextResponse.json({ error: 'Could not generate any slide content from the selected articles.' }, { status: 404 });
    }

    console.log(`📊 Generated a total of ${allLogicalSlides.length} logical slides`);

    // --- Presentation Generation ---
    const options: PPTGenerationOptions = {
      title,
      subtitle,
      template: selectedTemplate,
      slides: allLogicalSlides,
    };

    console.log('🎨 Starting presentation generation...');
    const buffer = await generatePresentation(options);
    console.log(`📦 Generated presentation buffer: ${buffer.length} bytes`);

    // --- Response ---
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_presentation.pptx`;
    console.log(`📤 Sending presentation as: ${filename}`);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Fatal error in generate-ppt route:', error);
    return NextResponse.json(
      { error: 'Failed to generate presentation.', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch available templates (no changes needed)
export async function GET() {
  return NextResponse.json({ templates: PPT_TEMPLATES });
}