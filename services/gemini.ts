
import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, ExamQuestion } from "../types.ts";

const getApiKey = () => {
  try {
    // @ts-ignore
    const key = (typeof process !== 'undefined' && process.env?.API_KEY) || "";
    return key.trim();
  } catch {
    return "";
  }
};

const PRIMARY_MODEL = 'gemini-3-flash-preview';

/**
 * RYUU SYSTEM INSTRUCTIONS
 * Memberikan kepribadian dan pedoman pada AI.
 */
const RYUU_SYSTEM_INSTRUCTION = `Anda adalah Ryuu, tutor pribadi bertenaga AI yang paling cerdas dan membantu.
Tugas Anda:
1. Menganalisis dokumen pembelajaran (PDF/Gambar/Teks) dengan akurasi tinggi.
2. Menjelaskan konsep menggunakan analogi yang mudah dipahami anak usia 15 tahun.
3. Selalu sertakan rumus atau istilah teknis dalam format Markdown atau LaTeX jika ada.
4. Jangan hanya merangkum, tapi ajarkan "mengapa" dan "bagaimana" konsep tersebut bekerja.
5. Gunakan Bahasa Indonesia yang santai namun profesional dan memotivasi.`;

/**
 * RYUU HEURISTIC ENGINE (Fallback Mode)
 * Fix: Added explicit return type to ensure TypeScript correctly identifies the 'difficulty' 
 * field as the union type 'Easy' | 'Medium' | 'Hard' instead of a general string.
 */
const smartLocalAnalyze = (fileName: string, rawContent?: string): {
  explanation: string;
  flashcards: Flashcard[];
  exam: ExamQuestion[];
} => {
  const text = rawContent || "Materi pembelajaran umum.";
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);
  const words = text.split(/\s+/).filter(w => w.length > 5);
  const keywords = [...new Set(words)].slice(0, 10);
  const autoSummary = sentences.slice(0, 3).join(". ") + ".";
  
  return {
    explanation: `# 📑 Analisis Ryuu (Offline): ${fileName}\n\n${autoSummary}\n\n### 🔍 Poin Utama:\n${keywords.map(k => `* **${k}**: Istilah kunci ditemukan.`).join('\n')}\n\n*Catatan: Anda melihat hasil analisis mesin lokal karena AI Online sedang tidak tersedia.*`,
    flashcards: keywords.map(word => ({
      question: `Apa yang dimaksud dengan "${word}" dalam konteks ${fileName}?`,
      options: [`Definisi utama ${word}`, `Contoh kasus`, `Teori pendukung`, `Salah semua`],
      correctIndex: 0,
      explanation: `Istilah "${word}" adalah bagian krusial dari materi ini.`
    })),
    exam: sentences.slice(0, 5).map((s, i) => ({
      id: i + 1,
      question: `Analisis kalimat berikut: "${s.trim()}"?`,
      options: ["Pernyataan Benar", "Pernyataan Salah", "Kurang Informasi", "Tidak Relevan"],
      correctIndex: 0,
      explanation: "Pertanyaan ini menguji pemahaman tekstual Anda.",
      difficulty: "Medium" as "Medium",
      topic: fileName
    }))
  };
};

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateExplanation = async (base64Data: string, mimeType: string, type: 'SUMMARY' | 'DEEP', fileName: string): Promise<string> => {
  const ai = getAI();
  const local = smartLocalAnalyze(fileName);

  if (!ai) return local.explanation;

  try {
    const prompt = type === 'SUMMARY' 
      ? "Buatkan ringkasan materi ini yang padat, terstruktur, dan mudah dihafal." 
      : "Jelaskan materi ini secara mendalam. Gunakan analogi kreatif, jelaskan sejarah singkatnya jika relevan, dan berikan contoh penerapan di dunia nyata.";

    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] },
      config: { systemInstruction: RYUU_SYSTEM_INSTRUCTION }
    });
    return response.text || local.explanation;
  } catch (error) {
    console.error("AI Error:", error);
    return local.explanation;
  }
};

export const generateFlashcards = async (base64Data: string, mimeType: string, fileName: string): Promise<Flashcard[]> => {
  const ai = getAI();
  const local = smartLocalAnalyze(fileName);

  if (!ai) return local.flashcards;

  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: "Buat 8 kuis pilihan ganda yang menantang berdasarkan materi ini." }, { inlineData: { mimeType, data: base64Data } }] },
      config: { 
        systemInstruction: RYUU_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
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
        }
      }
    });
    // Fix: Cast JSON result to Flashcard[] to satisfy TypeScript.
    return JSON.parse(response.text || '[]') as Flashcard[];
  } catch {
    return local.flashcards;
  }
};

export const generateExam = async (base64Data: string, mimeType: string, fileName: string): Promise<ExamQuestion[]> => {
  const ai = getAI();
  const local = smartLocalAnalyze(fileName);

  if (!ai) return local.exam;

  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: "Buat simulasi ujian resmi berisi 10 soal dengan tingkat kesulitan campuran." }, { inlineData: { mimeType, data: base64Data } }] },
      config: { 
        systemInstruction: RYUU_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              difficulty: { 
                type: Type.STRING,
                description: "Must be exactly 'Easy', 'Medium', or 'Hard'"
              },
              topic: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctIndex", "explanation", "difficulty", "topic"]
          }
        }
      }
    });
    // Fix: Explicitly cast JSON result to ExamQuestion[] to resolve type mismatch on the 'difficulty' union property.
    return JSON.parse(response.text || '[]') as ExamQuestion[];
  } catch {
    return local.exam;
  }
};

export const chatWithDocument = async (base64Data: string, mimeType: string, history: any[], newMessage: string, fileName: string, attachment?: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return `Tutor Ryuu Online sedang sibuk. Saya (Ryuu Local) bisa mengonfirmasi bahwa materi **${fileName}** sudah dimuat. Gunakan menu kuis untuk mulai belajar!`;
  
  try {
    const parts: any[] = [{ text: newMessage }, { inlineData: { mimeType, data: base64Data } }];
    if (attachment) parts.push({ inlineData: { mimeType: 'image/jpeg', data: attachment } });

    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts },
      config: { systemInstruction: RYUU_SYSTEM_INSTRUCTION }
    });
    return response.text || "Ryuu sedang memikirkan jawabannya...";
  } catch {
    return "Maaf, Tutor Ryuu mengalami gangguan koneksi ke awan AI.";
  }
};
