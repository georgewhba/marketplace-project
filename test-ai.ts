import { GoogleGenAI } from '@google/genai';
import { env } from './server/env.js';

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: 'Hello' }] }
      ],
      config: {
        systemInstruction: "You are a helpful assistant",
        temperature: 0.7,
      }
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
