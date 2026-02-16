
import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload.tsx';
import MarkdownRenderer from './components/MarkdownRenderer.tsx';
import FlashcardGame from './components/FlashcardGame.tsx';
import ChatInterface from './components/ChatInterface.tsx';
import ExamMode from './components/ExamMode.tsx';
import LibraryView from './components/LibraryView.tsx';
import { AppMode, UploadedFile, Flashcard, ExamQuestion, UserStats, SavedLesson } from './types.ts';
import { generateExplanation, generateFlashcards, generateExam } from './services/gemini.ts';
import { saveLessonToLibrary } from './services/storage.ts';
import { BookIcon, BrainIcon, CardsIcon, MessageCircleIcon, ChevronLeftIcon, SparklesIcon } from './components/Icons.tsx';

const XP_PER_LEVEL = 500;

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // @ts-ignore
    const hasKey = typeof process !== 'undefined' && !!process.env?.API_KEY;
    setIsOnline(hasKey);
  }, []);

  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('ryuu_user_stats');
    return saved ? JSON.parse(saved) : { xp: 0, level: 1, badges: [], filesProcessed: 0, examsCompleted: 0, flashcardsCompleted: 0 };
  });

  const [notification, setNotification] = useState<{message: string, type: 'xp' | 'success' | 'error'} | null>(null);

  const awardXP = (amount: number, reason: string) => {
    setUserStats(prev => {
      const newXP = prev.xp + amount;
      const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
      setNotification({ message: `+${amount} XP: ${reason}`, type: 'xp' });
      const stats = { ...prev, xp: newXP, level: newLevel };
      localStorage.setItem('ryuu_user_stats', JSON.stringify(stats));
      return stats;
    });
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleFileSelect = (uploadedFile: UploadedFile) => {
    setFile(uploadedFile);
    setMode(AppMode.DASHBOARD);
    awardXP(50, "Materi Berhasil Dimuat");
  };

  const handleGenerateExplanation = async (type: 'SUMMARY' | 'DEEP') => {
    if (!file) return;
    setIsLoading(true);
    setLoadingMessage(isOnline ? 'Ryuu sedang berdiskusi dengan AI...' : 'Menganalisis Konten secara Lokal...');
    try {
      const result = await generateExplanation(file.data, file.type, type, file.name);
      setContent(result);
      setMode(type === 'SUMMARY' ? AppMode.EXPLAIN_SUMMARY : AppMode.EXPLAIN_DEEP);
    } catch (error) {
      setNotification({ message: "Gagal memproses materi.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartFlashcards = async () => {
    if (!file) return;
    setIsLoading(true);
    setLoadingMessage('Membangun Kuis Interaktif...');
    try {
      const cards = await generateFlashcards(file.data, file.type, file.name); 
      setFlashcards(cards);
      setMode(AppMode.FLASHCARDS);
    } catch {
      setNotification({ message: "Gagal membuat kuis.", type: "error" });
    } finally { setIsLoading(false); }
  };

  const handleStartExam = async () => {
    if (!file) return;
    setIsLoading(true);
    setLoadingMessage(`Ryuu sedang menyusun soal ujian...`);
    try {
      const questions = await generateExam(file.data, file.type, file.name); 
      setExamQuestions(questions);
      setMode(AppMode.EXAM);
    } catch { 
      setNotification({ message: "Gagal membuat ujian.", type: "error" });
    } finally { setIsLoading(false); }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in bg-white/80 backdrop-blur-xl">
          <div className="relative mb-8">
            <BrainIcon className="w-20 h-20 text-indigo-600 animate-float" />
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{loadingMessage}</h3>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Processing Intelligence</p>
        </div>
      );
    }

    switch (mode) {
      case AppMode.UPLOAD:
        return (
          <div className="flex flex-col items-center justify-center min-h-full w-full p-4 animate-view-entry">
            <div className="text-center mb-12">
              <h1 className="text-8xl font-black text-slate-900 mb-4 tracking-tighter">RyuuLearn</h1>
              <p className="text-slate-500 font-medium text-lg">Belajar lebih cepat dengan bantuan Tutor AI.</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isOnline ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                   {isOnline ? '● AI Online Active' : '○ Local Mode Active'}
                 </span>
              </div>
            </div>
            <FileUpload onFileSelect={handleFileSelect} />
            <button onClick={() => setMode(AppMode.LIBRARY)} className="mt-12 text-slate-400 font-black text-[10px] tracking-widest hover:text-indigo-600 transition-colors uppercase">Perpustakaan Offline</button>
          </div>
        );

      case AppMode.DASHBOARD:
        return (
          <div className="max-w-4xl mx-auto w-full flex flex-col p-6 animate-view-entry overflow-y-auto no-scrollbar">
            <div className="bg-white rounded-[2.5rem] p-8 mb-8 shadow-2xl border border-indigo-50 flex items-center gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <SparklesIcon className="w-32 h-32 text-indigo-600" />
              </div>
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl ring-4 ring-indigo-100">{userStats.level}</div>
              <div className="flex-1 relative z-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa Berprestasi Level {userStats.level}</span>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{userStats.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                  <div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_10px_rgba(79,70,229,0.5)]" style={{ width: `${((userStats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` }}></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <button onClick={() => handleGenerateExplanation('SUMMARY')} className="p-8 bg-white rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all text-left flex flex-col gap-6 group border border-transparent hover:border-indigo-100">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <BookIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">Ringkasan AI</h3>
              </button>
              <button onClick={() => handleGenerateExplanation('DEEP')} className="p-8 bg-white rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all text-left flex flex-col gap-6 group border border-transparent hover:border-indigo-100">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <BrainIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">Analisis Ryuu</h3>
              </button>
              <button onClick={handleStartFlashcards} className="p-8 bg-white rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all text-left flex flex-col gap-6 group border border-transparent hover:border-indigo-100">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <CardsIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">Kartu Pintar</h3>
              </button>
              <button onClick={() => setMode(AppMode.CHAT)} className="p-8 bg-white rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all text-left flex flex-col gap-6 group border border-transparent hover:border-indigo-100">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <MessageCircleIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">Diskusi Materi</h3>
              </button>
            </div>

            <button onClick={handleStartExam} className="w-full bg-slate-900 p-10 rounded-[3rem] text-white flex justify-between items-center shadow-2xl active:scale-95 transition-all mb-12 hover:bg-indigo-700 group">
              <div className="text-left">
                <h3 className="text-4xl font-black mb-1 tracking-tight group-hover:scale-105 transition-transform origin-left">Simulasi Ujian</h3>
                <p className="text-slate-400 font-medium text-lg">Uji tingkat penguasaan konsep Anda.</p>
              </div>
              <div className="bg-white/10 p-5 rounded-full border border-white/20 group-hover:bg-white group-hover:text-slate-900 transition-all">
                 <SparklesIcon className="w-8 h-8" />
              </div>
            </button>

            <button onClick={() => setMode(AppMode.UPLOAD)} className="mx-auto text-slate-400 font-black text-[10px] tracking-widest hover:text-slate-600 uppercase mb-8">Ganti Dokumen Pembelajaran</button>
          </div>
        );

      case AppMode.EXPLAIN_SUMMARY:
      case AppMode.EXPLAIN_DEEP:
        return (
          <div className="max-w-4xl mx-auto h-full flex flex-col p-4 animate-view-entry">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setMode(AppMode.DASHBOARD)} className="flex items-center gap-2 font-black text-slate-600 bg-white px-5 py-3 rounded-2xl shadow-sm hover:bg-slate-50 transition-all">
                <ChevronLeftIcon className="w-5 h-5" /> Dashboard
              </button>
              <button 
                onClick={() => {
                  const lesson: SavedLesson = {
                    id: Date.now().toString(),
                    name: file?.name || 'Materi Tanpa Judul',
                    timestamp: Date.now(),
                    file: file!,
                    summary: mode === AppMode.EXPLAIN_SUMMARY ? content : undefined,
                    deepAnalysis: mode === AppMode.EXPLAIN_DEEP ? content : undefined
                  };
                  saveLessonToLibrary(lesson);
                  setNotification({message: "Tersimpan di Perpustakaan!", type: "success"});
                }} 
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl text-xs hover:bg-indigo-700 transition-all"
              >
                Simpan Materi
              </button>
            </div>
            <div className="bg-white rounded-[3rem] p-10 md:p-16 overflow-y-auto custom-scrollbar flex-1 shadow-2xl border border-indigo-50">
              <MarkdownRenderer content={content} />
            </div>
          </div>
        );

      case AppMode.FLASHCARDS: return <FlashcardGame cards={flashcards} onBack={(s) => { awardXP(s*10, "Latihan Selesai"); setMode(AppMode.DASHBOARD); }} />;
      case AppMode.EXAM: return <ExamMode questions={examQuestions} onBack={(s) => { awardXP(s*5, "Evaluasi Selesai"); setMode(AppMode.DASHBOARD); }} />;
      case AppMode.CHAT: return <ChatInterface file={file!} onBack={() => setMode(AppMode.DASHBOARD)} />;
      case AppMode.LIBRARY: return <LibraryView onBack={() => setMode(AppMode.UPLOAD)} onLoadLesson={(l) => { setFile(l.file); setContent(l.summary || l.deepAnalysis || ''); setMode(AppMode.DASHBOARD); }} />;
      default: return null;
    }
  };

  return (
    <div className="h-full bg-[#F8FAFC]">
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-3xl shadow-2xl animate-view-entry font-black text-xs uppercase tracking-widest border border-white/20 text-white bg-indigo-600`}>
          {notification.message}
        </div>
      )}
      <main className="h-full overflow-hidden">{renderContent()}</main>
    </div>
  );
}

export default App;
