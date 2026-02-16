
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

// Data Simulasi untuk Mode Demo (Tanpa API Key)
const MOCK_DATA = {
  explanation: "# 🚀 Mode Demo Aktif\n\nSelamat datang di **RyuuLearn**! Karena aplikasi ini sedang berjalan tanpa API Key, Ryuu menggunakan materi simulasi untuk menunjukkan kemampuannya.\n\n### Yang Bisa Anda Lakukan:\n1. **Lihat Ringkasan:** Materi akan diformat dengan Markdown yang cantik.\n2. **Uji Kemampuan:** Coba fitur kuis dan ujian dengan soal-soal simulasi.\n3. **Coba KaTeX:** Ryuu mendukung rumus matematika seperti $\\int_{a}^{b} f(x) dx = F(b) - F(a)$.\n\n*Catatan: Masukkan API Key di pengaturan untuk menganalisis file Anda sendiri secara nyata.*",
  flashcards: [
    { 
      question: "Apakah Ryuu bisa belajar tanpa internet?", 
      options: ["Tidak bisa sama sekali", "Bisa, menggunakan fitur Perpustakaan Offline", "Hanya untuk chatting", "Hanya di malam hari"], 
      correctIndex: 1, 
      explanation: "Ryuu memiliki fitur 'Simpan ke Koleksi' yang memungkinkan Anda membuka kembali materi yang sudah dianalisis bahkan saat offline." 
    },
    { 
      question: "Bagaimana cara mendapatkan kecerdasan AI asli di Ryuu?", 
      options: ["Membayar langganan", "Memasukkan API Key Google AI Studio", "Menunggu update otomatis", "Mengunduh file tambahan"], 
      correctIndex: 1, 
      explanation: "Ryuu menggunakan API Gemini dari Google. Dengan memasukkan API Key sendiri, Ryuu akan bisa membaca file apa pun yang Anda berikan." 
    }
  ],
  exam: [
    {
      id: 1,
      question: "Manakah fitur utama yang membedakan RyuuLearn dengan pembaca PDF biasa?",
      options: ["Bisa zoom in", "Bisa mengubah PDF menjadi kuis dan tutor interaktif", "Hanya bisa membaca teks", "Memiliki mode gelap saja"],
      correctIndex: 1,
      explanation: "RyuuLearn bukan sekadar pembaca PDF; ia menggunakan AI untuk memahami konten dan membantu Anda belajar lewat kuis dan diskusi.",
      difficulty: "Medium",
      topic: "Fitur Aplikasi"
    }
  ]
};

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const withRetry = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  const ai = getAI();
  if (!ai) {
    // Simulasi jeda loading agar terasa natural
    await new Promise(r => setTimeout(r, 1200));
    return fallback;
  }

  try {
    return await fn();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return fallback;
  }
};

export const generateExplanation = async (base64Data: string, mimeType: string, type: 'SUMMARY' | 'DEEP'): Promise<string> => {
  return withRetry(async () => {
    const ai = getAI()!;
    const prompt = type === 'SUMMARY' ? "Ringkas materi ini secara padat." : "Jelaskan materi ini secara mendalam dengan analogi.";
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }
    });
    return response.text || MOCK_DATA.explanation;
  }, MOCK_DATA.explanation);
};

export const generateFlashcards = async (base64Data: string, mimeType: string): Promise<Flashcard[]> => {
  return withRetry(async () => {
    const ai = getAI()!;
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: "Buat 5 kuis pilihan ganda berdasarkan materi ini." }, { inlineData: { mimeType, data: base64Data } }] },
      config: { 
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
    return JSON.parse(response.text || '[]');
  }, MOCK_DATA.flashcards as Flashcard[]);
};

export const generateExam = async (base64Data: string, mimeType: string): Promise<ExamQuestion[]> => {
  return withRetry(async () => {
    const ai = getAI()!;
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: "Buat simulasi ujian lengkap (5 soal) berdasarkan materi ini." }, { inlineData: { mimeType, data: base64Data } }] },
      config: { 
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
              difficulty: { type: Type.STRING },
              topic: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctIndex", "explanation", "difficulty", "topic"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  }, MOCK_DATA.exam as ExamQuestion[]);
};

export const chatWithDocument = async (base64Data: string, mimeType: string, history: any[], newMessage: string, attachment?: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Halo! Ryuu sedang dalam **Mode Demo**. Di mode ini, saya tidak bisa membaca file Anda secara nyata, tapi saya bisa menjawab pertanyaan umum seputar cara belajar yang efektif!";
  
  try {
    const parts: any[] = [{ text: newMessage }, { inlineData: { mimeType, data: base64Data } }];
    if (attachment) parts.push({ inlineData: { mimeType: 'image/jpeg', data: attachment } });

    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts }
    });
    return response.text || "Tutor Ryuu sedang berpikir...";
  } catch {
    return "Maaf, ada gangguan teknis pada otak AI saya.";
  }
};
