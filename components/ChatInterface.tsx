import React, { useState, useRef, useEffect } from 'react';
import { UploadedFile, ChatMessage } from '../types';
import { chatWithDocument } from '../services/gemini';
import { SendIcon, ChevronLeftIcon, BrainIcon, PaperclipIcon, XCircleIcon } from './Icons';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatInterfaceProps {
  file: UploadedFile;
  onBack: () => void;
  initialQuery?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ file, onBack, initialQuery }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Halo! Tutor RyuuLearn siap membantu diskusi materi "${file.name}". Ada kesulitan soal hitungan atau butuh analogi baru?`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTriggeredInitial = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialQuery && !hasTriggeredInitial.current) {
      hasTriggeredInitial.current = true;
      handleSend(undefined, initialQuery);
    }
  }, [initialQuery]);

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const base64 = (ev.target.result as string).split(',')[1];
          setAttachment(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e?: React.FormEvent, directText?: string) => {
    e?.preventDefault();
    const messageText = directText || input;
    if ((!messageText.trim() && !attachment) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: Date.now(),
      attachment: attachment || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    if (!directText) setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const historyForApi = messages.map(m => ({ role: m.role, text: m.text }));
      const responseText = await chatWithDocument(file.data, file.type, historyForApi, userMsg.text, userMsg.attachment);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'model',
        text: "Koneksi terputus. Mohon coba lagi.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto bg-white md:bg-slate-50/50 md:rounded-[3rem] md:shadow-2xl overflow-hidden relative md:border md:border-white">
      {/* Header Chat Responsif */}
      <div className="p-4 md:p-6 border-b border-indigo-50 flex items-center bg-white/95 backdrop-blur-xl z-20">
        <button onClick={onBack} className="p-2 md:p-3 hover:bg-slate-100 rounded-xl mr-3 md:mr-4 transition-colors">
          <ChevronLeftIcon className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm md:text-xl tracking-tight">
            <div className="p-1.5 md:p-2 bg-indigo-600 rounded-lg md:rounded-xl text-white">
               <BrainIcon className="w-3 h-3 md:w-4 md:h-4" />
            </div>
            Tutor Ryuu
          </h3>
          <p className="text-[9px] md:text-xs font-bold text-slate-400 truncate mt-0.5">
            Materi: {file.name}
          </p>
        </div>
      </div>

      {/* Message Area Responsif */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 custom-scrollbar bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] [background-size:15px_15px]">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex w-full animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`
                max-w-[85%] md:max-w-[80%] rounded-2xl md:rounded-3xl p-4 md:p-7 shadow-lg relative
                ${msg.role === 'user' 
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-tr-none shadow-indigo-100' 
                  : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-slate-100'
                }
              `}
            >
              {msg.attachment && (
                <div className="mb-3 rounded-xl overflow-hidden border border-white/20">
                  <img src={`data:image/jpeg;base64,${msg.attachment}`} className="max-h-60 object-contain w-full" alt="lampiran" />
                </div>
              )}
              <div className={`text-sm md:text-lg leading-relaxed font-medium ${msg.role === 'user' ? 'text-indigo-50' : 'text-slate-800'}`}>
                <MarkdownRenderer content={msg.text} />
              </div>
              <div className={`text-[8px] md:text-[10px] mt-2 font-bold opacity-30 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-indigo-50 rounded-2xl rounded-tl-none px-4 py-2 shadow-sm flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              </div>
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Ryuu Menjawab</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area Responsif */}
      <div className="p-3 md:p-8 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] relative z-20">
        {attachment && (
          <div className="flex items-center gap-3 mb-3 bg-indigo-50 p-2 rounded-xl w-fit border border-indigo-100 animate-slide-up">
            <img src={`data:image/jpeg;base64,${attachment}`} className="w-10 h-10 rounded-lg object-cover" alt="prev" />
            <button onClick={() => setAttachment(null)} className="text-[10px] text-red-500 font-bold p-1">
              <XCircleIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <form onSubmit={(e) => handleSend(e)} className="relative flex items-center gap-2 md:gap-3">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 md:p-4 bg-slate-50 text-slate-500 rounded-xl md:rounded-2xl hover:bg-indigo-50 transition-all flex-shrink-0 active:scale-95"
          >
            <PaperclipIcon className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAttachmentSelect} />
          
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan materi..."
            className="flex-1 py-3.5 md:py-4 px-4 md:px-6 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-indigo-600 rounded-xl md:rounded-2xl outline-none transition-all font-bold text-sm md:text-base text-slate-800 placeholder:text-slate-400"
          />
          
          <button 
            type="submit" 
            disabled={(!input.trim() && !attachment) || isLoading}
            className="p-3.5 md:p-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl hover:bg-indigo-700 disabled:opacity-20 transition-all shadow-xl shadow-indigo-100 active:scale-95 flex-shrink-0"
          >
            <SendIcon className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;