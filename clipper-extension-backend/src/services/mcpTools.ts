import axios from 'axios';
import * as cheerio from 'cheerio';
import type {
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';

interface McpToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

interface McpTool extends McpToolDefinition {
  execute: (args: Record<string, unknown>) => Promise<string>;
}

const USER_AGENT = 'SmartClipperBot/1.0 (+https://github.com/ZYY-SISU)';

const fetchTool: McpTool = {
  id: 'fetch_web_summary',
  name: '网页摘要抓取',
  description:
    '抓取公开网页内容并返回清理后的文本片段，可用于摘要分析。',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '要抓取的网页绝对URL地址，仅支持HTTP(S)协议。',
      },
      maxLength: {
        type: 'number',
        description: '可选的文本内容长度上限（默认2000字符）。',
      },
    },
    required: ['url'],
    additionalProperties: false,
  },
  async execute(args) {
    const rawUrl = typeof args.url === 'string' ? args.url.trim() : '';
    if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
      throw new Error('A valid http/https url is required.');
    }

    const rawLimit = typeof args.maxLength === 'number' ? args.maxLength : 2000;
    const maxLength = Math.min(Math.max(rawLimit, 500), 6000);

    const response = await axios.get(rawUrl, {
      responseType: 'text',
      timeout: 12000,
      headers: { 'User-Agent': USER_AGENT },
    });

    const $ = cheerio.load(response.data);
    $('script, style, noscript, svg').remove();

    const title = ($('title').text() || '').trim() || rawUrl;
    const headings = $('h1, h2, h3')
      .map((_i, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .slice(0, 6);

    const plainText = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    if (!plainText) {
      throw new Error('The target page does not contain readable text.');
    }

    const excerpt = plainText.slice(0, maxLength);
    const keyPoints = buildKeyPoints(excerpt);

    const payload = {
      type: 'web_fetch_result',
      url: rawUrl,
      title,
      length: excerpt.length,
      headings,
      keyPoints,
      excerpt,
      retrievedAt: new Date().toISOString(),
    };

    return JSON.stringify(payload, null, 2);
  },
};

const TOOL_REGISTRY: McpTool[] = [fetchTool];

export function listMcpTools(): McpToolDefinition[] {
  return TOOL_REGISTRY.map(({ execute, ...definition }) => definition);
}

export function getEnabledMcpTools(ids: string[]): McpTool[] {
  const uniqueIds = new Set(ids);
  return TOOL_REGISTRY.filter((tool) => uniqueIds.has(tool.id));
}

export function toOpenAITools(enabledTools: McpTool[]): ChatCompletionTool[] {
  return enabledTools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export async function executeToolCall(
  call: ChatCompletionMessageToolCall,
  enabledTools: McpTool[],
): Promise<string> {
  // 类型守卫：检查是否是标准工具调用
  if (!('function' in call)) {
    return JSON.stringify({ error: 'Unsupported tool call type.' });
  }
  
  const target = enabledTools.find((tool) => tool.name === call.function.name);
  if (!target) {
    return JSON.stringify({ error: `Tool ${call.function.name} is not enabled.` });
  }

  let parsedArgs: Record<string, unknown> = {};
  try {
    parsedArgs = call.function.arguments ? JSON.parse(call.function.arguments) : {};
  } catch (error) {
    return JSON.stringify({
      error: 'Invalid JSON arguments.',
      raw: call.function.arguments,
    });
  }

  try {
    const output = await target.execute(parsedArgs);
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tool execution failed.';
    return JSON.stringify({ error: message });
  }
}

function buildKeyPoints(text: string): string[] {
  const sentences = text
    .split(/(?<=[。.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.slice(0, 4);
}
