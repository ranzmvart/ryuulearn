
import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, ExamQuestion } from "../types.ts";

const RYUU_SYSTEM_INSTRUCTION = `Anda adalah Ryuu, tutor AI tercanggih. 
Keahlian Anda adalah membedah dokumen (PDF, gambar, teks) dan menjelaskannya dengan sangat jernih.
Aturan:
1. Gunakan Bahasa Indonesia yang inspiratif dan cerdas.
2. Jelaskan konsep sulit dengan analogi dunia nyata.
3. Gunakan format Markdown (bold, list, table) agar mudah dibaca.
4. Jika ada rumus matematika, gunakan format LaTeX (contoh: $E=mc^2$).
5. Selalu motivasi pengguna untuk terus belajar.`;

const localFallback = (fileName: string) => {
  return {
    explanation: `# 📑 Analisis Ryuu (Mode Lokal)\n\nSepertinya Ryuu belum terhubung ke otak pusat AI secara sempurna.\n\n### Cara Memperbaiki:\n1. Klik tombol **'Aktifkan AI'** di halaman utama.\n2. Pilih API Key yang valid dari Google AI Studio.\n3. Ryuu akan langsung menjadi sangat cerdas!`,
    flashcards: [{
      question: "Bagaimana cara mengaktifkan AI Online?",
      options: ["Klik tombol Aktifkan AI", "Biarkan saja", "Hapus aplikasi", "Ganti browser"],
      correctIndex: 0,
      explanation: "Gunakan fitur 'Select Key' untuk menghubungkan Ryuu ke server pusat."
    }],
    exam: []
  };
};

// Fungsi pembantu untuk inisialisasi AI dengan kunci terbaru
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return null;
  return new GoogleGenAI({ apiKey });
};

export const generateExplanation = async (base64Data: string, mimeType: string, type: 'SUMMARY' | 'DEEP', fileName: string): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) throw new Error("No API Key");

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
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("entity was not found")) {
      // @ts-ignore
      if (window.aistudio) window.aistudio.openSelectKey();
    }
    return localFallback(fileName).explanation;
  }
};

export const generateFlashcards = async (base64Data: string, mimeType: string, fileName: string): Promise<Flashcard[]> => {
  try {
    const ai = getAI();
    if (!ai) throw new Error("No API Key");

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
    const ai = getAI();
    if (!ai) throw new Error("No API Key");

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
    const ai = getAI();
    if (!ai) throw new Error("No API Key");

    const parts: any[] = [
      { text: newMessage }, 
      { inlineData: { mimeType, data: base64Data } }
    ];

    if (attachment) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: attachment } });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: { systemInstruction: RYUU_SYSTEM_INSTRUCTION }
    });

    return response.text || "Ryuu sedang memikirkan jawabannya...";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Maaf, Ryuu kehilangan koneksi ke otak AI. Mohon pilih ulang API Key melalui tombol 'Connect AI'.";
  }
};
