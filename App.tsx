
import React, { useState, useEffect, useCallback } from 'react';
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
  
  // Safe check for API key
  const [isDemoMode, setIsDemoMode] = useState(true);

  useEffect(() => {
    try {
      // @ts-ignore
      const hasKey = typeof process !== 'undefined' && !!process.env?.API_KEY;
      setIsDemoMode(!hasKey);
    } catch {
      setIsDemoMode(true);
    }
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
      return { ...prev, xp: newXP, level: newLevel };
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
    setLoadingMessage(isDemoMode ? 'Memuat simulasi Ryuu...' : 'Ryuu sedang menganalisis materi...');
    try {
      const result = await generateExplanation(file.data, file.type, type);
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
    setLoadingMessage('Menyiapkan sesi kuis...');
    try {
      const cards = await generateFlashcards(file.data, file.type); 
      setFlashcards(cards);
      setMode(AppMode.FLASHCARDS);
    } catch {
      setNotification({ message: "Gagal membuat kuis.", type: "error" });
    } finally { setIsLoading(false); }
  };

  const handleStartExam = async () => {
    if (!file) return;
    setIsLoading(true);
    setLoadingMessage(`Merancang simulasi ujian...`);
    try {
      const questions = await generateExam(file.data, file.type); 
      setExamQuestions(questions);
      setMode(AppMode.EXAM);
    } catch { 
      setNotification({ message: "Gagal membuat ujian.", type: "error" });
    } finally { setIsLoading(false); }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in bg-white/80 backdrop-blur-sm">
          <div className="relative mb-8">
            <BrainIcon className="w-16 h-16 text-indigo-600 animate-float" />
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">{loadingMessage}</h3>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Memproses Kecerdasan...</p>
        </div>
      );
    }

    switch (mode) {
      case AppMode.UPLOAD:
        return (
          <div className="flex flex-col items-center justify-center min-h-full w-full p-4 animate-view-entry">
            <div className="text-center mb-12">
              <h1 className="text-7xl font-black text-slate-900 mb-4 tracking-tighter">RyuuLearn</h1>
              <p className="text-slate-500 font-medium text-lg">Belajar cerdas dengan bantuan AI.</p>
              {isDemoMode && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full border border-amber-200 uppercase tracking-widest">Mode Demo</span>
                  <span className="text-[10px] font-bold text-slate-400">Semua fitur aktif (Simulasi)</span>
                </div>
              )}
            </div>
            <FileUpload onFileSelect={handleFileSelect} />
            <button onClick={() => setMode(AppMode.LIBRARY)} className="mt-12 flex items-center gap-2 px-6 py-2 bg-white rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 shadow-sm hover:bg-slate-50 transition-all text-slate-500">
               <BookIcon className="w-4 h-4" /> Buka Koleksi Offline
            </button>
          </div>
        );

      case AppMode.DASHBOARD:
        return (
          <div className="max-w-4xl mx-auto w-full flex flex-col p-6 animate-view-entry overflow-y-auto no-scrollbar pb-10">
            <div className="bg-white rounded-[2rem] p-6 mb-8 shadow-xl border border-indigo-50 flex items-center gap-6">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">{userStats.level}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa Level {userStats.level}</span>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{userStats.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${((userStats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` }}></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button onClick={() => handleGenerateExplanation('SUMMARY')} className="p-6 bg-white rounded-[2rem] shadow-md hover:shadow-xl transition-all text-left flex flex-col gap-4 border border-transparent hover:border-indigo-100">
                <BookIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 leading-tight">Ringkasan</h3>
              </button>
              <button onClick={() => handleGenerateExplanation('DEEP')} className="p-6 bg-white rounded-[2rem] shadow-md hover:shadow-xl transition-all text-left flex flex-col gap-4 border border-transparent hover:border-indigo-100">
                <BrainIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 leading-tight">Analisis Dalam</h3>
              </button>
              <button onClick={handleStartFlashcards} className="p-6 bg-white rounded-[2rem] shadow-md hover:shadow-xl transition-all text-left flex flex-col gap-4 border border-transparent hover:border-indigo-100">
                <CardsIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 leading-tight">Kartu Flash</h3>
              </button>
              <button onClick={() => setMode(AppMode.CHAT)} className="p-6 bg-white rounded-[2rem] shadow-md hover:shadow-xl transition-all text-left flex flex-col gap-4 border border-transparent hover:border-indigo-100">
                <MessageCircleIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 leading-tight">Tanya Ryuu</h3>
              </button>
            </div>

            <button onClick={handleStartExam} className="w-full bg-slate-900 p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl active:scale-95 transition-all mb-8 hover:bg-slate-800">
              <div className="text-left">
                <h3 className="text-3xl font-black mb-1 tracking-tight">Simulasi Ujian</h3>
                <p className="text-slate-400 font-medium">Uji batas penguasaan materi.</p>
              </div>
              <div className="bg-indigo-600 px-6 py-3 rounded-2xl font-black text-sm uppercase">Mulai</div>
            </button>

            <button onClick={() => setMode(AppMode.UPLOAD)} className="mx-auto text-slate-400 font-black text-[10px] tracking-widest hover:text-slate-600 transition-colors">GANTI MATERI</button>
          </div>
        );

      case AppMode.EXPLAIN_SUMMARY:
      case AppMode.EXPLAIN_DEEP:
        return (
          <div className="max-w-4xl mx-auto h-full flex flex-col p-4 animate-view-entry">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setMode(AppMode.DASHBOARD)} className="flex items-center gap-2 font-black text-slate-600 bg-white px-5 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all">
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
                  setNotification({message: "Tersimpan di Koleksi Offline!", type: "success"});
                }} 
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black shadow-lg text-xs hover:bg-indigo-700 transition-all"
              >
                Simpan Materi
              </button>
            </div>
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1 shadow-2xl border border-indigo-50">
              <MarkdownRenderer content={content} />
            </div>
          </div>
        );

      case AppMode.FLASHCARDS: return <FlashcardGame cards={flashcards} onBack={(s) => { awardXP(s*10, "Sesi Kuis"); setMode(AppMode.DASHBOARD); }} />;
      case AppMode.EXAM: return <ExamMode questions={examQuestions} onBack={(s) => { awardXP(s*5, "Ujian Selesai"); setMode(AppMode.DASHBOARD); }} />;
      case AppMode.CHAT: return <ChatInterface file={file!} onBack={() => setMode(AppMode.DASHBOARD)} />;
      case AppMode.LIBRARY: return <LibraryView onBack={() => setMode(AppMode.UPLOAD)} onLoadLesson={(l) => { setFile(l.file); setContent(l.summary || l.deepAnalysis || ''); setMode(AppMode.DASHBOARD); }} />;
      default: return null;
    }
  };

  return (
    <div className="h-full bg-[#F8FAFC]">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-2xl shadow-2xl animate-view-entry font-black text-xs uppercase tracking-widest border border-white/20 text-white ${notification.type === 'error' ? 'bg-red-500' : 'bg-indigo-600'}`}>
          {notification.message}
        </div>
      )}
      <main className="h-full overflow-hidden">{renderContent()}</main>
    </div>
  );
}

export default App;
