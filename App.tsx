import React, { useState, useEffect, useCallback } from 'react';
import FileUpload from './components/FileUpload.tsx';
import MarkdownRenderer from './components/MarkdownRenderer.tsx';
import FlashcardGame from './components/FlashcardGame.tsx';
import ChatInterface from './components/ChatInterface.tsx';
import ExamMode from './components/ExamMode.tsx';
import LibraryView from './components/LibraryView.tsx';
import { AppMode, UploadedFile, Flashcard, ExamQuestion, UserStats, AVAILABLE_BADGES, SavedLesson } from './types.ts';
import { generateExplanation, generateFlashcards, generateExam } from './services/gemini.ts';
import { saveLessonToLibrary, getLibrary } from './services/storage.ts';
import { BookIcon, BrainIcon, CardsIcon, MessageCircleIcon, TrophyIcon, GraduationCapIcon, ChevronLeftIcon, SparklesIcon, SendIcon, XCircleIcon, CheckCircleIcon, UploadIcon } from './components/Icons.tsx';

const XP_PER_LEVEL = 500;

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [showExamConfig, setShowExamConfig] = useState(false);
  const [examConfig, setExamConfig] = useState<{difficulty: 'Easy' | 'Medium' | 'Hard', count: number}>({
    difficulty: 'Medium',
    count: 5
  });

  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('ryuu_user_stats');
    return saved ? JSON.parse(saved) : {
      xp: 0,
      level: 1,
      badges: [],
      filesProcessed: 0,
      examsCompleted: 0,
      flashcardsCompleted: 0
    };
  });

  const [notification, setNotification] = useState<{message: string, type: 'xp' | 'badge' | 'success' | 'offline' | 'error'} | null>(null);

  const handleOnline = useCallback(() => setIsOnline(true), []);
  const handleOffline = useCallback(() => setIsOnline(false), []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  useEffect(() => {
    localStorage.setItem('ryuu_user_stats', JSON.stringify(userStats));
  }, [userStats]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const awardXP = (amount: number, reason: string) => {
    setUserStats(prev => {
      const newXP = prev.xp + amount;
      const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
      if (newLevel > prev.level) setNotification({ message: `LEVEL UP! Level ${newLevel}!`, type: 'xp' });
      else setNotification({ message: `+${amount} XP: ${reason}`, type: 'xp' });
      return { ...prev, xp: newXP, level: newLevel };
    });
  };

  const handleFileSelect = (uploadedFile: UploadedFile) => {
    setFile(uploadedFile);
    setMode(AppMode.DASHBOARD);
    awardXP(50, "Materi Berhasil Dimuat");
  };

  const handleSaveToLibrary = () => {
    if (!file) return;
    const lesson: SavedLesson = {
      id: btoa(file.name).substring(0, 16),
      name: file.name,
      timestamp: Date.now(),
      file: file,
      summary: (mode === AppMode.EXPLAIN_SUMMARY || mode === AppMode.EXPLAIN_DEEP) ? content : undefined,
      deepAnalysis: mode === AppMode.EXPLAIN_DEEP ? content : undefined,
      flashcards: flashcards.length > 0 ? flashcards : undefined
    };
    saveLessonToLibrary(lesson);
    setNotification({ message: "Tersimpan di Perpustakaan!", type: 'success' });
  };

  const handleLoadFromLibrary = (lesson: SavedLesson) => {
    setFile(lesson.file);
    setContent(lesson.summary || lesson.deepAnalysis || '');
    setFlashcards(lesson.flashcards || []);
    setMode(AppMode.DASHBOARD);
    awardXP(10, "Membuka Koleksi");
  };

  const handleGenerateExplanation = async (type: 'SUMMARY' | 'DEEP') => {
    if (!file) return;
    if (!isOnline) {
      setNotification({ message: "Membutuhkan internet.", type: 'offline' });
      return;
    }
    setIsLoading(true);
    setLoadingMessage('AI Ryuu sedang menganalisis...');
    try {
      const result = await generateExplanation(file.data, file.type, type);
      setContent(result);
      setMode(type === 'SUMMARY' ? AppMode.EXPLAIN_SUMMARY : AppMode.EXPLAIN_DEEP);
      awardXP(30, "Materi Dipahami");
    } catch (error: any) {
      setNotification({ message: "Server sibuk. Coba sesaat lagi.", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartFlashcards = async () => {
    if (!file) return;
    if (flashcards.length > 0) { setMode(AppMode.FLASHCARDS); return; }
    if (!isOnline) { setNotification({ message: "Butuh internet.", type: 'offline' }); return; }
    setIsLoading(true);
    setLoadingMessage('Menyusun kartu memori cerdas...');
    try {
      const cards = await generateFlashcards(file.data, file.type, 5); 
      setFlashcards(cards);
      setMode(AppMode.FLASHCARDS);
    } catch (error: any) { 
      setNotification({ message: "Gagal membuat kartu. Kuota habis.", type: 'error' });
    } finally { setIsLoading(false); }
  };

  const handleStartExam = async () => {
    if (!file) return;
    if (!isOnline) {
      setNotification({ message: "Butuh internet untuk simulasi.", type: 'offline' });
      return;
    }
    setShowExamConfig(false);
    setIsLoading(true);
    setLoadingMessage(`Merancang soal ujian khusus untukmu...`);
    try {
      const questions = await generateExam(file.data, file.type, examConfig.difficulty, examConfig.count); 
      if (questions && questions.length > 0) {
        setExamQuestions(questions);
        setMode(AppMode.EXAM);
      } else {
        throw new Error("Empty questions");
      }
    } catch (error: any) { 
      setNotification({ message: "Batas kuota harian tercapai.", type: 'error' });
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleOpenExamConfig = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!file) {
      setNotification({ message: "Unggah materi dulu!", type: 'error' });
      return;
    }
    setShowExamConfig(true);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div key="loading" className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
          <div className="relative w-28 h-28 md:w-40 md:h-40 mb-8">
            <div className="absolute inset-0 bg-indigo-100 rounded-[2rem] animate-ping opacity-20"></div>
            <div className="absolute inset-2 bg-white rounded-[1.5rem] shadow-2xl flex items-center justify-center border-4 border-indigo-50">
               <BrainIcon className="w-10 h-10 md:w-16 md:h-16 text-indigo-600 animate-float" />
            </div>
          </div>
          <h3 className="text-xl md:text-3xl font-black text-slate-900 mb-3 px-4">{loadingMessage}</h3>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Akses Gratis Sedang Dioptimalkan</p>
        </div>
      );
    }

    switch (mode) {
      case AppMode.UPLOAD:
        return (
          <div key="upload" className="flex flex-col items-center justify-center min-h-full w-full p-4 md:p-8 animate-view-entry overflow-y-auto no-scrollbar">
            <div className="text-center mb-16 max-w-4xl">
              <h1 className="text-6xl md:text-9xl font-black bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-indigo-900 to-indigo-600 mb-4 tracking-tighter">RyuuLearn</h1>
              <p className="text-lg md:text-2xl text-slate-500 font-medium">Ubah dokumen menjadi penjelasan cerdas seketika.</p>
              <button onClick={() => setMode(AppMode.LIBRARY)} className="mt-6 px-6 py-2 bg-white rounded-full text-xs font-black uppercase tracking-widest border border-slate-200 shadow-sm hover:bg-slate-50 transition-all">Buka Perpustakaan</button>
            </div>
            <FileUpload onFileSelect={handleFileSelect} />
          </div>
        );

      case AppMode.DASHBOARD:
        return (
          <div key="dashboard" className="max-w-6xl mx-auto w-full h-full flex flex-col p-4 md:p-8 animate-view-entry overflow-y-auto no-scrollbar select-none">
            <div className="w-full bg-white rounded-[2rem] p-6 mb-8 shadow-xl border border-indigo-50 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg">
                {userStats.level}
              </div>
              <div className="flex-1 w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa Level {userStats.level}</span>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{userStats.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</span>
                </div>
                <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${((userStats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` }}></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              {[
                { label: 'Ringkasan', icon: BookIcon, color: 'indigo', action: () => handleGenerateExplanation('SUMMARY') },
                { label: 'Analisis', icon: BrainIcon, color: 'purple', action: () => handleGenerateExplanation('DEEP') },
                { label: 'Kartu Flash', icon: CardsIcon, color: 'orange', action: handleStartFlashcards },
                { label: 'Tutor', icon: MessageCircleIcon, color: 'pink', action: () => setMode(AppMode.CHAT) }
              ].map((item, i) => (
                <button key={i} onClick={item.action} className="group p-6 bg-white rounded-[2rem] border border-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col gap-6 active:scale-95">
                  <div className={`p-3 w-fit rounded-xl bg-${item.color}-50 text-${item.color}-600 pointer-events-none`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight pointer-events-none">{item.label}</h3>
                </button>
              ))}
            </div>

            <button 
              type="button"
              onClick={handleOpenExamConfig}
              className="w-full text-left relative flex flex-col lg:flex-row justify-between items-center bg-slate-900 p-8 md:p-12 rounded-[2.5rem] text-white gap-8 overflow-hidden group shadow-2xl active:scale-[0.98] transition-all hover:ring-8 hover:ring-indigo-500/10 focus:outline-none focus:ring-4 focus:ring-indigo-400"
            >
               <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-700"></div>
               
               <div className="text-center lg:text-left relative z-10 pointer-events-none flex-1">
                  <h3 className="text-2xl md:text-5xl font-black mb-3 tracking-tight">Simulasi Ujian Adaptif</h3>
                  <p className="text-sm md:text-xl text-slate-400 font-medium">Uji pemahaman Anda dengan soal cerdas yang dirancang khusus oleh AI.</p>
               </div>

               <div className="relative z-10 w-full lg:w-auto pointer-events-none">
                 <div className="w-full px-12 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-2xl group-hover:bg-indigo-500 transition-all text-center">
                  MULAI EVALUASI
                 </div>
               </div>
            </button>
            
            <button 
              onClick={() => { setFile(null); setMode(AppMode.UPLOAD); }}
              className="mt-12 mb-16 mx-auto text-slate-400 font-black hover:text-slate-600 transition-colors uppercase text-[10px] tracking-widest flex items-center gap-2 group active:scale-90"
            >
              <ChevronLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> GANTI MATERI BELAJAR
            </button>
          </div>
        );

      case AppMode.EXPLAIN_SUMMARY:
      case AppMode.EXPLAIN_DEEP:
        return (
          <div key="explain" className="max-w-5xl mx-auto h-full flex flex-col p-4 md:p-6 overflow-hidden animate-view-entry">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setMode(AppMode.DASHBOARD)} className="flex items-center gap-2 font-black text-slate-600 bg-white px-5 py-3 rounded-2xl shadow-sm active:scale-95">
                <ChevronLeftIcon className="w-5 h-5" /> Dashboard
              </button>
              <button onClick={handleSaveToLibrary} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg active:scale-95 transition-all text-xs">Simpan Offline</button>
            </div>
            <div className="glass-panel rounded-[2rem] p-6 md:p-12 overflow-y-auto no-scrollbar flex-1 shadow-2xl border border-white">
              <MarkdownRenderer content={content} />
            </div>
          </div>
        );

      case AppMode.FLASHCARDS: return <FlashcardGame cards={flashcards} onBack={() => setMode(AppMode.DASHBOARD)} />;
      case AppMode.EXAM: return <ExamMode questions={examQuestions} onBack={(score) => { awardXP(score * 5, "Ujian Selesai"); setMode(AppMode.DASHBOARD); }} />;
      case AppMode.CHAT: return <ChatInterface file={file!} onBack={() => setMode(AppMode.DASHBOARD)} />;
      case AppMode.LIBRARY: return <LibraryView onBack={() => setMode(AppMode.UPLOAD)} onLoadLesson={handleLoadFromLibrary} />;
      default: return null;
    }
  };

  return (
    <div className="h-full relative overflow-hidden flex flex-col">
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100000] px-8 py-4 rounded-full shadow-2xl animate-view-entry border backdrop-blur-xl ${
          notification.type === 'xp' ? 'bg-indigo-600 text-white border-indigo-500' : 
          notification.type === 'error' ? 'bg-red-600 text-white border-red-500' :
          notification.type === 'offline' ? 'bg-slate-700 text-white border-slate-600' : 'bg-green-600 text-white border-green-500'}`}>
           <span className="font-black text-sm uppercase tracking-widest">{notification.message}</span>
        </div>
      )}

      {showExamConfig && (
        <div className="fixed inset-0 z-[200000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl animate-view-entry border border-indigo-50">
            <h3 className="text-3xl font-black text-center mb-8 tracking-tight text-slate-900">Konfigurasi Ujian</h3>
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Tingkat Kesulitan</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button 
                      key={diff}
                      type="button"
                      onClick={() => setExamConfig(prev => ({ ...prev, difficulty: diff as any }))}
                      className={`py-4 rounded-xl font-bold border-2 transition-all ${examConfig.difficulty === diff ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-indigo-300'}`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Jumlah Soal</label>
                <div className="grid grid-cols-3 gap-3">
                  {[5, 10, 20].map((num) => (
                    <button 
                      key={num}
                      type="button"
                      onClick={() => setExamConfig(prev => ({ ...prev, count: num }))}
                      className={`py-4 rounded-xl font-bold border-2 transition-all ${examConfig.count === num ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-indigo-300'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button 
              type="button"
              onClick={handleStartExam} 
              className="w-full mt-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-indigo-100"
            >
              MULAI UJIAN SEKARANG
            </button>
            <button 
              type="button"
              onClick={() => setShowExamConfig(false)} 
              className="w-full mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-slate-50 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-purple-100/40 rounded-full blur-[120px]"></div>
      </div>
      <main className="flex-1 h-full relative overflow-hidden">{renderContent()}</main>
    </div>
  );
}

export default App;