import React, { useState } from 'react';
import { copyToClipboard } from '../utils/parser';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  className?: string;
  allowCopy?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, className = '', allowCopy = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col bg-[#1e1e1e] group ${className}`}>
      <textarea
        className="w-full h-full p-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] leading-relaxed resize-none focus:outline-none border-none selection:bg-blue-500/30 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
      />
      
      {allowCopy && (
        <button
          onClick={handleCopy}
          className={`
            absolute top-3 right-3 z-10 
            flex items-center gap-1.5 px-3 py-1.5 
            rounded-md border text-xs font-medium transition-all duration-200 backdrop-blur-sm
            ${copied 
              ? 'bg-green-900/30 border-green-700/50 text-green-400' 
              : 'bg-[#252526]/80 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 opacity-0 group-hover:opacity-100 focus:opacity-100'}
          `}
          title="复制内容"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              已复制
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              复制
            </>
          )}
        </button>
      )}

      <div className="absolute bottom-0 right-0 p-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-slate-500 bg-[#1e1e1e]/80 px-2 py-1 rounded">Editor</span>
      </div>
    </div>
  );
};