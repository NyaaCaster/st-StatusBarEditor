import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#161b22] border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-[#0d1117] shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-blue-400">🕮</span> 使用说明
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="prose prose-invert prose-sm max-w-none prose-headings:border-b prose-headings:border-slate-800 prose-headings:pb-2 prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-img:rounded-lg prose-img:border prose-img:border-slate-700 prose-img:shadow-lg">
             <ReactMarkdown 
               remarkPlugins={[remarkGfm]} 
               components={{
                 // Custom renderer to ensure images fit
                 img: ({node, ...props}) => (
                   <span className="block my-4">
                     <img {...props} className="max-h-[500px] object-contain mx-auto rounded-lg border border-slate-700 bg-[#0d1117]" />
                   </span>
                 )
               }}
             >
               {content}
             </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-[#0d1117] flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};