import { ParseResult } from '../types';

/**
 * Parses the character data using the provided regex and substitutes variables into the HTML template.
 */
export const parseAndRender = (
    charData: string, 
    regexPattern: string, 
    htmlTemplate: string
  ): ParseResult => {
    try {
      const cleanedPattern = regexPattern.trim();
      let regex: RegExp;
      try {
        regex = new RegExp(cleanedPattern);
      } catch (e) {
        return { renderedHtml: htmlTemplate, extractedVariables: {}, error: "无效的正则表达式" };
      }
  
      const match = regex.exec(charData);
      
      if (!match || !match.groups) {
        return { 
          renderedHtml: htmlTemplate, 
          extractedVariables: {}, 
          error: "正则未匹配到数据，请检查数据或正则表达式。" 
        };
      }
  
      const extractedVariables = match.groups;
      
      // OPTIMIZED: Use a single pass regex to replace all placeholders in the HTML
      // This is efficient and ensures we only replace what matches variables found.
      
      // Strip markdown code blocks for the preview rendering
      let templateToRender = htmlTemplate;
      // Remove opening code block (e.g. ```html, ```)
      templateToRender = templateToRender.replace(/^```[a-z]*\s*/i, '');
      // Remove closing code block (```)
      templateToRender = templateToRender.replace(/```\s*$/, '');

      const renderedHtml = templateToRender.replace(/\$<([^>]+)>/g, (match, key) => {
        // key is the part inside $<...>, e.g. "Name"
        // If we have a value for this key, substitute it.
        // Otherwise, leave the placeholder intact (or empty string if preferred).
        return extractedVariables[key] !== undefined ? extractedVariables[key] : match;
      });
  
      return { renderedHtml, extractedVariables };
  
    } catch (error: any) {
      return { renderedHtml: htmlTemplate, extractedVariables: {}, error: error.message };
    }
  };
  
  export const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy: ', err);
      return false;
    }
  };

  export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };