
import React, { useCallback, useState } from 'react';
import { UploadedFile } from '../types';
// Fixed: Added missing SparklesIcon import to resolve "Cannot find name 'SparklesIcon'" error.
import { UploadIcon, PenToolIcon, SparklesIcon } from './Icons';

interface FileUploadProps {
  onFileSelect: (file: UploadedFile) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'text'>('upload');
  const [textContent, setTextContent] = useState('');

  const processFile = (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError("Mohon upload file PDF atau Gambar.");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran file terlalu besar (Maks 10MB).");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64Data = (e.target.result as string).split(',')[1];
        onFileSelect({
          name: file.name,
          type: file.type,
          data: base64Data
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (mode === 'text') setMode('upload');
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleTextSubmit = () => {
    if (!textContent.trim()) {
      setError("Mohon isi materi terlebih dahulu.");
      return;
    }
    setError(null);
    const base64Data = btoa(unescape(encodeURIComponent(textContent)));
    onFileSelect({
      name: 'Catatan Manual',
      type: 'text/plain',
      data: base64Data
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Tabs Responsif */}
      <div className="flex justify-center mb-6 bg-white/60 p-1 rounded-2xl w-full sm:w-fit mx-auto backdrop-blur-md border border-slate-200">
        <button
          onClick={() => setMode('upload')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs md:text-sm font-black transition-all ${
            mode === 'upload' 
              ? 'bg-white text-indigo-600 shadow-md' 
              : 'text-slate-500'
          }`}
        >
          <UploadIcon className="w-4 h-4" />
          Upload
        </button>
        <button
          onClick={() => setMode('text')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs md:text-sm font-black transition-all ${
            mode === 'text' 
              ? 'bg-white text-indigo-600 shadow-md' 
              : 'text-slate-500'
          }`}
        >
          <PenToolIcon className="w-4 h-4" />
          Ketik
        </button>
      </div>

      <div className="relative min-h-[260px] md:min-h-[320px]">
        {mode === 'upload' ? (
          <div 
            className={`
              h-full min-h-[260px] md:min-h-[320px] flex flex-col items-center justify-center
              border-2 border-dashed rounded-[2rem] p-8 md:p-12 text-center transition-all duration-300 bg-white/50
              ${isDragging 
                ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
                : 'border-slate-300 hover:border-indigo-400 hover:bg-white/80'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className={`p-4 rounded-full bg-indigo-100 text-indigo-600 mb-2 ${isDragging ? 'animate-bounce' : ''}`}>
                <UploadIcon className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-700">
                Materi Belajar
              </h3>
              <p className="text-xs md:text-sm text-slate-400 max-w-[200px] md:max-w-xs mx-auto leading-relaxed">
                Tap untuk pilih file PDF atau gambar materi Anda.
              </p>
              
              <label className="mt-4 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black text-xs md:text-sm cursor-pointer transition-all shadow-xl shadow-indigo-100 active:scale-95">
                PILIH FILE
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,image/*" 
                  onChange={handleInputChange} 
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="h-full bg-white rounded-[2rem] p-5 md:p-6 shadow-xl border border-slate-100 flex flex-col min-h-[260px] md:min-h-[320px]">
            <textarea 
              className="flex-1 w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none resize-none text-slate-700 text-sm md:text-base font-medium mb-4"
              placeholder="Tempel materi atau catatan di sini..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />
            <button 
              onClick={handleTextSubmit}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs md:text-sm transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest"
            >
              <SparklesIcon className="w-4 h-4" />
              Mulai Belajar
            </button>
          </div>
        )}

        {error && (
          <div className="absolute -bottom-14 left-0 right-0 text-center animate-slide-up">
            <span className="inline-block text-red-500 text-[10px] md:text-xs font-black bg-red-50 px-4 py-2 rounded-full border border-red-100 uppercase tracking-widest">
              {error}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
