import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from './components/Button';
import { CodeEditor } from './components/CodeEditor';
import { Logger } from './components/Logger';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { HelpModal } from './components/HelpModal';
import { parseAndRender, blobToBase64 } from './utils/parser';
import { generateInspiration, modifyHtmlTemplate, generateTemplateFromData, convertRawTextToCharData } from './services/geminiService';
import { EditorTab, LoadingState, LogEntry, LogType } from './types';
import { DEFAULT_CHAR_DATA, DEFAULT_HTML, DEFAULT_REGEX, DEFAULT_INPUT_TEXT } from './constants';

const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: 'input', label: '1. 数据示例' },
  { id: 'data', label: '2. 世界书模版' },
  { id: 'regex', label: '3. 正则表达式' },
  { id: 'html', label: '4. 状态栏代码' },
];

const RIGHT_TABS: { id: 'preview' | 'logs'; label: string }[] = [
  { id: 'preview', label: '实时预览' },
  { id: 'logs', label: '运行日志' },
];

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<EditorTab>('input');
  const [activeRightTab, setActiveRightTab] = useState<'preview' | 'logs'>('preview');
  
  const [inputText, setInputText] = useState<string>(DEFAULT_INPUT_TEXT);
  const [charData, setCharData] = useState<string>(DEFAULT_CHAR_DATA);
  const [htmlTemplate, setHtmlTemplate] = useState<string>(DEFAULT_HTML);
  const [regexPattern, setRegexPattern] = useState<string>(DEFAULT_REGEX);
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<{data: string, mimeType: string} | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  
  // Modal State
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [readmeContent, setReadmeContent] = useState('');

  // Logging
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    // Fetch README.md content
    fetch('/README.md')
      .then(res => {
        if (res.ok) return res.text();
        throw new Error('Failed to load README');
      })
      .then(text => setReadmeContent(text))
      .catch(err => console.error('Error fetching help:', err));
  }, []);

  // --- Helpers ---
  const addLog = (content: string, type: LogType) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      content
    }]);
    if (type === 'request' || type === 'error') {
      setActiveRightTab('logs');
    }
  };

  const clearLogs = () => setLogs([]);

  // --- Derived State (Memoized) ---
  const parseResult = useMemo(() => {
    return parseAndRender(charData, regexPattern, htmlTemplate);
  }, [charData, regexPattern, htmlTemplate]);

  const previewHtml = useMemo(() => {
    const html = parseResult.renderedHtml;
    // Common styles for the preview window to center the content
    // We use !important for background to ensure transparency works over the checkerboard pattern
    const baseStyle = "background: transparent !important; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; overflow: auto;";

    // Inject into body if possible, otherwise wrap
    if (html.toLowerCase().includes('<body')) {
      return html.replace(/<body([^>]*)>/i, (match, attrs) => {
         // If style attribute exists, append our base styles
         if (/style=['"]/.test(attrs)) {
             return `<body${attrs.replace(/(style=['"])([^'"]+)(['"])/i, `$1$2; ${baseStyle}$3`)}>`;
         }
         // Otherwise just add the style attribute
         return `<body${attrs} style="${baseStyle}">`;
      });
    } else {
      return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="${baseStyle}">
          ${html}
        </body>
        </html>
      `;
    }
  }, [parseResult.renderedHtml]);

  // --- Handlers ---

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await blobToBase64(file);
      setSelectedImage({
        data: base64,
        mimeType: file.type
      });
      addLog(`Image selected: ${file.name}`, 'info');
    } catch (err) {
      addLog(`Failed to process image: ${err}`, 'error');
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAiAction = async () => {
    if (loadingState === LoadingState.LOADING) return;
    setLoadingState(LoadingState.LOADING);
    
    try {
      if (activeTab === 'input') {
        // Tab 1: Format Text to Data
        const result = await convertRawTextToCharData(inputText, charData, addLog);
        setCharData(result);
        setActiveTab('data'); // Move to next step
      } 
      else if (activeTab === 'data') {
        // Tab 2: Generate Regex & HTML from Data
        const { regex, html } = await generateTemplateFromData(charData, addLog);
        setRegexPattern(regex);
        setHtmlTemplate(html);
        setActiveTab('html'); // Skip to HTML view to see result, usually regex is intermediate
        setActiveRightTab('preview');
      }
      else if (activeTab === 'html') {
        // Tab 4: Design/Modify HTML
        if (selectedImage || (aiPrompt && aiPrompt.trim().length > 0)) {
           // Modification mode
           const newHtml = await modifyHtmlTemplate(htmlTemplate, aiPrompt, selectedImage || undefined, addLog);
           setHtmlTemplate(newHtml);
           setAiPrompt('');
           handleClearImage();
        } else {
           // Inspiration mode (New Design)
           const keys = Object.keys(parseResult.extractedVariables);
           if (keys.length === 0) {
             addLog("Warning: No variables found in current data/regex to use for generation.", 'info');
           }
           const newHtml = await generateInspiration(keys.length > 0 ? keys : ['Name', 'HP', 'Level'], addLog);
           setHtmlTemplate(newHtml);
        }
      } 
      else {
        addLog("Gemini action not available for this tab currently.", 'info');
      }
    } catch (e: any) {
      addLog(`Error: ${e.message}`, 'error');
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  const getAiButtonLabel = () => {
    if (loadingState === LoadingState.LOADING) return '生成中...';
    switch (activeTab) {
      case 'input': return '格式化为世界书数据 (Data)';
      case 'data': return '生成正则与HTML模版';
      case 'regex': return '在此页暂无AI操作';
      case 'html': 
        if (selectedImage) return '参考图片修改代码';
        if (aiPrompt) return '根据指令修改代码';
        return '随机生成全新设计 (Inspiration)';
      default: return 'Gemini 生成';
    }
  };

  const isAiDisabled = loadingState === LoadingState.LOADING || activeTab === 'regex';

  // --- Render ---
  return (
    <div className="h-full flex flex-col bg-[#0f1117] text-slate-300">
      
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center px-6 bg-[#161b22] shrink-0 justify-between">
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
            <span className="text-blue-500">❖</span>
            SillyTavern 状态栏编辑器
          </div>
          <Button variant="primary" className="!py-1 !px-3 text-xs shadow-blue-500/20" onClick={() => setIsHelpOpen(true)}>
             🕮 使用说明
           </Button>
        </div>
        
        <div className="flex items-center gap-4">
           <Button variant="primary" className="!py-1 !px-3 text-xs shadow-blue-500/20" onClick={() => setIsApiSettingsOpen(true)}>
             🔌 API 设置
           </Button>
           <div className="text-xs text-slate-500">
              Powered by <a href="https://github.com/NyaaCaster" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-500/30 underline-offset-2">NyaaCaster</a>
           </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Editors */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800">
          
          {/* Editor Tabs */}
          <div className="flex border-b border-slate-800 bg-[#1e1e1e]">
            {EDITOR_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-5 py-3 text-xs font-medium border-r border-slate-800 transition-colors relative
                  ${activeTab === tab.id 
                    ? 'text-white bg-[#1e1e1e]' 
                    : 'text-slate-500 hover:text-slate-300 bg-[#161b22]'}
                `}
              >
                {activeTab === tab.id && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500"></div>
                )}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Editor Area */}
          <div className="flex-1 relative">
            {activeTab === 'input' && (
              <CodeEditor 
                value={inputText} 
                onChange={setInputText} 
                className="absolute inset-0"
                // No allowCopy here
              />
            )}
            {activeTab === 'data' && (
              <CodeEditor 
                value={charData} 
                onChange={setCharData} 
                className="absolute inset-0"
                allowCopy={true}
              />
            )}
            {activeTab === 'regex' && (
              <CodeEditor 
                value={regexPattern} 
                onChange={setRegexPattern} 
                className="absolute inset-0"
                allowCopy={true}
              />
            )}
            {activeTab === 'html' && (
              <CodeEditor 
                value={htmlTemplate} 
                onChange={setHtmlTemplate} 
                className="absolute inset-0"
                allowCopy={true}
              />
            )}
          </div>

          {/* AI Toolbar (Bottom of Left Panel) */}
          <div className="border-t border-slate-800 bg-[#161b22] p-4 space-y-3 shrink-0">
            
            {/* Input & Image Area */}
            {(activeTab === 'html' || activeTab === 'input' || activeTab === 'data') && (
               <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className="w-full bg-[#0d1117] border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-600"
                      placeholder={activeTab === 'html' ? "输入修改指令 (例如: '把背景改成深红色', '字体变大')..." : "额外的生成需求描述，供Gemini发挥 (可选)..."}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !isAiDisabled && handleAiAction()}
                    />
                  </div>
                  
                  {activeTab === 'html' && (
                    <div className="flex items-center">
                       <input 
                         type="file" 
                         ref={fileInputRef}
                         className="hidden" 
                         accept="image/*"
                         onChange={handleImageSelect}
                       />
                       {selectedImage ? (
                         <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
                            <span className="text-xs text-blue-300 truncate max-w-[100px]">图片已选</span>
                            <button onClick={handleClearImage} className="text-slate-500 hover:text-white">✕</button>
                         </div>
                       ) : (
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="p-2.5 text-slate-400 hover:text-white bg-[#0d1117] border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                           title="上传参考图片"
                         >
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                         </button>
                       )}
                    </div>
                  )}
               </div>
            )}

            {/* Main Action Button */}
            <Button 
              className="w-full" 
              onClick={handleAiAction}
              disabled={isAiDisabled}
              isLoading={loadingState === LoadingState.LOADING}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {getAiButtonLabel()}
              </span>
            </Button>
            
            {/* Context Help Text */}
            <div className="text-[10px] text-slate-500 text-center px-2">
              {activeTab === 'input' && "将上方随意的文本整理成标准 JSON 格式数据。"}
              {activeTab === 'data' && "分析上方数据结构，自动生成提取正则和初始 HTML 布局。"}
              {activeTab === 'html' && (aiPrompt ? "AI 将根据你的指令修改代码。" : "不输入指令时，AI 将尝试重新设计整个 UI 风格。")}
            </div>
          </div>
        </div>

        {/* Right Panel: Preview & Logs */}
        <div className="w-[450px] flex flex-col shrink-0 bg-[#0c0c0c]">
          
          {/* Right Tabs */}
          <div className="flex border-b border-slate-800 bg-[#161b22]">
            {RIGHT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveRightTab(tab.id)}
                className={`
                  flex-1 py-3 text-xs font-medium transition-colors
                  ${activeRightTab === tab.id 
                    ? 'text-white bg-[#0c0c0c] border-t-2 border-t-blue-500' 
                    : 'text-slate-500 hover:text-slate-300 bg-[#111]'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden relative">
            {activeRightTab === 'preview' && (
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 bg-[#1e1e1e] relative">
                  <iframe 
                    className="w-full h-full border-none"
                    srcDoc={previewHtml}
                    title="Preview"
                    sandbox="allow-scripts"
                  />
                </div>
                
                {/* Status Bar */}
                <div className="bg-[#111] border-t border-slate-800 px-4 py-2 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>提取变量: {Object.keys(parseResult.extractedVariables).length} 个</span>
                  {parseResult.error && (
                    <span className="text-red-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {parseResult.error}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeRightTab === 'logs' && (
              <Logger logs={logs} onClear={clearLogs} />
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      <ApiSettingsModal 
        isOpen={isApiSettingsOpen} 
        onClose={() => setIsApiSettingsOpen(false)} 
      />
      
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        content={readmeContent}
      />
    </div>
  );
};

export default App;