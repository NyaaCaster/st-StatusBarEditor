import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { ApiProvider, ModelOption } from '../types';
import { configureApi, connectAndFetchModels, setModelConfig, MODEL_NAME, COMPLEX_MODEL_NAME } from '../services/geminiService';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper Component: Input with Dropdown
const ModelInputSelector = ({ 
  value, 
  onChange, 
  models, 
  placeholder 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  models: ModelOption[];
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-600 transition-colors"
          placeholder={placeholder}
        />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-2 bg-[#0d1117] border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors ${isOpen ? 'bg-slate-800 text-white border-slate-600' : ''}`}
          title="选择模型"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
      
      {isOpen && (
        <>
            {/* Backdrop to close dropdown on outside click */}
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            
            <div className="absolute right-0 top-full mt-1 w-full max-h-60 overflow-y-auto bg-[#1e1e1e] border border-slate-700 rounded-lg shadow-xl z-20 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {models.length > 0 ? (
                models.map(m => (
                <button
                    key={m.id}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-blue-600 hover:text-white truncate border-b border-slate-800/50 last:border-0"
                    onClick={() => {
                        onChange(m.id);
                        setIsOpen(false);
                    }}
                >
                    {m.name || m.id}
                </button>
                ))
            ) : (
                <div className="px-3 py-2 text-xs text-slate-500">列表为空</div>
            )}
            </div>
        </>
      )}
    </div>
  );
};

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState<ApiProvider>('google');
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [baseUrl, setBaseUrl] = useState('https://love.qinyan.icu/v1');
  
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [statusMessage, setStatusMessage] = useState('');
  
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedToolModel, setSelectedToolModel] = useState(MODEL_NAME);
  const [selectedCodingModel, setSelectedCodingModel] = useState(COMPLEX_MODEL_NAME);

  useEffect(() => {
    // Reset status when provider changes
    setConnectionStatus('disconnected');
    setAvailableModels([]);
    setStatusMessage('');
    
    // Set default models based on provider
    if (provider === 'openai') {
        setSelectedToolModel('claude-sonnet-4-5-20250929');
        setSelectedCodingModel('claude-sonnet-4-5-20250929');
    } else {
        // For Google, reset to default constants or keep current if needed
        setSelectedToolModel('gemini-3-flash-preview');
        setSelectedCodingModel('gemini-3-pro-preview');
    }
  }, [provider]);

  // Sync internal state with service current state on open (optional but good for persistence in session)
  // For simplicity, we stick to local state, but one could add an initialization effect here.

  const handleConnect = async () => {
    setConnectionStatus('connecting');
    setStatusMessage('Connecting...');
    
    // 1. Configure Service
    configureApi(provider, apiKey, baseUrl);

    try {
      // 2. Test Connection & Fetch Models
      let models = await connectAndFetchModels();

      // Ensure specific default models for OpenAI are available in the list logic (though user can type freely now)
      if (provider === 'openai') {
        const requiredModels = ['claude-sonnet-4-5-20250929'];
        requiredModels.forEach(reqId => {
          if (!models.find(m => m.id === reqId)) {
            models.unshift({ id: reqId, name: reqId });
          }
        });
      }

      setAvailableModels(models);
      setConnectionStatus('connected');
      setStatusMessage('Connected');

      // 3. Auto-select defaults validation
      // For Google, ensure valid selection
      if (provider === 'google') {
          const modelIds = models.map(m => m.id);
          if (!modelIds.includes(selectedToolModel)) setSelectedToolModel(modelIds[0]);
          if (!modelIds.includes(selectedCodingModel)) setSelectedCodingModel(modelIds[0]);
      }
      // For OpenAI, the text inputs preserve whatever user typed or the defaults set by useEffect
      
    } catch (err: any) {
      setConnectionStatus('disconnected');
      setStatusMessage(err.message || 'Connection failed');
    }
  };

  const handleSave = () => {
    if (connectionStatus !== 'connected') {
        // Allow saving but warn or force connection? 
        // Logic implies we should connect first. But we'll allow configuring params even if not connected yet
        // Update service config just in case user didn't click connect
        configureApi(provider, apiKey, baseUrl);
    }
    setModelConfig(selectedToolModel, selectedCodingModel);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#161b22] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-[#0d1117]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🔌 API 设置
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">API 来源</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setProvider('google')}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all
                  ${provider === 'google' 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-[#0d1117] border-slate-700 text-slate-400 hover:border-slate-600'}`}
              >
                Google AI Studio
              </button>
              <button 
                onClick={() => setProvider('openai')}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all
                  ${provider === 'openai' 
                    ? 'bg-green-600 border-green-500 text-white' 
                    : 'bg-[#0d1117] border-slate-700 text-slate-400 hover:border-slate-600'}`}
              >
                OpenAI 兼容性 AI
              </button>
            </div>
          </div>

          {/* Credentials */}
          <div className="space-y-4">
            {provider === 'google' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">GOOGLE API KEY</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-600"
                />
              </div>
            )}

            {provider === 'openai' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">API 端点 (基础 URL)</label>
                  <input 
                    type="text" 
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">API 密钥 (KEY)</label>
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none placeholder:text-slate-600"
                  />
                </div>
              </>
            )}
          </div>

          {/* Connection Test */}
          <div>
            <Button 
              onClick={handleConnect} 
              isLoading={connectionStatus === 'connecting'}
              className="w-full"
              variant={provider === 'google' ? 'primary' : 'secondary'}
            >
              连接
            </Button>
            
            <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium">
               {connectionStatus === 'disconnected' && <span className="text-red-400 flex items-center gap-1">🔴 未连接</span>}
               {connectionStatus === 'connecting' && <span className="text-yellow-400 flex items-center gap-1">🟡 连接中...</span>}
               {connectionStatus === 'connected' && <span className="text-green-400 flex items-center gap-1">🟢 已连接</span>}
            </div>
            {statusMessage && connectionStatus === 'disconnected' && (
                <p className="text-xs text-red-400 text-center mt-1">{statusMessage}</p>
            )}
          </div>

          {/* Model Selection */}
          {connectionStatus === 'connected' && (
            <div className="space-y-4 pt-4 border-t border-slate-700 animate-in fade-in slide-in-from-top-2">
               <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">工具模型 (Tool Model)</label>
                  {provider === 'google' ? (
                    <select 
                      value={selectedToolModel} 
                      onChange={(e) => setSelectedToolModel(e.target.value)}
                      className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    >
                      {availableModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name || m.id}</option>
                      ))}
                    </select>
                  ) : (
                    <ModelInputSelector 
                      value={selectedToolModel} 
                      onChange={setSelectedToolModel} 
                      models={availableModels} 
                      placeholder="输入或选择模型..." 
                    />
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">用于快速任务：灵感生成、数据格式化。</p>
               </div>

               <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">编码模型 (Coding Model)</label>
                  {provider === 'google' ? (
                    <select 
                      value={selectedCodingModel} 
                      onChange={(e) => setSelectedCodingModel(e.target.value)}
                      className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    >
                      {availableModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name || m.id}</option>
                      ))}
                    </select>
                  ) : (
                    <ModelInputSelector 
                      value={selectedCodingModel} 
                      onChange={setSelectedCodingModel} 
                      models={availableModels}
                      placeholder="输入或选择模型..." 
                    />
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">用于复杂任务：代码修改、图片分析。</p>
               </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-[#0d1117] flex justify-end">
          <Button onClick={handleSave} disabled={connectionStatus !== 'connected' && !apiKey}>
            保存设置
          </Button>
        </div>

      </div>
    </div>
  );
};