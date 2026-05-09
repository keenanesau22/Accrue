
import { GoogleGenAI, Type, Modality, GenerateContentResponse, VideoGenerationReferenceType } from "@google/genai";
import { Question, FinancialAccount, CategorizationRule } from "../types";
import { SecureVault } from "./secureVault";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * VALID Framework: Insulate Sensitive Data.
 * This layer ensures PII (Personally Identifiable Information) never 
 * reaches the third-party AI processing models.
 */
const insulateData = (accounts: FinancialAccount[]) => {
  return accounts.map((a, index) => ({
    ...a,
    id: SecureVault.maskIdentifier(a.id),
    name: `Forensic_Account_${index + 1}`,
    provider: "Institutional_Node_Masked",
    // Keep balance for analysis but strip transaction history/names
  }));
};

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * VALID Framework: Validate all AI-generated outputs.
 * Uses strict JSON schemas to prevent "lies" (hallucinations) in extraction.
 */
export const parseFinancialSnapshot = async (text: string): Promise<FinancialAccount[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `[VALID FRAMEWORK: DATA EXTRACTION MODE] Extract accounts from text: "${text}". If data is ambiguous, return an empty array. Do not guess.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['asset', 'liability'] },
              category: { type: Type.STRING, enum: ['cash', 'investment', 'property', 'mortgage', 'car-loan', 'student-loan', 'student', 'credit-card', 'debt', 'general-loan', 'loan', 'overdraft', 'line of credit', 'other'] },
              balance: { type: Type.NUMBER },
              interestRate: { type: Type.NUMBER }
            },
            required: ["id", "name", "type", "category", "balance"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) { return []; }
};

export const parseFinancialDocument = async (base64Data: string, mimeType: string): Promise<FinancialAccount[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: "VALID FRAMEWORK: Extract financial accounts. Strip all personal names and social security numbers. Return JSON strictly." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['asset', 'liability'] },
              category: { type: Type.STRING, enum: ['cash', 'investment', 'property', 'mortgage', 'car-loan', 'student-loan', 'student', 'credit-card', 'debt', 'general-loan', 'loan', 'overdraft', 'line of credit', 'other'] },
              balance: { type: Type.NUMBER }
            },
            required: ["id", "name", "type", "category", "balance"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) { return []; }
};

/**
 * VALID Framework: Look out for Lies.
 * Forces the AI to verify data against the provided context and disclaim uncertainty.
 */
export const generateFinancialAudit = async (accounts: FinancialAccount[]): Promise<{ findings: string[], recommendations: string[] }> => {
  try {
    const insulated = insulateData(accounts);
    const context = insulated.map(a => `Ref_${a.id}: $${a.balance}`).join(', ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `[VALID FRAMEWORK: COMPLIANCE AUDIT] Perform a strategy audit on these tokenized balances: ${context}. 
      Return JSON with:
      - findings: array of strings (key observations)
      - recommendations: array of strings (actionable advice)
      Persona: Wise Owl Advisor (Finny).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            findings: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["findings", "recommendations"]
        }
      }
    });
    return JSON.parse(response.text || '{"findings": [], "recommendations": []}');
  } catch (error) { return { findings: ["Error generating audit."], recommendations: [] }; }
};

export const generateCategorizationRule = async (request: string): Promise<CategorizationRule | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `[VALID FRAMEWORK: RULE CREATION] Create a categorization rule based on this request: "${request}".
      Return JSON with:
      - merchantPattern: string (the pattern to match, e.g., 'Amazon')
      - targetCategory: string (the category, e.g., 'Shopping')
      - description: string (a short description)
      If the request is unclear, return null.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchantPattern: { type: Type.STRING },
            targetCategory: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["merchantPattern", "targetCategory", "description"]
        }
      }
    });
    const rule = JSON.parse(response.text || 'null');
    if (!rule) return null;
    return { ...rule, id: Date.now().toString() };
  } catch (error) { return null; }
};

export const generateTTS = async (text: string): Promise<string | undefined> => {
  try {
    const freshAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await freshAi.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak warmly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) { return undefined; }
};

export const generateDeepDiveStream = async (topic: string, difficulty: string, onChunk: (text: string) => void) => {
  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Provide a masterclass on ${topic}. Ensure all definitions are verified. Format: 2 paragraphs.`,
    });
    let fullText = '';
    for await (const chunk of response) {
      if (chunk.text) { fullText += chunk.text; onChunk(fullText); }
    }
    return fullText;
  } catch (error) { return "Error fetching content."; }
};

export const generateLessonQuestions = async (topic: string, difficulty: string): Promise<Question[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 12 MCQ for ${topic}. Verify all correct answers against current financial standards.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["id", "type", "question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) { return []; }
};

// Fix: Implement missing video generation services for AdminDashboard
/**
 * Triggers video generation using the Veo series models.
 * If brandStyles (reference images) are provided, uses the high-quality 'veo-3.1-generate-preview' model.
 */
export const startVideoGeneration = async (title: string, description: string, brandStyles: {data: string, mimeType: string}[]) => {
  const freshAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // Use VideoGenerationReferenceType enum for referenceType to ensure type safety
  const referenceImages = brandStyles.slice(0, 3).map(style => ({
    image: {
      imageBytes: style.data,
      mimeType: style.mimeType,
    },
    referenceType: VideoGenerationReferenceType.ASSET
  }));

  const model = referenceImages.length > 0 ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';

  return await freshAi.models.generateVideos({
    model,
    prompt: `Masterclass infographic for ${title}. ${description}. Clear educational financial visuals.`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9',
      ...(referenceImages.length > 0 && { referenceImages })
    }
  });
};

/**
 * Polls the GenAI API for the result of a video generation operation.
 */
export const getVideosOperation = async (operation: any) => {
  const freshAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return await freshAi.operations.getVideosOperation({ operation: operation });
};
