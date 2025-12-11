// src/service/ai_handler.ts

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import TurndownService from 'turndown';
import { executeToolCall, getEnabledMcpTools, toOpenAITools } from './mcpTools';


// // 初始化 HTML 转 Markdown 的服务
// const turndownService = new TurndownService({
//   headingStyle: 'atx',  // 使用 # 标题风格
//   codeBlockStyle: 'fenced' ,// 使用 ``` 代码块风格
//   linkStyle: 'inlined' // 保持链接跟在文字后面
// });
// // 🌟 关键：让 Turndown 不要删掉表格里的换行，保留更多结构
// turndownService.addRule('preserveTable', {
//   filter: ['table', 'tr', 'td', 'th'],
//   replacement: function (content, node) {
//     return (node as any).isBlock ? '\n\n' + content + '\n\n' : content;
//   }
// });

// 1. 定义模型配置
const CONFIGS: Record<string, any> = {
  // --- DeepSeek R1 (使用OpenRouter) ---
  'deepseek-r1': {
    baseURL: 'https://openrouter.ai/api/v1',  // OpenRouter流动地址
    model: 'deepseek/deepseek-r1',         // OpenRouter流动模型名
    envKey: 'Openrouter_KEY'       
  },
  
  // --- GPT-4o  ---
  'gpt-4o': {
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o',
    envKey: 'Openrouter_KEY'
  },

  // --- GPT-4o mini  ---
  'gpt-4o-mini': {
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    envKey: 'Openrouter_KEY'
  },

  // --- Claude 3.5  ---
  'claude-3-5': {
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet',
    envKey: 'Openrouter_KEY'
  }
};

const THINK_TAG_PATTERN = /<think>[\s\S]*?<\/think>/g;


export async function processContent(htmlContent: string, systemPrompt: string,modelId: string = 'deepseek-r1') {
  // 1. 容错处理：如果前端没传 modelId，默认用 DeepSeek R1
  const config = CONFIGS[modelId] || CONFIGS['gpt-4o'];
  //const template = TEMPLATES[templateId] || TEMPLATES['summary'];

  // 2. 读取对应的密码
  const currentKey = process.env[config.envKey];
  
  if (!currentKey) {
    // 没密码时返回明确错误，不崩
    return { 
      title: "配置错误", 
      summary: `未找到 ${config.envKey}，请在后端 .env 文件中配置`, 
      tags: ["Error"] 
    };
  }

  // ///////////////////////////////优化（zyy）///////////////////////////////////

  // // 【新增步骤】清洗数据：HTML -> Markdown
  // // 这能极大减少 Token 消耗，并让结构更清晰
  // console.log(`[AI Service] 正在使用${modelId}将 HTML 转换为 Markdown...`);
  // let markdownContent = "";
  // try {
  //   // 如果传入的是纯文本，就不转了；如果是 HTML，就转
  //   if (htmlContent.trim().startsWith('<')) {
  //       markdownContent = turndownService.turndown(htmlContent);
  //   } else {
  //       markdownContent = htmlContent;
  //   }
  // } catch (e) {
  //   console.warn("[AI Service] Markdown 转换失败，降级使用原始文本", e);
  //   markdownContent = htmlContent;
  // }

  // // 截取长度限制（Markdown 更紧凑，可以留更多）
  // const finalInput = markdownContent.substring(0, 50000);

  // ///////////////////////////////优化结束///////////////////////////////////

  // 3. 准备调用
  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey: currentKey,
    dangerouslyAllowBrowser: true
  });

  try {

    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        // { role: "user", content: `请分析以下网页内容（Markdown格式）：\n\n${finalInput}` }//修正
        { role: "user", content: `网页内容如下：\n${htmlContent.substring(0, 15000)}` } 
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    const cleanContent = content?.replace(/```json|```/g, '').trim();
    
    return JSON.parse(cleanContent || "{}");

  } catch (error: any) {
    console.error("AI Error:", error.message);
    return {
      title: "AI 处理失败",
      summary: `调用 ${config.model} 失败: ${error.message}`,
      tags: ["Error"]
    };
  }
}





 /**
 * 修改纯对话模式 (Chat Mode) - 支持上下文记忆
 * @param userMessage 用户的问题
 * @param modelId 模型ID
 * @param context 上下文数据 (可能是字符串或JSON对象)
 */
export async function processChat(
  userMessage: string,
  modelId: string = 'deepseek-r1',
  context?: unknown,
  toolIds: string[] = [],
) {
  const config = CONFIGS[modelId] || CONFIGS['deepseek-r1'];
  const currentKey = process.env[config.envKey];

  if (!currentKey) {
    return '❌ 配置错误: 未找到 API Key。';
  }

  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey: currentKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/SmartClipper',
    },
  });

  const enabledTools = getEnabledMcpTools(Array.isArray(toolIds) ? toolIds : []);
  const hasTools = enabledTools.length > 0;

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: '你是一个乐于助人的 AI 助手。' },
  ];

  if (hasTools) {
    const toolSummary = enabledTools
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join('\n');
    messages.push({
      role: 'system',
      content: `已启用以下 MCP 工具，可按需调用：\n${toolSummary}`,
    });
  }

  if (context) {
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
    messages.push({
      role: 'system',
      content: `【当前上下文信息】\n用户正在浏览或讨论以下内容，请基于此回答用户的问题：\n\n${contextStr.substring(0, 10000)}`,
    });
  }

  messages.push({ role: 'user', content: userMessage });

  console.log(
    `💬 [Chat] 调用模型: ${config.model}, 上下文长度: ${context ? JSON.stringify(context).length : 0}, 启用工具: ${enabledTools.length}`,
  );

  try {
    if (!hasTools) {
      const completion = await client.chat.completions.create({
        model: config.model,
        messages,
        temperature: 0.7,
      });

      const rawContent = completion.choices[0].message.content;
      return cleanAssistantText(asPlainText(rawContent)) || '（无回复）';
    }

    const toolPayloads = toOpenAITools(enabledTools);
    const conversation: ChatCompletionMessageParam[] = [...messages];
    let safetyCounter = 0;

    while (safetyCounter < 5) {
      const completion = await client.chat.completions.create({
        model: config.model,
        messages: conversation,
        temperature: 0.7,
        tools: toolPayloads,
        tool_choice: 'auto',
      });

      const assistantMessage = completion.choices[0].message;
      conversation.push({
        role: 'assistant',
        content: assistantMessage.content ?? '',
        tool_calls: assistantMessage.tool_calls,
      } as ChatCompletionMessageParam);

      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        return cleanAssistantText(asPlainText(assistantMessage.content)) || '（无回复）';
      }

      for (const call of assistantMessage.tool_calls) {
        const toolResult = await executeToolCall(call, enabledTools);
        conversation.push({
          role: 'tool',
          tool_call_id: call.id,
          content: toolResult,
        } as ChatCompletionMessageParam);
      }

      safetyCounter += 1;
    }

    return '❌ MCP 工具调用失败：超过迭代上限。';
  } catch (error: any) {
    console.error('Chat Error:', error);
    return `❌ 对话失败: ${error.message}`;
  }
}

/**
 * AI 视觉识别功能
 * @param imageDataUrl - base64 格式的图片数据 URL
 * @param prompt - 提示词
 * @param modelId - 模型 ID，默认使用 gpt-4o-mini
 */
function asPlainText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk: unknown) => {
        if (typeof chunk === 'string') return chunk;
        if (
          chunk &&
          typeof chunk === 'object' &&
          'text' in chunk &&
          typeof (chunk as { text?: unknown }).text === 'string'
        ) {
          return (chunk as { text: string }).text;
        }
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

function cleanAssistantText(raw: string): string {
  return raw.replace(THINK_TAG_PATTERN, '').trim();
}

export async function processVision(
  imageDataUrl: string, 
  prompt: string, 
  modelId: string = 'gpt-4o-mini'
) {
  try {
    // 获取配置
    const config = CONFIGS[modelId] || CONFIGS['gpt-4o-mini'];
    const currentKey = process.env[config.envKey];

    if (!currentKey) {
      throw new Error(`未找到 API 密钥: ${config.envKey}`);
    }

    // 创建 OpenAI 客户端
    const client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: currentKey,
    });

    console.log(`[AI Vision] 使用模型: ${config.model}`);

    // 调用 Vision API
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: imageDataUrl,
                detail: 'high'  // 使用高清模式
              } 
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const rawContent = completion.choices[0].message.content || "（AI 无回复）";
    
    // 清洗思考过程标签
    const cleanContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    console.log('[AI Vision] 识别完成');
    return cleanContent;

  } catch (error: any) {
    console.error('[AI Vision] 错误:', error);
    throw new Error(`AI 识图失败: ${error.message}`);
  }
}