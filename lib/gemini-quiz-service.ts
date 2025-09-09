import { GoogleGenerativeAI } from "@google/generative-ai";
import { QuizQuestion } from "./quiz-generator";

// Get API key from environment variables
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined in environment variables");
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

export const generateQuizQuestionsFromArticle = async (
  articleContent: string, 
  numQuestions: number = 3
): Promise<QuizQuestion[]> => {
  const prompt = `
You are an expert educational quiz creator. Your task is to generate ${numQuestions} multiple-choice questions based on the following educational article.

For each question:
1. Create a clear, concise question related to important concepts in the article
2. Provide exactly 4 options (A, B, C, D)
3. Only ONE option should be correct
4. Include a brief explanation for why the correct answer is right

Follow this JSON structure strictly for your output:

An array of question objects. Each object must contain:
- "question": string with the question text
- "options": array of 4 strings representing the 4 possible answers
- "correctAnswerIndex": number (0-3) indicating which option is correct (0 = first option)
- "explanation": string explaining why the correct answer is right

Example JSON Output:
\`\`\`json
[
  {
    "question": "What is the main purpose of X?",
    "options": [
      "To perform function A",
      "To enable process B",
      "To prevent outcome C",
      "To analyze effect D"
    ],
    "correctAnswerIndex": 1,
    "explanation": "The article clearly states that X was designed primarily to enable process B, as explained in paragraph 3."
  },
  {
    "question": "According to the article, when was Y established?",
    "options": [
      "1967",
      "1975",
      "1982",
      "1991"
    ],
    "correctAnswerIndex": 3,
    "explanation": "The article mentions that Y was established in 1991 following the historical agreement discussed in the second section."
  }
]
\`\`\`

Article Content:
---
${articleContent}
---

Generate exactly ${numQuestions} educational quiz questions based on the provided article content. Ensure the output is a valid JSON array as specified.
The JSON output must be the only content in your response.
`;
  try {
    console.log(`Generating ${numQuestions} questions for article`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      console.error("Gemini API response text is empty or undefined");
      throw new Error("Received empty or no text from AI. Cannot parse quiz questions.");
    }
    
    let jsonStr = text.trim();
    console.log("Raw response from Gemini:", jsonStr.substring(0, 100) + "...");
    
    // Remove Markdown fences if present
    if (jsonStr.startsWith("```") && jsonStr.endsWith("```")) {
      jsonStr = jsonStr.substring(jsonStr.indexOf('\n') + 1, jsonStr.lastIndexOf('```')).trim();
    }

    // Attempt to parse the JSON
    const parsedData = JSON.parse(jsonStr);

    // Validate the parsed data structure
    if (Array.isArray(parsedData) && parsedData.every(item => 
        typeof item === 'object' && 
        item !== null &&
        'question' in item && typeof item.question === 'string' &&
        'options' in item && Array.isArray(item.options) && item.options.length === 4 &&
        'correctAnswerIndex' in item && typeof item.correctAnswerIndex === 'number' &&
        'explanation' in item && typeof item.explanation === 'string'
      )) {
      return parsedData as QuizQuestion[];
    } else {
      console.error("Parsed data is not in the expected QuizQuestion[] format:", parsedData);
      throw new Error(`Received data from AI is not in the expected quiz question format.`);
    }
  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    
    // Add more detailed error logging
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.message.includes("JSON.parse")) {
        console.error("JSON parsing error - response wasn't valid JSON");
        throw new Error(`Failed to parse AI's response as JSON. Please try again with different content.`);
      }
      
      // Handle potential API quota/limit errors
      if (error.message.includes("429") || error.message.includes("rate limit") || error.message.includes("Too Many Requests")) {
        // Extract retry delay if available
        let retryDelay = 60; // Default to 60 seconds
        if (error.message.includes("retryDelay")) {
          const retryMatch = error.message.match(/"retryDelay":"(\d+)s"/);
          if (retryMatch) {
            retryDelay = parseInt(retryMatch[1]);
          }
        }
        
        throw new Error(JSON.stringify({
          type: 'RATE_LIMITED',
          message: `AI service is temporarily rate limited. Please wait ${retryDelay} seconds before trying again.`,
          retryAfter: retryDelay,
          canRetry: true
        }));
      }
      
      // Handle quota exceeded errors
      if (error.message.includes("quota") || error.message.includes("billing")) {
        throw new Error(JSON.stringify({
          type: 'QUOTA_EXCEEDED',
          message: 'AI service quota has been exceeded. Please try again later or contact support.',
          retryAfter: 3600, // 1 hour
          canRetry: true
        }));
      }
    }
    
    throw new Error(`Failed to generate quiz questions: ${error instanceof Error ? error.message : String(error)}`);
  }
};
