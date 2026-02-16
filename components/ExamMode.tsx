import React, { useState, useEffect, useMemo } from 'react';
import { ExamQuestion } from '../types';
import { CheckCircleIcon, XCircleIcon, RefreshIcon, ChevronLeftIcon, TrophyIcon, BrainIcon, SparklesIcon } from './Icons';
import MarkdownRenderer from './MarkdownRenderer';

interface ExamModeProps {
  questions: ExamQuestion[];
  onBack: (score: number) => void;
}

const ExamMode: React.FC<ExamModeProps> = ({ questions, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(questions.length * 120);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    let timer: number;
    if (isTimerRunning && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleFinalSubmit();
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, isSubmitted]);

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = (optionIndex: number) => {
    if (isSubmitted) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) score++;
    });
    return Math.round((score / questions.length) * 100);
  };

  const handleFinalSubmit = () => {
    setIsTimerRunning(false);
    setShowConfirmSubmit(false);
    setIsSubmitted(true);
    setCurrentIndex(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const topicAnalysis = useMemo(() => {
    const topics: Record<string, { total: number, correct: number }> = {};
    questions.forEach((q, idx) => {
      if (!topics[q.topic]) topics[q.topic] = { total: 0, correct: 0 };
      topics[q.topic].total++;
      if (selectedAnswers[idx] === q.correctIndex) topics[q.topic].correct++;
    });
    return Object.entries(topics).map(([name, data]) => ({
      name,
      percentage: Math.round((data.correct / data.total) * 100),
      label: `${data.correct}/${data.total}`
    }));
  }, [questions, selectedAnswers]);

  if (isSubmitted) {
    const finalScore = calculateScore();
    const correctCount = questions.filter((q, idx) => selectedAnswers[idx] === q.correctIndex).length;

    return (
      <div className="max-w-6xl mx-auto h-full flex flex-col lg:flex-row gap-6 p-4 md:p-8 overflow-hidden animate-view-entry">
        <div className="lg:w-80 flex-shrink-0 space-y-4 md:space-y-6 overflow-y-auto no-scrollbar pb-6 lg:pb-0">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
             <TrophyIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-float" />
             <h2 className="text-xl font-black text-slate-800">Hasil Evaluasi</h2>
             <div className="text-7xl font-black bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-purple-700 py-4">
               {finalScore}%
             </div>
             <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6">
               {correctCount} dari {questions.length} Benar
             </p>
             <button 
              onClick={() => onBack(finalScore)} 
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-600 transition-all active:scale-95"
             >
               SIMPAN & KLAIM XP
             </button>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">Analisis Penguasaan</h3>
            <div className="space-y-4">
              {topicAnalysis.map((topic, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">{topic.name}</span>
                    <span className="text-[9px] font-black text-indigo-600">{topic.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${topic.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border border-white overflow-y-auto custom-scrollbar">
           <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
              <div>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg">Pembahasan Soal</span>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">Soal Nomor {currentIndex + 1}</h3>
              </div>
           </div>

           <div className="mb-10 text-xl font-medium leading-relaxed text-slate-900">
             <MarkdownRenderer content={currentQuestion.question} />
           </div>

           <div className="grid gap-4 mb-10">
              {currentQuestion.options.map((opt, idx) => {
                const isCorrect = currentQuestion.correctIndex === idx;
                const isUserChoice = selectedAnswers[currentIndex] === idx;
                let cardStyle = "p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ";
                let textStyle = "flex-1 font-bold text-sm md:text-base ";

                if (isCorrect) {
                  cardStyle += "border-green-500 bg-green-50 text-green-900 shadow-sm";
                  textStyle += "text-green-900";
                } else if (isUserChoice && !isCorrect) {
                  cardStyle += "border-red-500 bg-red-50 text-red-900";
                  textStyle += "text-red-900";
                } else {
                  cardStyle += "border-slate-200 bg-white text-slate-700";
                  textStyle += "text-slate-700";
                }

                return (
                  <div key={idx} className={cardStyle}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm border-2 ${isCorrect ? 'bg-green-500 text-white border-green-400' : isUserChoice ? 'bg-red-500 text-white border-red-400' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className={textStyle}>
                      <MarkdownRenderer content={opt} inline />
                    </div>
                  </div>
                )
              })}
           </div>

           <div className="bg-slate-900 rounded-[2rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-10"><BrainIcon className="w-24 h-24" /></div>
             <h4 className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Analisis Tutor Ryuu</h4>
             <div className="text-slate-200 text-base md:text-xl leading-relaxed font-medium relative z-10">
               <MarkdownRenderer content={currentQuestion.explanation} />
             </div>
           </div>

           <div className="flex gap-4 mt-12 sticky bottom-0 bg-white/95 backdrop-blur-md py-4 border-t border-slate-50">
             <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm disabled:opacity-30 active:scale-95 transition-all">KEMBALI</button>
             <button disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex(prev => prev + 1)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">LANJUT</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col p-4 md:p-8 overflow-hidden animate-view-entry relative">
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-fade-in">
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border border-indigo-50">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><SparklesIcon className="w-10 h-10 text-indigo-600" /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">Selesaikan Ujian?</h3>
            <p className="text-sm text-slate-500 font-medium mb-10 leading-relaxed">Analisis Ryuu akan mengoreksi hasil belajar kamu secara instan.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleFinalSubmit} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">YA, KUMPULKAN</button>
              <button onClick={() => setShowConfirmSubmit(false)} className="w-full py-4 text-slate-400 font-bold text-sm uppercase tracking-widest">BELUM, LANJUTKAN</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-lg mb-6 border border-slate-50 relative z-20">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => onBack(0)} className="p-3 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all">
              <XCircleIcon className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-black text-slate-900 text-xs md:text-sm uppercase tracking-widest">Simulasi Ujian</h2>
              <p className="text-[10px] font-bold text-indigo-500">Soal {currentIndex + 1} dari {questions.length}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm md:text-base shadow-inner border ${timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>
            <span className="text-[10px] opacity-40 mr-1 uppercase">Sisa Waktu</span>
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
           <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-500 ease-out" 
            style={{ width: `${((selectedAnswers.filter(a => a !== null).length) / questions.length) * 100}%` }}
           />
        </div>
      </div>

      <div className="flex-1 bg-white p-6 md:p-14 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-white flex flex-col overflow-hidden relative">
        <div className="relative z-10 flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar no-scrollbar pr-1">
          <div className="mb-6 flex items-center justify-between">
            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-indigo-100">
              {currentQuestion.topic}
            </span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tingkat: {currentQuestion.difficulty}</span>
          </div>
          <div className="mb-12 text-xl md:text-2xl font-bold leading-relaxed text-slate-900">
            <MarkdownRenderer content={currentQuestion.question} />
          </div>
          <div className="grid gap-4 mt-auto">
            {currentQuestion.options.map((option, idx) => (
              <button 
                key={idx} 
                onClick={() => handleOptionSelect(idx)} 
                className={`p-5 md:p-6 rounded-[1.5rem] text-left border-2 transition-all flex items-center gap-5 relative group ${
                  selectedAnswers[currentIndex] === idx 
                    ? 'border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100 scale-[1.01]' 
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-sm md:text-base border-2 transition-colors ${
                  selectedAnswers[currentIndex] === idx 
                    ? 'bg-indigo-600 text-white border-indigo-400' 
                    : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:border-indigo-300 group-hover:text-indigo-600'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <div className={`text-base md:text-lg font-bold flex-1 ${
                  selectedAnswers[currentIndex] === idx ? 'text-indigo-950' : 'text-slate-700 group-hover:text-slate-900'
                }`}>
                  <MarkdownRenderer content={option} inline />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center gap-4 relative z-10">
         <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="px-6 py-4 rounded-2xl font-black text-slate-500 disabled:opacity-20 text-[10px] uppercase tracking-widest hover:text-slate-700 transition-colors">KEMBALI</button>
         {currentIndex === questions.length - 1 ? (
           <button onClick={() => setShowConfirmSubmit(true)} className="flex-1 py-5 px-8 rounded-[1.5rem] bg-slate-900 text-white font-black shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all uppercase tracking-[0.2em] text-sm active:scale-95">KUMPULKAN UJIAN</button>
         ) : (
           <button onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))} className="flex-1 py-5 px-8 rounded-[1.5rem] bg-white text-indigo-600 font-black shadow-xl border border-indigo-200 uppercase tracking-[0.2em] text-sm hover:shadow-2xl transition-all active:scale-95">SOAL SELANJUTNYA</button>
         )}
      </div>
    </div>
  );
};

export default ExamMode;