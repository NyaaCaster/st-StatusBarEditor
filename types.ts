// Shared types for the application

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type EditorTab = 'input' | 'data' | 'html' | 'regex';

export interface ParseResult {
  renderedHtml: string;
  extractedVariables: Record<string, string>;
  error?: string;
}

export type LogType = 'info' | 'request' | 'response' | 'error';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: LogType;
  content: string;
}

export type ApiProvider = 'google' | 'openai';

export interface ModelOption {
  id: string;
  name: string;
}

export interface ApiConfig {
  provider: ApiProvider;
  apiKey: string;
  baseUrl?: string;
  toolModelId: string;
  codingModelId: string;
}
