
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
 * RYUU HEURISTIC ENGINE (Opsi Tanpa API Key)
 * Logika ini menganalisis teks asli secara lokal di browser.
 */
const smartLocalAnalyze = (fileName: string, rawContent?: string) => {
  const text = rawContent || "Materi pembelajaran umum.";
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);
  const words = text.split(/\s+/).filter(w => w.length > 5);
  
  // Ambil kata kunci unik
  const keywords = [...new Set(words)].slice(0, 10);
  
  // Buat Ringkasan Otomatis (Heuristik)
  const autoSummary = sentences.slice(0, 3).join(". ") + ".";
  
  // Buat Flashcards Otomatis
  const generatedCards: Flashcard[] = keywords.map((word, i) => ({
    question: `Berdasarkan materi "${fileName}", apa konteks atau definisi dari "${word}"?`,
    options: [
      `Konsep utama terkait ${word}`,
      `Penjelasan tambahan materi`,
      `Detail teknis ${fileName}`,
      `Salah semua`
    ],
    correctIndex: 0,
    explanation: `Kata "${word}" merupakan salah satu elemen kunci yang ditemukan dalam analisis teks lokal Ryuu.`
  }));

  // Buat Ujian Otomatis
  const generatedExam: ExamQuestion[] = sentences.slice(0, 5).map((s, i) => ({
    id: i + 1,
    question: `Apakah pernyataan ini benar sesuai materi: "${s.trim()}..."?`,
    options: ["Benar", "Salah", "Mungkin", "Tidak Relevan"],
    correctIndex: 0,
    explanation: "Pernyataan ini diambil langsung dari inti teks yang Anda berikan.",
    difficulty: i % 2 === 0 ? "Easy" : "Medium",
    topic: fileName
  }));

  return {
    explanation: `# 📑 Analisis Ryuu: ${fileName}\n\n${autoSummary}\n\n### 🔍 Poin Penting:\n${keywords.map(k => `* **${k}**: Terdeteksi sebagai istilah teknis.`).join('\n')}\n\n### 💡 Saran Belajar:\nMateri ini memiliki sekitar ${sentences.length} poin pikiran. Ryuu menyarankan teknik *Active Recall* menggunakan fitur **Kartu Flash** di bawah.`,
    flashcards: generatedCards,
    exam: generatedExam
  };
};

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateExplanation = async (base64Data: string, mimeType: string, type: 'SUMMARY' | 'DEEP', fileName: string): Promise<string> => {
  let rawText = "";
  try {
    if (mimeType === 'text/plain') rawText = atob(base64Data);
  } catch (e) {}

  const local = smartLocalAnalyze(fileName, rawText);
  const ai = getAI();

  if (!ai) {
    await new Promise(r => setTimeout(r, 800));
    return local.explanation;
  }

  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: type === 'SUMMARY' ? "Ringkas." : "Jelaskan mendalam." }, { inlineData: { mimeType, data: base64Data } }] }
    });
    return response.text || local.explanation;
  } catch {
    return local.explanation;
  }
};

export const generateFlashcards = async (base64Data: string, mimeType: string, fileName: string): Promise<Flashcard[]> => {
  let rawText = "";
  try { if (mimeType === 'text/plain') rawText = atob(base64Data); } catch (e) {}
  
  const local = smartLocalAnalyze(fileName, rawText);
  const ai = getAI();

  if (!ai) return local.flashcards;

  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: "Buat kuis JSON." }, { inlineData: { mimeType, data: base64Data } }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '[]');
  } catch {
    return local.flashcards;
  }
};

export const generateExam = async (base64Data: string, mimeType: string, fileName: string): Promise<ExamQuestion[]> => {
  let rawText = "";
  try { if (mimeType === 'text/plain') rawText = atob(base64Data); } catch (e) {}
  
  const local = smartLocalAnalyze(fileName, rawText);
  const ai = getAI();

  if (!ai) return local.exam;

  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: "Buat ujian JSON." }, { inlineData: { mimeType, data: base64Data } }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '[]');
  } catch {
    return local.exam;
  }
};

// Fix: Added attachment parameter (6th argument) to fix mismatch with ChatInterface.tsx
export const chatWithDocument = async (base64Data: string, mimeType: string, history: any[], newMessage: string, fileName: string, attachment?: string): Promise<string> => {
  const ai = getAI();
  if (!ai) {
    return `Tutor Ryuu (Mode Lokal) aktif. Saya telah memproses **${fileName}**. Anda bisa menggunakan fitur Analisis, Kuis, atau Ujian untuk membedah isi materi ini secara otomatis tanpa internet!`;
  }
  
  try {
    const parts: any[] = [{ text: newMessage }, { inlineData: { mimeType, data: base64Data } }];
    
    // Add image attachment if present
    if (attachment) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: attachment
        }
      });
    }

    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts }
    });
    return response.text || "Sedang memproses...";
  } catch {
    return "Maaf, gunakan mode lokal untuk saat ini.";
  }
};
