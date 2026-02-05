import React, { useEffect, useRef } from 'react';
import { LogEntry, LogType } from '../types';

interface LoggerProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const Logger: React.FC<LoggerProps> = ({ logs, onClear }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: LogType) => {
    switch (type) {
      case 'request': return 'text-blue-400';
      case 'response': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-slate-500';
      default: return 'text-slate-300';
    }
  };

  const getLogLabel = (type: LogType) => {
    switch (type) {
      case 'request': return '>>> REQUEST';
      case 'response': return '<<< RESPONSE';
      case 'error': return '!!! ERROR';
      case 'info': return '--- INFO';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#111]">
        <span className="text-slate-500 uppercase tracking-wider font-bold text-[10px]">Console Output</span>
        <button onClick={onClear} className="text-slate-600 hover:text-slate-200 transition-colors" title="Clear Logs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {logs.length === 0 && (
          <div className="text-slate-700 text-center italic mt-10">Waiting for LLM interaction...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex flex-col gap-1 border-b border-slate-800/40 pb-4 last:border-0 last:pb-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`flex items-center gap-2 font-bold ${getLogColor(log.type)}`}>
              <span className="opacity-50 text-[10px] font-normal">{log.timestamp.toLocaleTimeString()}</span>
              <span>{getLogLabel(log.type)}</span>
            </div>
            <div className="relative group">
                <pre className="whitespace-pre-wrap break-all text-slate-400 pl-3 border-l-2 border-slate-800 ml-1 font-mono text-[11px] leading-relaxed max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {log.content}
                </pre>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
