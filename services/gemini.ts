
import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, ExamQuestion } from "../types.ts";

// Inisialisasi SDK dengan API Key dari environment variable
const getAIInstance = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const RYUU_SYSTEM_INSTRUCTION = `Anda adalah Ryuu, tutor AI tercanggih. 
Keahlian Anda adalah membedah dokumen (PDF, gambar, teks) dan menjelaskannya dengan sangat jernih.
Aturan:
1. Gunakan Bahasa Indonesia yang inspiratif dan cerdas.
2. Jelaskan konsep sulit dengan analogi dunia nyata.
3. Gunakan format Markdown (bold, list, table) agar mudah dibaca.
4. Jika ada rumus matematika, gunakan format LaTeX (contoh: $E=mc^2$).
5. Selalu motivasi pengguna untuk terus belajar.`;

/**
 * Logika Heuristik Lokal (Fallback jika offline atau API Key tidak ada)
 */
const localFallback = (fileName: string) => {
  return {
    explanation: `# 📑 Analisis Ryuu (Mode Lokal)\n\nMaaf, sepertinya API Key belum terkonfigurasi di Netlify atau Anda sedang offline. Ryuu tidak bisa memberikan analisis AI penuh.\n\n### Cara Memperbaiki:\n1. Buka Dashboard Netlify.\n2. Masuk ke **Site settings > Environment variables**.\n3. Tambahkan variabel baru dengan nama \`API_KEY\` dan isi dengan kunci dari Google AI Studio.`,
    flashcards: [{
      question: "Bagaimana cara mengaktifkan AI Online?",
      options: ["Set API_KEY di Netlify", "Biarkan saja", "Hapus aplikasi", "Ganti browser"],
      correctIndex: 0,
      explanation: "Anda perlu menambahkan environment variable API_KEY agar Ryuu bisa terhubung ke otak pusat AI."
    }],
    exam: []
  };
};

export const generateExplanation = async (base64Data: string, mimeType: string, type: 'SUMMARY' | 'DEEP', fileName: string): Promise<string> => {
  try {
    const ai = getAIInstance();
    const model = type === 'SUMMARY' ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
    const prompt = type === 'SUMMARY' 
      ? "Buatkan ringkasan materi ini. Fokus pada poin-poin paling penting untuk dihafal." 
      : "Lakukan analisis mendalam pada materi ini. Jelaskan latar belakang, mekanisme kerja, dan contoh kasusnya.";

    const response = await ai.models.generateContent({
      model,
      contents: { 
        parts: [
          { text: prompt }, 
          { inlineData: { mimeType, data: base64Data } }
        ] 
      },
      config: { systemInstruction: RYUU_SYSTEM_INSTRUCTION }
    });

    return response.text || "Maaf, Ryuu gagal menghasilkan penjelasan.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return localFallback(fileName).explanation;
  }
};

export const generateFlashcards = async (base64Data: string, mimeType: string, fileName: string): Promise<Flashcard[]> => {
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { text: "Buat 8 kartu flash pilihan ganda berdasarkan materi ini dalam format JSON." }, 
          { inlineData: { mimeType, data: base64Data } }
        ] 
      },
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

    const text = response.text;
    return text ? JSON.parse(text) : localFallback(fileName).flashcards;
  } catch (error) {
    console.error("Gemini Flashcards Error:", error);
    return localFallback(fileName).flashcards;
  }
};

export const generateExam = async (base64Data: string, mimeType: string, fileName: string): Promise<ExamQuestion[]> => {
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { text: "Buat 10 soal ujian simulasi profesional dengan tingkat kesulitan bervariasi." }, 
          { inlineData: { mimeType, data: base64Data } }
        ] 
      },
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
              difficulty: { type: Type.STRING, description: "Easy, Medium, or Hard" },
              topic: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctIndex", "explanation", "difficulty", "topic"]
          }
        }
      }
    });

    const text = response.text;
    return text ? (JSON.parse(text) as ExamQuestion[]) : [];
  } catch (error) {
    console.error("Gemini Exam Error:", error);
    return [];
  }
};

export const chatWithDocument = async (base64Data: string, mimeType: string, history: any[], newMessage: string, fileName: string, attachment?: string): Promise<string> => {
  try {
    const ai = getAIInstance();
    const parts: any[] = [
      { text: newMessage }, 
      { inlineData: { mimeType, data: base64Data } }
    ];

    if (attachment) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: attachment } });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Menggunakan model Pro untuk chat agar lebih cerdas
      contents: { parts },
      config: { systemInstruction: RYUU_SYSTEM_INSTRUCTION }
    });

    return response.text || "Ryuu sedang memikirkan jawabannya...";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Maaf, Ryuu kehilangan koneksi ke otak AI. Coba lagi nanti.";
  }
};
