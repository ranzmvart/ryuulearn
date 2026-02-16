
export enum AppMode {
  UPLOAD = 'UPLOAD',
  DASHBOARD = 'DASHBOARD',
  EXPLAIN_SUMMARY = 'EXPLAIN_SUMMARY',
  EXPLAIN_DEEP = 'EXPLAIN_DEEP',
  FLASHCARDS = 'FLASHCARDS',
  EXAM = 'EXAM',
  CHAT = 'CHAT',
  LIBRARY = 'LIBRARY',
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // Base64
}

export interface Flashcard {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ExamQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachment?: string; // Base64 image
}

export interface UserStats {
  xp: number;
  level: number;
  badges: string[]; // List of badge IDs
  filesProcessed: number;
  examsCompleted: number;
  flashcardsCompleted: number;
}

export interface SavedLesson {
  id: string;
  name: string;
  timestamp: number;
  file: UploadedFile;
  summary?: string;
  deepAnalysis?: string;
  flashcards?: Flashcard[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const AVAILABLE_BADGES: Badge[] = [
  { id: 'pioneer', name: 'Pioneer', description: 'Upload file pertama Anda', icon: '🚀' },
  { id: 'deep_thinker', name: 'Deep Thinker', description: 'Membaca analisis mendalam', icon: '🧠' },
  { id: 'flash_master', name: 'Flash Master', description: 'Menyelesaikan sesi Flashcards', icon: '⚡' },
  { id: 'scholar', name: 'Scholar', description: 'Menyelesaikan simulasi ujian', icon: '🎓' },
  { id: 'perfect_score', name: 'Perfect Score', description: 'Skor 100% di simulasi ujian', icon: '🏆' },
  { id: 'librarian', name: 'Librarian', description: 'Menyimpan 3 materi ke perpustakaan offline', icon: '📚' },
];
