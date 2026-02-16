
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
import { BookIcon, BrainIcon, CardsIcon, MessageCircleIcon, ChevronLeftIcon } from './components/Icons.tsx';

const XP_PER_LEVEL = 500;

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

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
    setLoadingMessage('Menganalisis Konten...');
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
    setLoadingMessage('Membangun Kuis...');
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
    setLoadingMessage(`Menyusun Ujian...`);
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
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
          <BrainIcon className="w-16 h-16 text-indigo-600 animate-float mb-6" />
          <h3 className="text-2xl font-black text-slate-900 mb-2">{loadingMessage}</h3>
        </div>
      );
    }

    switch (mode) {
      case AppMode.UPLOAD:
        return (
          <div className="flex flex-col items-center justify-center min-h-full w-full p-4 animate-view-entry">
            <div className="text-center mb-12">
              <h1 className="text-7xl font-black text-slate-900 mb-4 tracking-tighter">RyuuLearn</h1>
              <p className="text-slate-500 font-medium text-lg">Asisten belajar cerdas Anda.</p>
            </div>
            <FileUpload onFileSelect={handleFileSelect} />
            <button onClick={() => setMode(AppMode.LIBRARY)} className="mt-12 text-slate-400 font-black text-[10px] tracking-widest hover:text-indigo-600 transition-colors uppercase">Buka Koleksi Materi</button>
          </div>
        );

      case AppMode.DASHBOARD:
        return (
          <div className="max-w-4xl mx-auto w-full flex flex-col p-6 animate-view-entry">
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
              <button onClick={() => handleGenerateExplanation('SUMMARY')} className="p-6 bg-white rounded-[2rem] shadow-md hover:shadow-xl transition-all text-left flex flex-col gap-4">
                <BookIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 leading-tight">Ringkasan Materi</h3>
              </button>
              <button onClick={() => handleGenerateExplanation('DEEP')} className="p-6 bg-white rounded-[2rem] shadow-md hover:shadow-xl transition-all text-left flex flex-col gap-4">
                <BrainIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 leading-tight">Analisis Mendalam</h3>
              </button>
              <button onClick={handleStartFlashcards} className="p-6 bg-white rounded-[2rem] shadow-md hover:shadow-xl transition-all text-left flex flex-col gap-4">
                <CardsIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 leading-tight">Kartu Hafalan</h3>
              </button>
              <button onClick={() => setMode(AppMode.CHAT)} className="p-6 bg-white rounded-[2rem] shadow-md hover:shadow-xl transition-all text-left flex flex-col gap-4">
                <MessageCircleIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 leading-tight">Tanya Ryuu</h3>
              </button>
            </div>

            <button onClick={handleStartExam} className="w-full bg-slate-900 p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl active:scale-95 transition-all mb-8 hover:bg-indigo-600">
              <div className="text-left">
                <h3 className="text-3xl font-black mb-1 tracking-tight">Evaluasi Ujian</h3>
                <p className="text-slate-400 font-medium">Uji penguasaan materi secara menyeluruh.</p>
              </div>
              <div className="bg-indigo-500/20 px-6 py-3 rounded-2xl font-black text-sm uppercase border border-white/20">Mulai</div>
            </button>

            <button onClick={() => setMode(AppMode.UPLOAD)} className="mx-auto text-slate-400 font-black text-[10px] tracking-widest hover:text-slate-600 uppercase">Ganti File Materi</button>
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
                  setNotification({message: "Berhasil disimpan!", type: "success"});
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
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-2xl shadow-2xl animate-view-entry font-black text-xs uppercase tracking-widest border border-white/20 text-white bg-indigo-600`}>
          {notification.message}
        </div>
      )}
      <main className="h-full overflow-hidden">{renderContent()}</main>
    </div>
  );
}

export default App;
