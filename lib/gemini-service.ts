// lib/gemini-service.ts

import { GoogleGenerativeAI, GenerateContentResult } from "@google/generative-ai";
// Import the data structures for perfect alignment
import { LogicalSlide, ContentBlock } from "./ppt-templates";
import { logGeminiApiUsage } from "./gemini-tracking";

// Get API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Using the more powerful model for high-quality, descriptive content
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro-latest",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

/**
 * **ENHANCED for Detailed Content**
 * Uses AI to transform raw article text into an array of structured LogicalSlide objects.
 * The prompt is specifically designed to elicit detailed, descriptive, and meaningful bullet points.
 * @param articleContent The raw text of the article.
 * @param articleTitle Optional title for context (used for better slide generation)
 * @returns A promise that resolves to an array of LogicalSlide objects.
 */
export const generateSlidesFromArticle = async (articleContent: string, articleTitle?: string): Promise<LogicalSlide[]> => {
  const fallbackSlides: LogicalSlide[] = [
    {
      title: articleTitle || "Key Information",
      blocks: [
        {
          type: "bullet",
          text: "Critical policy developments and their implications."
        },
        {
          type: "bullet",
          text: "Impact on governance and administrative frameworks."
        }
      ],
      keywords: ["Policy", "Governance", "Important"]
    }
  ];

  // --- ENHANCEMENT 3: PROMPT OPTIMIZED FOR DESCRIPTIVE CONTENT ---
  const prompt = `
You are a top-tier analyst and presentation creator for UPSC and State Service exam aspirants. Your task is to transform a news article into a set of insightful, analytical, and examination-focused PowerPoint slides.

CRITICAL REQUIREMENTS:
- Each bullet point must be descriptive and meaningful, explaining the context or significance of the information, not just stating a fact.
- Each slide must contain 2-4 detailed, distinct, and substantial bullet points.
- Focus on the 'Why' and 'How': implications, challenges, and significance for India.
- Use clear, professional language. Avoid starting points with "The article states..."

ANALYTICAL DIMENSIONS:
Ensure the content across the slides analyzes the topic from multiple perspectives, such as:
1.  **Constitutional/Legal:** Key legal provisions, Supreme Court judgments, Acts, and amendments.
2.  **Governance/Administrative:** Impact on administration, policy implementation, and reforms.
3.  **Socio-Economic:** Effects on Indian society, economy, growth, and development.
4.  **Geopolitical/Strategic:** Importance for India's international relations and national security.

JSON OUTPUT FORMAT (Respond ONLY with this JSON array):
[
  {
    "title": "Concise & Specific Slide Title (Max 12 words)",
    "blocks": [
      {
        "type": "bullet",
        "text": "A detailed, descriptive point that provides context and meaning. (Aim for 30-40 words)"
      }
    ],
    "keywords": ["Keyword1", "RelevantTerm", "PolicyName"]
  }
]

---
DETAILED EXAMPLE:
---
Article Snippet: "The government has launched the 'PM-SURAJ' portal, a national portal for credit support to disadvantaged sections, aimed at empowering marginalized communities. It is a one-stop point where people from disadvantaged sections can apply for and monitor the progress of their loan applications. The scheme is implemented by the Ministry of Social Justice and Empowerment."

Ideal JSON Output for a slide (Note the descriptive and meaningful points):
[
  {
    "title": "PM-SURAJ Portal: Empowering Marginalized Sections",
    "blocks": [
      { "type": "bullet", "text": "Establishes a centralized national portal for credit support, which simplifies the application and tracking process for individuals from disadvantaged sections." },
      { "type": "bullet", "text": "Focuses on direct financial empowerment by removing intermediaries, aiming to achieve tangible social upliftment for vulnerable populations." },
      { "type": "bullet", "text": "Implementation by the Ministry of Social Justice ensures that scheme benefits are precisely targeted towards intended beneficiaries, enhancing accountability." },
      { "type": "bullet", "text": "Signifies a major policy shift towards using digital infrastructure for transparent and accountable delivery of welfare services, thereby reducing leakages." }
    ],
    "keywords": ["PM-SURAJ", "Social Justice", "Credit Support", "Welfare", "Digital Governance"]
  }
]
---

Now, generate 3-5 slides for the following article.

${articleTitle ? `Topic: ${articleTitle}\n` : ''}
Article Content:
---
${articleContent}
---

RESPOND WITH ONLY THE JSON ARRAY:`;

  try {
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    
    // Extract token usage from the result
    const response = result.response;
    let jsonText = response.text();
    
    // Log the API usage
    await logApiUsage(result, "generateSlidesFromArticle", durationMs, "success");

    if (!jsonText) {
      console.error("Gemini API response text is empty.");
      throw new Error("Received empty response from AI.");
    }

    console.log(`🤖 Raw AI response for detailed content: ${jsonText.length} characters`);
    
    // Clean up and parse the response (no changes needed in this logic)
    jsonText = jsonText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    const startIndex = jsonText.indexOf('[');
    const lastIndex = jsonText.lastIndexOf(']');
    if (startIndex === -1 || lastIndex === -1 || startIndex >= lastIndex) {
      console.error("❌ No valid JSON array found in detailed response");
      throw new Error("AI response does not contain a valid JSON array");
    }
    jsonText = jsonText.substring(startIndex, lastIndex + 1);
    const parsedData = JSON.parse(jsonText);

    // --- Rigorous validation of the AI's output ---
    if (!Array.isArray(parsedData)) {
      throw new Error("AI output is not a JSON array.");
    }
    for (const item of parsedData) {
      if (typeof item !== 'object' || item === null || typeof item.title !== 'string' || !Array.isArray(item.blocks) || !Array.isArray(item.keywords)) {
        throw new Error("A slide object has a missing or invalid key: 'title', 'blocks', or 'keywords'.");
      }
      for (const block of item.blocks) {
        if (typeof block.type !== 'string' || (block.type !== 'paragraph' && block.type !== 'bullet') || typeof block.text !== 'string') {
          throw new Error("A content block is malformed. It must have a valid 'type' and 'text'.");
        }
      }
    }

    return parsedData as LogicalSlide[];

  } catch (error) {
    console.error("❌ Error calling Gemini API or parsing detailed response:", error);
    if (error instanceof SyntaxError) {
      console.error("🔍 JSON parsing failed. Using fallback slides.");
    }
    console.warn("⚠️ AI detailed slide generation failed, using fallback content for this article.");
    console.error("Original error:", error instanceof Error ? error.message : String(error));
    
    // Log the error
    await logApiUsage(null, "generateSlidesFromArticle", 0, "error", error);
    
    return fallbackSlides;
  }
};

/**
 * Helper function to log Gemini API usage
 * @param result The result from the Gemini API call
 * @param endpoint The endpoint or function name that made the API call
 * @param durationMs The duration of the API call in milliseconds
 * @param status The status of the API call (success or error)
 * @param error Optional error object if the API call failed
 */
async function logApiUsage(
  result: GenerateContentResult | null,
  endpoint: string,
  durationMs: number,
  status: 'success' | 'error',
  error?: any
) {
  try {
    // Extract token counts from the result
    let inputTokens = 0;
    let outputTokens = 0;
    
    if (result && result.response && result.response.promptFeedback) {
      // For input tokens, we can use the prompt token count if available
      inputTokens = result.response.promptFeedback.tokenCount || 0;
    }
    
    // For output tokens, we can estimate based on the response text
    // A rough estimate is 1 token per 4 characters
    if (result && result.response) {
      const responseText = result.response.text();
      outputTokens = Math.ceil(responseText.length / 4);
    }
    
    await logGeminiApiUsage({
      endpoint,
      requestType: 'generateContent',
      inputTokens,
      outputTokens,
      modelName: 'gemini-1.5-pro-latest',
      durationMs,
      status,
      errorMessage: error ? (error instanceof Error ? error.message : String(error)) : undefined,
      requestData: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (loggingError) {
    // Don't let logging errors affect the main application flow
    console.error('Error logging Gemini API usage:', loggingError);
  }
}