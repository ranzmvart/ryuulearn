import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { CheckCircleIcon, XCircleIcon, ChevronLeftIcon, SparklesIcon, BrainIcon, RefreshIcon } from './Icons';
import MarkdownRenderer from './MarkdownRenderer';

interface FlashcardGameProps {
  cards: Flashcard[];
  onBack: (score: number, total: number) => void;
}

const FlashcardGame: React.FC<FlashcardGameProps> = ({ cards, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [shake, setShake] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  
  const [hasFailedCurrent, setHasFailedCurrent] = useState(false);

  const currentCard = cards[currentIndex];

  const handleOptionClick = (index: number) => {
    if (selectedOption !== null || isFlipped || animationClass) return;

    setSelectedOption(index);
    const isCorrect = index === currentCard.correctIndex;
    
    if (isCorrect) {
      if (!hasFailedCurrent) {
        setScore(score + 1);
      }
    } else {
      setHasFailedCurrent(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleRetry = () => {
    setSelectedOption(null);
    setShake(false);
  };

  const handleFlip = () => {
    if (selectedOption === null) return;
    setIsFlipped(true);
  };

  const handleNext = () => {
    if (animationClass) return;
    setAnimationClass('animate-slide-out-right');

    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setIsFlipped(false);
        setSelectedOption(null);
        setHasFailedCurrent(false);
        setCurrentIndex(currentIndex + 1);
        setAnimationClass('animate-slide-in-left');
        setTimeout(() => setAnimationClass(''), 400);
      } else {
        setGameCompleted(true);
      }
    }, 400);
  };

  if (gameCompleted) {
    const percentage = Math.round((score / cards.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 md:p-6 animate-fade-in bg-slate-50 overflow-y-auto no-scrollbar">
        <div className="glass-panel p-8 md:p-16 rounded-[3rem] md:rounded-[4rem] shadow-2xl text-center max-w-xl w-full border border-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          <div className="relative mb-8 md:mb-12">
            <div className="w-28 h-28 md:w-40 md:h-40 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto text-white text-3xl md:text-5xl font-black shadow-2xl animate-float">
              {percentage}%
            </div>
            <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-950 p-3 rounded-full shadow-lg">
              <SparklesIcon className="w-6 h-6 md:w-8 md:h-8" />
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            {percentage >= 80 ? 'Master!' : percentage >= 50 ? 'Hebat!' : 'Ayo Lagi!'}
          </h2>
          <p className="text-slate-500 mb-10 md:mb-16 font-medium text-base md:text-xl leading-relaxed">
            Kamu telah menguasai <span className="text-indigo-600 font-bold">{score} dari {cards.length}</span> tantangan dengan sempurna.
          </p>
          <button 
            onClick={() => onBack(score, cards.length)}
            className="w-full flex items-center justify-center gap-4 py-5 md:py-6 px-10 bg-slate-900 text-white rounded-[2rem] font-black text-lg md:text-xl shadow-2xl hover:bg-indigo-600 transition-all active:scale-95"
          >
            KLAIM XP <ChevronLeftIcon className="w-6 h-6 rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <div className="flex items-center gap-4 md:gap-8 mb-6 md:mb-10 shrink-0">
        <button onClick={() => onBack(score, cards.length)} className="p-3.5 md:p-5 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-90 transition-all">
          <ChevronLeftIcon className="w-5 h-5 md:w-6 md:h-6 text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex justify-between items-end mb-2.5">
            <span className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Flashcard Session</span>
            <span className="text-[10px] md:text-xs font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100">{currentIndex + 1} / {cards.length}</span>
          </div>
          <div className="flex gap-1.5 h-2.5">
            {cards.map((_, idx) => (
              <div key={idx} className={`flex-1 rounded-full transition-all duration-500 ${idx < currentIndex ? 'bg-indigo-500' : idx === currentIndex ? 'bg-indigo-200 animate-pulse' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className={`flex-1 relative perspective-1000 mb-6 md:mb-10 min-h-0 ${shake ? 'animate-shake' : ''} ${animationClass}`}>
        <div className={`relative w-full h-full transition-all duration-700 preserve-3d cursor-default ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
          {/* Front Side */}
          <div className="absolute inset-0 w-full h-full bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-slate-100 p-6 md:p-16 flex flex-col backface-hidden overflow-y-auto custom-scrollbar">
              <div className="flex justify-center mb-6 md:mb-10 shrink-0">
                <span className="px-5 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-indigo-100/50">Pertanyaan</span>
              </div>
              <div className="flex-1 flex flex-col justify-start">
                <div className="text-xl md:text-3xl font-bold text-slate-900 text-center leading-tight mb-8 md:mb-12">
                  <MarkdownRenderer content={currentCard.question} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 w-full mb-8">
                  {currentCard.options.map((option, idx) => {
                    const isCorrect = idx === currentCard.correctIndex;
                    const isSelected = selectedOption === idx;
                    let btnStyle = "relative p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] border-2 text-left transition-all duration-300 flex items-center gap-3 md:gap-4 overflow-hidden ";
                    let textStyle = "flex-1 text-sm md:text-lg leading-snug relative z-10 font-bold ";
                    
                    if (selectedOption === null) {
                      btnStyle += "border-slate-100 bg-slate-50 hover:border-indigo-400 hover:bg-white active:scale-[0.98]";
                      textStyle += "text-slate-700";
                    } else if (isCorrect) {
                      btnStyle += "border-green-500 bg-green-50 text-green-900 scale-[1.02] ring-4 ring-green-400/10";
                      textStyle += "text-green-900";
                    } else if (isSelected) {
                      btnStyle += "border-red-500 bg-red-50 text-red-900 ring-4 ring-red-400/10";
                      textStyle += "text-red-900";
                    } else {
                      btnStyle += "border-slate-100 bg-slate-50 text-slate-400";
                      textStyle += "text-slate-400";
                    }

                    return (
                      <button key={idx} onClick={() => handleOptionClick(idx)} disabled={selectedOption !== null} className={btnStyle}>
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-xs md:text-sm border-2 relative z-10 ${selectedOption === null ? 'bg-white text-slate-400' : isCorrect ? 'bg-green-500 text-white border-green-400' : isSelected ? 'bg-red-500 text-white border-red-400' : 'bg-white text-slate-300 border-slate-200'}`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <div className={textStyle}>
                          <MarkdownRenderer content={option} inline />
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedOption !== null && (
                  <div className="w-full animate-slide-up bg-slate-50 p-6 md:p-10 rounded-[2rem] border border-slate-100 text-left mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <BrainIcon className={`w-6 h-6 ${selectedOption === currentCard.correctIndex ? 'text-green-500' : 'text-red-400'}`} />
                      <h5 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">Analisis Ryuu</h5>
                    </div>
                    <div className="text-sm md:text-xl text-slate-700 font-medium leading-relaxed mb-8">
                      <MarkdownRenderer content={selectedOption === currentCard.correctIndex ? "**Bagus!** Kamu benar." : "**Waduh.** Masih kurang tepat."} />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      {selectedOption !== currentCard.correctIndex && (
                        <button 
                          onClick={handleRetry} 
                          className="flex-1 py-4 md:py-5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black text-sm md:text-base shadow-sm flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
                        >
                          COBA LAGI <RefreshIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={handleFlip} 
                        className={`${selectedOption !== currentCard.correctIndex ? 'flex-[1.5]' : 'w-full'} py-4 md:py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm md:text-base shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95`}
                      >
                        {selectedOption === currentCard.correctIndex ? 'PEMBAHASAN' : 'LIHAT ANALISIS'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
          </div>

          {/* Back Side */}
          <div className="absolute inset-0 w-full h-full bg-slate-900 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl p-6 md:p-16 flex flex-col backface-hidden rotate-y-180 overflow-hidden text-white" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
              <div className="flex items-center gap-5 md:gap-8 mb-10 md:mb-16">
                <div className={`w-14 h-14 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center flex-shrink-0 ${selectedOption === currentCard.correctIndex ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {selectedOption === currentCard.correctIndex ? <CheckCircleIcon className="w-8 h-8 md:w-14 md:h-14" /> : <XCircleIcon className="w-8 h-8 md:w-14 md:h-14" />}
                </div>
                <div>
                  <h4 className="text-indigo-400 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-2">Evaluasi Akhir</h4>
                  <p className="text-2xl md:text-5xl font-black">{selectedOption === currentCard.correctIndex ? 'Sempurna!' : 'Coba Lagi'}</p>
                </div>
              </div>
              <div className="space-y-12">
                <section>
                  <h5 className="text-indigo-300/40 text-[10px] md:text-xs font-black uppercase tracking-widest mb-6">Jawaban Yang Benar</h5>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10">
                    <div className="text-xl md:text-3xl font-bold text-white"><MarkdownRenderer content={currentCard.options[currentCard.correctIndex]} inline /></div>
                  </div>
                </section>
                <section>
                  <div className="flex items-center gap-4 mb-6"><BrainIcon className="w-6 h-6 text-indigo-400" /><h5 className="text-indigo-300/40 text-[10px] md:text-xs font-black uppercase tracking-widest">Penjelasan Mendalam</h5></div>
                  <div className="text-indigo-50/90 leading-relaxed text-base md:text-2xl font-medium"><MarkdownRenderer content={currentCard.explanation} /></div>
                </section>
              </div>
            </div>
            <button onClick={handleNext} className="mt-8 shrink-0 w-full py-5 md:py-7 bg-indigo-600 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-2xl flex items-center justify-center gap-4 shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all">
              {currentIndex < cards.length - 1 ? <>LANJUT <ChevronLeftIcon className="w-8 h-8 rotate-180" /></> : <>SELESAI <SparklesIcon className="w-8 h-8" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardGame;