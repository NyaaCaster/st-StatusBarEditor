import { GoogleGenAI, Schema, Type } from "@google/genai";
import { ModelOption } from "../types";

// Configuration State
let currentProvider: 'google' | 'openai' = 'google';
let currentApiKey: string = process.env.API_KEY || '';
let currentBaseUrl: string = ''; // For OpenAI
let googleAi: GoogleGenAI | null = currentApiKey ? new GoogleGenAI({ apiKey: currentApiKey }) : null;

// Mutable Model Names
export let MODEL_NAME = 'gemini-3-flash-preview';
export let COMPLEX_MODEL_NAME = 'gemini-3-pro-preview';

type LogFn = (message: string, type: 'info' | 'request' | 'response' | 'error') => void;

// --- Helper Functions ---

const stripMarkdown = (text: string) => {
  return text.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
};

const cleanJson = (text: string) => {
  let clean = text.trim();
  clean = clean.replace(/^```(json)?\s*/i, '').replace(/```\s*$/, '');
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return clean;
};

// --- Configuration API ---

export const configureApi = (
  provider: 'google' | 'openai',
  apiKey: string,
  baseUrl?: string
) => {
  currentProvider = provider;
  currentApiKey = apiKey;
  currentBaseUrl = baseUrl || '';

  if (provider === 'google') {
    googleAi = new GoogleGenAI({ apiKey: currentApiKey });
  } else {
    googleAi = null; // Clean up google instance
  }
};

export const setModelConfig = (toolModel: string, codingModel: string) => {
  MODEL_NAME = toolModel;
  COMPLEX_MODEL_NAME = codingModel;
};

export const connectAndFetchModels = async (): Promise<ModelOption[]> => {
  if (!currentApiKey) {
    throw new Error("API Key is missing");
  }

  if (currentProvider === 'google') {
    try {
        if (!googleAi) googleAi = new GoogleGenAI({ apiKey: currentApiKey });
        await googleAi.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'test',
            config: { maxOutputTokens: 1 }
        });
    } catch (e: any) {
        throw new Error(`Google API Connection Failed: ${e.message}`);
    }

    return [
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' }
    ];
  } else {
    // OpenAI Compatible
    if (!currentBaseUrl) throw new Error("Base URL is required for OpenAI compatible API");
    
    // Clean URL
    const baseUrl = currentBaseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/models`;

    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${currentApiKey}`
        }
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to fetch models: ${res.status} ${res.statusText} - ${errText}`);
      }

      const data = await res.json();
      if (Array.isArray(data.data)) {
         return data.data.map((m: any) => ({ id: m.id, name: m.id }));
      } else {
        throw new Error("Invalid model response format");
      }
    } catch (e: any) {
      throw new Error(`OpenAI Connection Failed: ${e.message}`);
    }
  }
};

// --- Core Generation Logic (Provider Agnostic) ---

interface GenContentParams {
  model: string;
  systemInstruction?: string;
  prompt: string | any[];
  schema?: any;
  jsonMode?: boolean;
}

const generateContentCommon = async (params: GenContentParams): Promise<string> => {
  const { model, systemInstruction, prompt, schema, jsonMode } = params;

  if (currentProvider === 'google') {
    if (!googleAi) throw new Error("Google AI not initialized");
    
    // Construct request
    const config: any = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (schema) {
       config.responseSchema = schema;
       config.responseMimeType = "application/json";
    } else if (jsonMode) {
       config.responseMimeType = "application/json";
    }

    const contents = Array.isArray(prompt) ? { parts: prompt } : prompt;

    const response = await googleAi.models.generateContent({
      model,
      contents,
      config
    });
    
    return response.text || "";

  } else {
    // OpenAI Logic
    if (!currentBaseUrl || !currentApiKey) throw new Error("OpenAI config missing");
    
    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }

    let userContent: any = "";
    if (Array.isArray(prompt)) {
      // Convert Gemini parts to OpenAI content array
      userContent = prompt.map(part => {
        if (part.text) return { type: 'text', text: part.text };
        if (part.inlineData) {
          return { 
            type: 'image_url', 
            image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } 
          };
        }
        return null;
      }).filter(Boolean);
    } else {
      userContent = prompt;
    }

    messages.push({ role: 'user', content: userContent });

    const body: any = {
      model: model,
      messages: messages,
    };

    if (jsonMode || schema) {
      body.response_format = { type: 'json_object' };
    }

    const baseUrl = currentBaseUrl.replace(/\/+$/, '');
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentApiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API Error: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
};


// --- Service Implementations ---

const HTML_FORMAT_INSTRUCTIONS = `
    STRICT HTML FORMATTING RULES:
    1. Output RAW HTML. No markdown code blocks.
    2. Start with \`<!DOCTYPE html>\`
    3. Root: \`<html lang="zh-CN">\`
    4. Head must contain:
       \`<meta charset="UTF-8">\`
       \`<meta name="viewport" content="width=device-width, initial-scale=1.0">\`
    5. Body: \`<body style="margin:0; padding:0; background:transparent; width: 100%; box-sizing: border-box;">\`
    6. Content: All visual content MUST be inside a single main wrapper \`div\`.
       - **CRITICAL**: The main wrapper MUST have \`width: 100%\`, \`box-sizing: border-box\`. It MUST be responsive and adapt to the parent container's width.
       - Apply all styling inline.
    7. End with \`</body></html>\`
`;

const VISUAL_STYLE_INSTRUCTIONS = `
    VISUAL STYLE GUIDE & BEST PRACTICES:
    1.  **Aesthetics**: Aim for a high-quality "Game HUD" look (Cyberpunk, Sci-Fi, or Elegant Fantasy).
    2.  **Container**: 
        - Use **Linear Gradients** for backgrounds to create depth (e.g., \`linear-gradient(145deg, #1b151e, #2b2026)\`).
        - Add subtle borders (e.g., \`1px solid rgba(255,255,255,0.1)\`).
        - Use **Rounded Corners** (8px-16px).
        - Add **Drop Shadows** (\`box-shadow: 0 8px 32px rgba(0,0,0,0.6)\`) for a floating effect.
    3.  **Color & Logic**:
        - **Infer Colors from Data**: Analyze the key/value to pick colors.
          - *Health / Favorability / Love*: Pink (#e91e63), Red.
          - *Mana / Logic / Tech*: Blue (#64b5f6), Cyan (#4db6ac).
          - *Stamina / Nature*: Green (#81c784).
          - *Corruption / Lust / Dark*: Purple (#ba68c8), Deep Red.
        - Use **Translucent** backgrounds for inner sections (\`rgba(0,0,0,0.2)\`).
    4.  **Effects**:
        - Use **Glow** effects for important elements (\`box-shadow: 0 0 10px rgba(...)\` or \`text-shadow\`).
        - Progress Bars: If a value is a number/percentage, render a stylish progress bar with a glow.
    5.  **Layout**:
        - Use Flexbox for headers.
        - Use Grid for attribute lists.
        - Ensure good contrast for text.
`;

export const generateInspiration = async (availableKeys: string[], onLog?: LogFn): Promise<string> => {
  const keysList = availableKeys.map(k => `$<${k}>`).join(', ');
  if (onLog) onLog(`Generating inspiration using keys: ${availableKeys.join(', ')}`, 'info');

  const prompt = `
    You are an expert HTML/CSS designer for game UIs.
    Create a "Character Status Bar" (HUD) HTML template.
    
    ${HTML_FORMAT_INSTRUCTIONS}
    
    ${VISUAL_STYLE_INSTRUCTIONS}

    DESIGN REQUIREMENTS:
    1. Create a visually striking floating card/HUD.
    2. Use inline styles for EVERYTHING. No <style> blocks.
    3. You MUST use the following placeholder variables: ${keysList}.
       - **CRITICAL**: The format MUST be \`$<VariableName>\`.
    4. **LABELS & ICONS**:
       - Display variable names as labels.
       - **MANDATORY**: Add a relevant EMOJI or ICON next to every label (e.g. ❤️ for HP).
    5. **RESPONSIVENESS**: The design MUST be flexible (width: 100%).
    6. **TABBED LAYOUT**: If there are many variables (e.g. > 7), you MUST organize them into **Tabs** (e.g., "Overview", "Stats", "Info") to keep the height manageable. Use simple inline JavaScript (\`onclick\`) to toggle tab visibility.
    7. Return ONLY the raw HTML string.
  `;

  if (onLog) onLog(prompt, 'request');

  try {
    const text = await generateContentCommon({
      model: COMPLEX_MODEL_NAME, // Use Complex model for design
      prompt: prompt
    });
    if (onLog) onLog(text, 'response');
    return stripMarkdown(text);
  } catch (e: any) {
    if (onLog) onLog(e.message, 'error');
    throw e;
  }
};

export const modifyHtmlTemplate = async (
  currentHtml: string, 
  instruction: string, 
  image?: { data: string, mimeType: string },
  onLog?: LogFn
): Promise<string> => {
  const parts: any[] = [];
  let logMsg = "Modifying HTML template.";
  
  if (image) {
    logMsg += " (Image attached)";
    parts.push({
      inlineData: {
        data: image.data.split(',')[1],
        mimeType: image.mimeType
      }
    });
  }
  if (onLog) onLog(logMsg, 'info');

  const promptText = `
    You are an expert Frontend Developer.
    
    USER INSTRUCTION: "${instruction}"
    
    CURRENT HTML:
    \`\`\`html
    ${currentHtml}
    \`\`\`
    
    ${VISUAL_STYLE_INSTRUCTIONS}

    TASK:
    1. Apply changes based on the instruction.
    2. ${HTML_FORMAT_INSTRUCTIONS}
    3. KEEP all placeholders (like \`$<Name>\`) intact.
    4. Maintain the high-quality visual style (Gradients, Glows, Glassmorphism).
    5. Return ONLY the raw HTML string.
  `;
  
  parts.push({ text: promptText });
  if (onLog) onLog(promptText + (image ? "\n[+ Image Data]" : ""), 'request');

  try {
    const text = await generateContentCommon({
      model: COMPLEX_MODEL_NAME, // Use Complex model for modifications
      prompt: parts
    });
    if (onLog) onLog(text, 'response');
    return stripMarkdown(text);
  } catch (e: any) {
    if (onLog) onLog(e.message, 'error');
    throw e;
  }
};

export const generateTemplateFromData = async (charData: string, onLog?: LogFn): Promise<{ regex: string, html: string }> => {
  if (onLog) onLog("Generating Template (Regex + HTML) from CharData...", 'info');

  const prompt = `
    Analyze this raw text character data.
    DATA START:
    ${charData.slice(0, 5000)}
    DATA END.

    GOAL: Create a Regex to extract data and an HTML template to display it.

    STEP 1: ANALYZE DATA FORMAT & SEMANTICS
    - Identify Keys (e.g. "时间", "Name") and Values.
    - **COLOR INFERENCE**: Look at the CONTENT of the values and the meaning of keys.
      - Example: If "Clothing" describes "dark leather", suggest dark themes.
      - Example: If "Libido" or "Corruption" is present, suggest Purple/Pink themes.
      - Example: If "HP" is present, suggest Red/Green.

    STEP 2: GENERATE REGEX
    Create a Javascript Regular Expression string to capture all fields.
    
    CRITICAL SYNTAX RULES:
    1.  **WRAPPER**: The regex string MUST start with \`<CharData>\` and end with \`[\\s\\S]*?<\\/CharData>\`.
    2.  **STRUCTURE**: 
        \`<CharData>(?:...)?(?:...)?...[\\s\\S]*?<\\/CharData>\`
    3.  **FIELD PATTERN**: For EACH key, use this specific non-capturing group pattern:
        \`(?:[\\s\\S]*?KEY_LITERAL[\\s]*SEPARATOR[\\s]*VALUE_PATTERN)?\`
    4.  **KEY LITERAL**: Use the EXACT key from data (including quotes if present).
    5.  **VALUE PATTERN**: 
        - Standard quotes: \`"(?<GroupName>[^"]*)"\`
        - Chinese quotes: \`“(?<GroupName>[^”]*)”\`
        - Unquoted value: \`(?<GroupName>[^\\n<]*)\`
    6.  **NAMING**: Use the key text as Group Name. Use Chinese characters if needed.

    STEP 3: GENERATE HTML
    Create a modern HUD HTML/CSS template based on the analysis.
    
    ${HTML_FORMAT_INSTRUCTIONS}
    
    ${VISUAL_STYLE_INSTRUCTIONS}

    SPECIFIC RULES:
    1.  **PLACEHOLDERS**: Use \`$<GroupName>\`.
    2.  **LABELS**: Display the Group Name/Key.
    3.  **ICONS/EMOJIS**: **MANDATORY**. Add relevant icons next to labels based on their meaning (e.g. 🗓️ for Date, 👗 for Clothing).
    4.  **TABBED LAYOUT**: If extracted fields > 7, split them into TABS (Overview, Stats, Details) using simple inline JS.
    5.  **LAYOUT**: 
        - Put "Name/Role" and "Level" in a prominent Header.
        - Put "Time/Location" in a smaller top bar or footer.
        - Use Progress Bars for numeric fields (e.g. 40/100).
    
    Return JSON format:
    {
      "regex": "escaped string of the regex",
      "html": "string of the html"
    }
  `;

  if (onLog) onLog(prompt, 'request');

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      regex: { type: Type.STRING },
      html: { type: Type.STRING }
    },
    required: ["regex", "html"]
  };

  try {
    const text = await generateContentCommon({
      model: MODEL_NAME, // Use standard/tool model for regex generation task
      prompt: prompt,
      schema: schema,
      jsonMode: true
    });

    if (onLog) onLog(text, 'response');

    const jsonStr = cleanJson(text);
    const json = JSON.parse(jsonStr);
    return {
      regex: json.regex || "",
      html: stripMarkdown(json.html || "<div>Error generating template</div>")
    };
  } catch (e: any) {
    if (onLog) onLog(`Error: ${e.message}`, 'error');
    return { regex: "", html: "Error parsing AI response" };
  }
};

export const convertRawTextToCharData = async (rawText: string, template: string, onLog?: LogFn): Promise<string> => {
  if (onLog) onLog("Converting raw text to CharData JSON structure...", 'info');

  const prompt = `
    Convert this text to "World Info" JSON format.
    
    RAW TEXT:
    ${rawText}

    OUTPUT FORMAT:
    <CharData>
    "Key1": "Value1",
    "Key2": "Value2"
    </CharData>

    RULES:
    1. Start with <CharData>, end with </CharData>.
    2. Use exact keys from text if possible. **DO NOT omit any fields** found in the RAW TEXT.
    3. **QUOTES (IMPORTANT)**: 
       - **STRUCTURE**: You MUST use English ASCII double quotes (") to enclose the Keys and Values (e.g., "Key": "Value").
       - **CONTENT PRESERVATION**: If the content text *inside* the value itself contains Chinese quotes (such as “ or ”), you MUST **PRESERVE** them as Chinese quotes. 
       - **STRICTLY FORBIDDEN**: Do NOT convert Chinese quotes found in the *original text content* into English quotes. Keep them exactly as they appear in the source.
         - Incorrect: "Thoughts": "He said "Hello"."
         - Correct:   "Thoughts": "He said “Hello”."
    4. Separator must be a colon (:).
    5. **CRITICAL**: Preserve all emojis, special characters, and decorative symbols found in the keys or values. Do not strip them.
    6. **NO NEWLINES IN VALUES**: The value string MUST be on a single line. Do not use \\n inside the value string as it breaks downstream parsing.
    7. **HTML STRUCTURE**: If a value requires multiple lines or structure, use <div>...</div> or <br> tags within the string instead of newlines. Use single quotes for attributes inside these tags (e.g. <div style='color:red'>).
    8. Return ONLY the result string. No markdown.
  `;

  if (onLog) onLog(prompt, 'request');

  try {
    let text = await generateContentCommon({
        model: MODEL_NAME, // Use standard model for simple text conversion
        prompt: prompt
    });
    text = stripMarkdown(text);
    if (onLog) onLog(text, 'response');
    return text;
  } catch (e: any) {
    if (onLog) onLog(e.message, 'error');
    throw e;
  }
};