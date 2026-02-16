import React, { useState, useEffect } from 'react';
import { getLibrary, deleteLessonFromLibrary } from '../services/storage.ts';
import { SavedLesson } from '../types.ts';
import { ChevronLeftIcon, BookIcon, BrainIcon, CardsIcon, XCircleIcon, SparklesIcon } from './Icons.tsx';

interface LibraryViewProps {
  onBack: () => void;
  onLoadLesson: (lesson: SavedLesson) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ onBack, onLoadLesson }) => {
  const [library, setLibrary] = useState<SavedLesson[]>([]);

  useEffect(() => {
    setLibrary(getLibrary());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteLessonFromLibrary(id);
    setLibrary(getLibrary());
  };

  return (
    <div className="max-w-6xl mx-auto w-full h-full flex flex-col p-4 md:p-8 animate-view-entry overflow-hidden">
      <div className="flex items-center justify-between mb-10">
        <button onClick={onBack} className="flex items-center gap-2 font-black text-slate-600 bg-white px-5 py-3 rounded-2xl shadow-sm hover:bg-slate-50 transition-all">
          <ChevronLeftIcon className="w-5 h-5" /> Kembali
        </button>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <BookIcon className="w-8 h-8 text-indigo-600" /> Perpustakaan Offline
        </h2>
        <div className="w-32 hidden md:block"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {library.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200">
             <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 text-indigo-300">
                <BookIcon className="w-12 h-12" />
             </div>
             <h3 className="text-2xl font-black text-slate-800 mb-2">Perpustakaan Kosong</h3>
             <p className="text-slate-500 max-w-sm">Materi yang Anda simpan akan muncul di sini dan dapat diakses tanpa internet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {library.sort((a, b) => b.timestamp - a.timestamp).map((lesson) => (
              <div 
                key={lesson.id}
                onClick={() => onLoadLesson(lesson)}
                className="group bg-white rounded-[2.5rem] p-8 shadow-xl border border-white hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden active:scale-95"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl bg-indigo-50 text-indigo-600`}>
                    <BookIcon className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, lesson.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <XCircleIcon className="w-6 h-6" />
                  </button>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 mb-2 line-clamp-2 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {lesson.name}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                  Disimpan: {new Date(lesson.timestamp).toLocaleDateString()}
                </p>

                <div className="flex gap-2">
                   {lesson.summary && <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-green-100">Ringkasan</span>}
                   {lesson.deepAnalysis && <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-purple-100">Analisis</span>}
                   {lesson.flashcards && <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-orange-100">Flashcards</span>}
                </div>

                <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <SparklesIcon className="w-20 h-20 text-indigo-900" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryView;