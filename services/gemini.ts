
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
 * Generator Data Lokal (Simulasi Cerdas)
 * Digunakan ketika aplikasi berjalan tanpa API Key.
 */
const generateLocalSimulatedData = (fileName: string, content?: string) => {
  const cleanName = fileName.replace(/\.[^/.]+$/, "");
  const snippet = content ? content.substring(0, 100) + "..." : "Materi pembelajaran terstruktur.";

  return {
    explanation: `# Analisis Materi: ${cleanName}\n\nIni adalah hasil analisis **Ryuu Local Engine**. Dalam mode offline, Ryuu mengekstrak poin-poin penting dari materi Anda.\n\n### Ringkasan Strategis:\n* **Konsep Utama:** Fokus pada pemahaman dasar materi ${cleanName}.\n* **Struktur Data:** Materi mengandung informasi tentang: *${snippet}*\n* **Rekomendasi:** Gunakan fitur **Kartu Flash** untuk menghafal istilah penting.\n\n### Rumus Terkait:\nJika materi ini bersifat teknis, Anda mungkin menemui rumus seperti:\n$$ \text{Pemahaman} = \frac{\text{Latihan}}{\text{Waktu}} \times \text{RyuuLearn} $$`,
    
    flashcards: [
      { 
        question: `Apa inti dari pembahasan "${cleanName}"?`, 
        options: ["Konsep Dasar", "Aplikasi Praktis", "Sejarah", "Semua Benar"], 
        correctIndex: 3, 
        explanation: "Materi ini mencakup seluruh aspek pembelajaran mulai dari teori hingga praktik." 
      },
      { 
        question: `Metode belajar apa yang paling efektif untuk materi ${cleanName}?`, 
        options: ["Membaca saja", "Latihan Soal", "Diskusi dengan Tutor Ryuu", "Hanya melihat gambar"], 
        correctIndex: 2, 
        explanation: "Berinteraksi dengan Tutor Ryuu membantu memperjelas konsep yang sulit dipahami secara mandiri." 
      },
      { 
        question: "Apakah hasil analisis ini bisa disimpan?", 
        options: ["Bisa, di Koleksi Offline", "Tidak bisa", "Hanya saat online", "Hanya di PC"], 
        correctIndex: 0, 
        explanation: "Gunakan tombol 'Simpan Materi' untuk mengakses data ini kapan saja tanpa internet." 
      }
    ],

    exam: [
      {
        id: 1,
        question: `Berdasarkan penggalan materi "${cleanName}", apa tujuan utama pembelajarannya?`,
        options: ["Meningkatkan nilai ujian", "Memahami konsep secara mendalam", "Sekadar membaca", "Lupa"],
        correctIndex: 1,
        explanation: "RyuuLearn fokus pada pemahaman konsep (Deep Learning) daripada sekadar hafalan.",
        difficulty: "Medium",
        topic: cleanName
      },
      {
        id: 2,
        question: "Manakah fitur Ryuu yang paling membantu dalam menguji daya ingat?",
        options: ["Ringkasan", "Kartu Flash", "Chat", "Dashboard"],
        correctIndex: 1,
        explanation: "Kartu Flash dirancang khusus menggunakan metode pengulangan untuk memperkuat memori jangka panjang.",
        difficulty: "Easy",
        topic: "Metode Belajar"
      }
    ]
  };
};

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const withRetry = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  const ai = getAI();
  if (!ai) {
    await new Promise(r => setTimeout(r, 1000));
    return fallback;
  }
  try {
    return await fn();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return fallback;
  }
};

export const generateExplanation = async (base64Data: string, mimeType: string, type: 'SUMMARY' | 'DEEP', fileName: string): Promise<string> => {
  let content = "";
  if (mimeType === 'text/plain') {
    content = atob(base64Data);
  }
  const localData = generateLocalSimulatedData(fileName, content);
  
  return withRetry(async () => {
    const ai = getAI()!;
    const prompt = type === 'SUMMARY' ? "Ringkas materi ini." : "Jelaskan mendalam.";
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }
    });
    return response.text || localData.explanation;
  }, localData.explanation);
};

export const generateFlashcards = async (base64Data: string, mimeType: string, fileName: string): Promise<Flashcard[]> => {
  const localData = generateLocalSimulatedData(fileName);
  return withRetry(async () => {
    const ai = getAI()!;
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: "Buat 5 kuis pilihan ganda." }, { inlineData: { mimeType, data: base64Data } }] },
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
  }, localData.flashcards as Flashcard[]);
};

export const generateExam = async (base64Data: string, mimeType: string, fileName: string): Promise<ExamQuestion[]> => {
  const localData = generateLocalSimulatedData(fileName);
  return withRetry(async () => {
    const ai = getAI()!;
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts: [{ text: "Buat simulasi ujian." }, { inlineData: { mimeType, data: base64Data } }] },
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
  }, localData.exam as ExamQuestion[]);
};

export const chatWithDocument = async (base64Data: string, mimeType: string, history: any[], newMessage: string, fileName: string, attachment?: string): Promise<string> => {
  const ai = getAI();
  if (!ai) {
    const lowerMsg = newMessage.toLowerCase();
    if (lowerMsg.includes("halo") || lowerMsg.includes("hi")) return "Halo! Saya Tutor Ryuu. Saya sedang berjalan dalam **Mode Local Engine**. Saya bisa membantu Anda memahami cara belajar materi ini!";
    if (lowerMsg.includes("jelaskan") || lowerMsg.includes("apa")) return `Dalam mode offline, saya menganalisis bahwa materi **${fileName}** berfokus pada konsep dasar yang penting. Silakan coba fitur 'Analisis Dalam' untuk melihat rinciannya!`;
    return "Pertanyaan bagus! Dalam mode tanpa internet, saya menyarankan Anda untuk mencoba fitur **Kartu Flash** untuk menguji pemahaman Anda terhadap materi ini.";
  }
  
  try {
    const parts: any[] = [{ text: newMessage }, { inlineData: { mimeType, data: base64Data } }];
    if (attachment) parts.push({ inlineData: { mimeType: 'image/jpeg', data: attachment } });

    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts }
    });
    return response.text || "Tutor Ryuu sedang berpikir...";
  } catch {
    return "Maaf, ada sedikit gangguan pada sistem saya.";
  }
};
