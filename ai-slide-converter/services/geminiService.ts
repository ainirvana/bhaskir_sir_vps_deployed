
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Slide } from '../types';

// Ensure API_KEY is available in the environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY is not defined in environment variables. Please set process.env.API_KEY.");
}

const ai = new GoogleGenAI({ apiKey });
const model = 'gemini-2.0-flash-exp';

export const generateSlidesFromContext = async (context: string): Promise<Slide[]> => {
  let geminiAPIResponse: GenerateContentResponse | undefined = undefined;

  const prompt = `
You are an expert presentation creator. Your task is to transform the following text context into a series of structured presentation slides.
Each slide must have a 'title' (a concise string) and 'content' (an array of strings, where each string is a key bullet point or a short descriptive paragraph).

Follow this JSON structure strictly for your output:
An array of slide objects. Each object must contain a "title" key with a string value, and a "content" key with an array of strings as its value.

Example JSON Output:
\`\`\`json
[
  {
    "title": "Slide Title 1",
    "content": [
      "Key point 1 about topic.",
      "Another important detail or explanation.",
      "Concluding remark for this slide."
    ]
  },
  {
    "title": "Slide Title 2: Deeper Dive",
    "content": [
      "Elaboration on a specific aspect.",
      "Supporting fact or example.",
      "Brief summary of this sub-topic."
    ]
  }
]
\`\`\`

Context to transform:
---
${context}
---

Generate the slides based on the provided context. Ensure the output is a valid JSON array as specified.
If the context is too short or unsuitable for slide generation, return an empty array [].
Do not include any explanatory text before or after the JSON array itself.
The JSON output must be the only content in your response.
`;

  try {
    geminiAPIResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5, // Slightly creative but still factual
      }
    });

    if (!geminiAPIResponse?.text) {
        console.error("Gemini API response text is empty or undefined:", geminiAPIResponse);
        throw new Error("Received empty or no text from AI. Cannot parse slides.");
    }
    
    let jsonStr = geminiAPIResponse.text.trim();
    
    // Remove Markdown fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    // Attempt to parse the JSON
    const parsedData = JSON.parse(jsonStr);

    // Validate the parsed data structure
    if (Array.isArray(parsedData) && parsedData.every(item => 
        typeof item === 'object' && 
        item !== null &&
        'title' in item && typeof item.title === 'string' &&
        'content' in item && Array.isArray(item.content) && item.content.every((cItem: any) => typeof cItem === 'string')
      )) {
      return parsedData as Slide[];
    } else {
      console.error("Parsed data is not in the expected Slide[] format:", parsedData);
      throw new Error(`Received data from AI is not in the expected slide format. The AI might have returned an unexpected structure. Raw text: ${geminiAPIResponse.text}`);
    }

  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    if (error instanceof Error && error.message.includes("JSON.parse")) {
        throw new Error(`Failed to parse AI's response as JSON. Response text: ${geminiAPIResponse?.text ?? 'N/A (response or text was not available)'}`);
    }
    throw new Error(`Failed to generate slides: ${error instanceof Error ? error.message : String(error)}`);
  }
};
