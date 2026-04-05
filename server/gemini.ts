import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const AI_BASE_URL = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const AI_API_KEY = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
const DIRECT_API_KEY = process.env.GEMINI_API_KEY;

function getClient(): GoogleGenAI {
  if (AI_BASE_URL && AI_API_KEY) {
    return new GoogleGenAI({
      apiKey: AI_API_KEY,
      httpOptions: { apiVersion: "", baseUrl: AI_BASE_URL },
    });
  }
  if (DIRECT_API_KEY) {
    return new GoogleGenAI({ apiKey: DIRECT_API_KEY });
  }
  throw new Error("Gemini AI is not configured. Set GEMINI_API_KEY or use Replit AI Integrations.");
}

export interface MatchResult {
  match_percentage: number;
  reasoning: string;
}

/**
 * Uses Gemini Vision to compare a lost item description with a found item image.
 * Returns the match percentage (0-100) and reasoning.
 */
export async function matchItemWithImage(
  lostDescription: string,
  imageUrl: string
): Promise<MatchResult> {
  const ai = getClient();

  const imagePath = path.join(process.cwd(), imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const prompt = `You are a highly accurate Lost and Found matching system for a university laundry service.
Look at the attached image of a "Found" item.
Read this text description of a "Lost" item provided by a student: "${lostDescription}"

Compare them and return a JSON object with exactly two keys:
1. "match_percentage": A number between 0 and 100 representing how likely these are the same item. (e.g., 85)
2. "reasoning": A 1-2 sentence explanation mentioning matching or conflicting details like color, brand, type, or marks.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Image } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  try {
    return JSON.parse(text) as MatchResult;
  } catch {
    throw new Error(`Invalid JSON from Gemini: ${text}`);
  }
}
