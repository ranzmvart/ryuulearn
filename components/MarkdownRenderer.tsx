import React from 'react';
import katex from 'katex';

interface MarkdownRendererProps {
  content: string;
  inline?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, inline = false }) => {
  
  const renderMath = (text: string, isBlock: boolean = false) => {
    try {
      return katex.renderToString(text, {
        displayMode: isBlock,
        throwOnError: false,
        strict: false,
        trust: true
      });
    } catch (e) {
      console.error("KaTeX error", e);
      return text;
    }
  };

  const processInlineFormatting = (text: string) => {
    // 1. Process Math (Inline $...$)
    let result = text.replace(/\$([^\$\n]+)\$/g, (_, math) => renderMath(math, false));
    
    // 2. Bold **...** - Menggunakan text-current agar mengikuti warna pilihan aktif
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-current">$1</strong>');
    
    // 3. Italic *...*
    result = result.replace(/\*(.*?)\*/g, '<em class="italic opacity-90">$1</em>');
    
    // 4. Inline Code `...`
    result = result.replace(/`([^`]+)`/g, '<code class="bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded text-sm font-mono border border-indigo-500/20">$1</code>');
    
    return result;
  };

  const parseContent = () => {
    const blockMathParts: string[] = [];
    let processedContent = content.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const idx = blockMathParts.length;
      blockMathParts.push(renderMath(math, true));
      return `\n__BLOCK_MATH_${idx}__\n`;
    });

    const lines = processedContent.split('\n');
    const elements: React.ReactNode[] = [];
    
    let isCodeBlock = false;
    let codeBuffer: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        if (isCodeBlock) {
          elements.push(
            <pre key={`code-${idx}`} className="my-6 p-5 bg-slate-900 text-indigo-300 rounded-2xl font-mono text-xs md:text-sm overflow-x-auto shadow-inner border border-slate-800">
              <code>{codeBuffer.join('\n')}</code>
            </pre>
          );
          codeBuffer = [];
          isCodeBlock = false;
        } else {
          isCodeBlock = true;
        }
        return;
      }

      if (isCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (trimmed.includes('__BLOCK_MATH_')) {
        const match = trimmed.match(/__BLOCK_MATH_(\d+)__/);
        if (match) {
          const partIdx = parseInt(match[1]);
          elements.push(
            <div key={`math-block-${idx}`} className="katex-display-container my-6 w-full overflow-x-auto no-scrollbar flex justify-center text-current" 
                 dangerouslySetInnerHTML={{ __html: blockMathParts[partIdx] }} />
          );
          return;
        }
      }

      if (trimmed.startsWith('# ') && !inline) {
        elements.push(<h1 key={idx} className="text-2xl md:text-4xl font-black text-slate-900 mb-6 mt-8 tracking-tighter">{processInlineFormatting(trimmed.substring(2))}</h1>);
      } else if (trimmed.startsWith('## ') && !inline) {
        elements.push(<h2 key={idx} className="text-xl md:text-2xl font-bold text-indigo-900 mb-4 mt-6 border-l-4 border-indigo-500 pl-4">{processInlineFormatting(trimmed.substring(3))}</h2>);
      } else if (trimmed.length > 0) {
        elements.push(
          <div key={idx} className={`${inline ? 'inline' : 'mb-4'} leading-relaxed text-inherit`} dangerouslySetInnerHTML={{ 
            __html: processInlineFormatting(trimmed) 
          }} />
        );
      }
    });

    return elements;
  };

  return (
    <div className={`markdown-content ${inline ? 'inline' : 'block'} break-words w-full text-current`}>
      {parseContent()}
      <style>{`
        .katex { font-size: 1.05em; color: inherit; }
        .katex-display { margin: 0.5em 0; overflow-x: auto; padding: 5px 0; color: inherit; }
        .markdown-content strong { color: inherit; }
      `}</style>
    </div>
  );
};

export default MarkdownRenderer;