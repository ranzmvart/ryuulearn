import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, ExamQuestion } from "../types.ts";

// gemini-flash-lite-latest adalah model dengan RPM (Requests Per Minute) tertinggi di paket gratis.
const MODEL_UNLIMITED = 'gemini-flash-lite-latest';
const MODEL_SMART = 'gemini-3-flash-preview'; 

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Logika Retry Eksponensial: 
 * Membuat aplikasi seolah 'unlimited' dengan mencoba kembali secara otomatis 
 * saat kuota habis sementara.
 */
const withRetry = async <T>(fn: () => Promise<T>, retries = 5, delay = 1500): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.message?.includes("429") || 
                         error?.message?.includes("quota") || 
                         error?.message?.includes("RESOURCE_EXHAUSTED");
    
    if (isQuotaError && retries > 0) {
      console.warn(`Kuota API penuh, mengoptimalkan akses gratis... Sisa percobaan: ${retries}`);
      await sleep(delay);
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const getCacheKey = (data: string, prefix: string) => {
  let hash = 0;
  for (let i = 0; i < Math.min(data.length, 500); i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return `ryuu_v3_cache_${prefix}_${hash}`;
};

const LATEX_INSTRUCTION = `
PERINTAH FORMATTING (PENTING):
1. Gunakan LaTeX untuk SEMUA ekspresi teknis (Matematika, Kimia, Fisika).
   - Inline: $rumus$.
   - Blok: $$rumus$$.
2. Bahasa Indonesia Formal.
3. Gunakan Markdown Bold (**teks**) untuk istilah penting agar mudah dibaca.
`;

const getContents = (base64Data: string, mimeType: string, promptText: string) => {
  const parts: any[] = [];
  if (mimeType === 'text/plain') {
    const textData = decodeURIComponent(escape(atob(base64Data)));
    parts.push({ text: `DOKUMEN SUMBER:\n${textData}` });
  } else {
    parts.push({ inlineData: { mimeType, data: base64Data } });
  }
  parts.push({ text: `${LATEX_INSTRUCTION}\n\nKONTEKS TUGAS: ${promptText}` });
  return { parts };
};

export const generateExplanation = async (base64Data: string, mimeType: string, type: 'SUMMARY' | 'DEEP'): Promise<string> => {
  const cacheKey = getCacheKey(base64Data, `explain_${type}`);
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  return withRetry(async () => {
    const ai = getAI();
    const promptText = type === 'SUMMARY' 
      ? "Buat ringkasan eksekutif padat dalam poin-poin yang mudah dihafal."
      : "Berikan analisis mendalam materi ini. Jelaskan langkah demi langkah dengan analogi dunia nyata.";

    const response = await ai.models.generateContent({
      model: MODEL_UNLIMITED,
      contents: getContents(base64Data, mimeType, promptText)
    });
    const result = response.text || "Gagal merespon.";
    localStorage.setItem(cacheKey, result);
    return result;
  });
};

export const generateFlashcards = async (base64Data: string, mimeType: string, count: number = 6): Promise<Flashcard[]> => {
  const cacheKey = getCacheKey(base64Data, `flashcards_${count}`);
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  return withRetry(async () => {
    const ai = getAI();
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING }
        },
        required: ["question", "options", "correctIndex", "explanation"]
      }
    };

    const response = await ai.models.generateContent({
      model: MODEL_UNLIMITED,
      contents: getContents(base64Data, mimeType, `Buat ${count} soal kuis interaktif (pilihan ganda) berdasarkan materi ini.`),
      config: { responseMimeType: "application/json", responseSchema: schema }
    });
    const result = response.text || '[]';
    localStorage.setItem(cacheKey, result);
    return JSON.parse(result) as Flashcard[];
  });
};

export const generateExam = async (base64Data: string, mimeType: string, difficulty: 'Easy' | 'Medium' | 'Hard', count: number = 5): Promise<ExamQuestion[]> => {
  const cacheKey = getCacheKey(base64Data, `exam_${difficulty}_${count}`);
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  return withRetry(async () => {
    const ai = getAI();
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          topic: { type: Type.STRING }
        },
        required: ["id", "question", "options", "correctIndex", "explanation", "difficulty", "topic"]
      }
    };

    const response = await ai.models.generateContent({
      model: MODEL_SMART, // Model lebih cerdas untuk simulasi ujian
      contents: getContents(base64Data, mimeType, `Buat simulasi ujian tingkat ${difficulty} sebanyak ${count} soal.`),
      config: { responseMimeType: "application/json", responseSchema: schema }
    });
    const result = response.text || '[]';
    localStorage.setItem(cacheKey, result);
    return JSON.parse(result) as ExamQuestion[];
  });
};

export const chatWithDocument = async (base64Data: string, mimeType: string, history: any[], newMessage: string, attachment?: string): Promise<string> => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_UNLIMITED,
      contents: getContents(base64Data, mimeType, `Gunakan materi sebagai referensi utama. Jawab pertanyaan: ${newMessage}`)
    });
    return response.text || "Tutor sedang tidak tersedia.";
  });
};