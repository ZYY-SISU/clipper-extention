// src/service/ai_handler.ts

import OpenAI from 'openai';
import TurndownService from 'turndown';


// 初始化 HTML 转 Markdown 的服务
const turndownService = new TurndownService({
  headingStyle: 'atx',  // 使用 # 标题风格
  codeBlockStyle: 'fenced' ,// 使用 ``` 代码块风格
  linkStyle: 'inlined' // 保持链接跟在文字后面
});
// 🌟 关键：让 Turndown 不要删掉表格里的换行，保留更多结构
turndownService.addRule('preserveTable', {
  filter: ['table', 'tr', 'td', 'th'],
  replacement: function (content, node) {
    return (node as any).isBlock ? '\n\n' + content + '\n\n' : content;
  }
});

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


export async function processContent(htmlContent: string, templateId: string, systemPrompt: string,modelId: string = 'deepseek-r1') {
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

  ///////////////////////////////优化（赵）///////////////////////////////////

  // 【新增步骤】清洗数据：HTML -> Markdown
  // 这能极大减少 Token 消耗，并让结构更清晰
  console.log(`[AI Service] 正在使用${modelId}将 HTML 转换为 Markdown...`);
  let markdownContent = "";
  try {
    // 如果传入的是纯文本，就不转了；如果是 HTML，就转
    if (htmlContent.trim().startsWith('<')) {
        markdownContent = turndownService.turndown(htmlContent);
    } else {
        markdownContent = htmlContent;
    }
  } catch (e) {
    console.warn("[AI Service] Markdown 转换失败，降级使用原始文本", e);
    markdownContent = htmlContent;
  }

  // 截取长度限制（Markdown 更紧凑，可以留更多）
  const finalInput = markdownContent.substring(0, 50000);

  ///////////////////////////////优化结束///////////////////////////////////

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
        { role: "user", content: `请分析以下网页内容（Markdown格式）：\n\n${finalInput}` }//修正
        // { role: "user", content: `网页内容如下：\n${htmlContent.substring(0, 15000)}` } 
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

// export async function processContent(htmlContent: string, systemPrompt: string, modelId: string = 'deepseek-r1') {
  
//   // 1. 获取模型配置
//   const config = CONFIGS[modelId] || CONFIGS['deepseek-r1'];
  
//   // 2. 读取密码
//   const currentKey = process.env[config.envKey];

//   console.log(`[AI Service] 正在调用模型: ${config.model}`);

//   if (!currentKey) {
//     return { 
//       title: "配置错误", 
//       summary: `未找到环境变量 ${config.envKey}，请检查后端 .env 文件`, 
//       tags: ["Error"] 
//     };
//   }

//   // 🌟【新增步骤】清洗数据：HTML -> Markdown
//   // 这能极大减少 Token 消耗，并让结构更清晰
//   console.log(`[AI Service] 正在将 HTML 转换为 Markdown...`);
//   let markdownContent = "";
//   try {
//     // 如果传入的是纯文本，就不转了；如果是 HTML，就转
//     if (htmlContent.trim().startsWith('<')) {
//         markdownContent = turndownService.turndown(htmlContent);
//     } else {
//         markdownContent = htmlContent;
//     }
//   } catch (e) {
//     console.warn("[AI Service] Markdown 转换失败，降级使用原始文本", e);
//     markdownContent = htmlContent;
//   }

//   // 截取长度限制（Markdown 更紧凑，可以留更多）
//   const finalInput = markdownContent.substring(0, 50000); 

//   // 3. 准备调用
//   const client = new OpenAI({
//     baseURL: config.baseURL,
//     apiKey: currentKey,
//     dangerouslyAllowBrowser: true
//   });

//   try {
//     const completion = await client.chat.completions.create({
//       model: config.model,
//       messages: [
//         { role: "system", content: systemPrompt },
//         { role: "user", content: `请分析以下网页内容（Markdown格式）：\n\n${finalInput}` } 
//       ],
//       response_format: { type: "json_object" },
//       temperature: 0.3, // 降低随机性，让提取更准确
//     });

//     const content = completion.choices[0].message.content;
//     // 移除可能存在的 markdown 代码块标记
//     const cleanContent = content?.replace(/```json|```/g, '').trim();
    
//     return JSON.parse(cleanContent || "{}");

//   } catch (error: any) {
//     console.error("AI Error Detailed:", error);
//     return {
//       title: "AI 处理失败",
//       summary: `调用失败 (${error.status || '未知状态码'}): ${error.message}`,
//       tags: ["Error"]
//     };
//   }
// }



 /**
 * 修改纯对话模式 (Chat Mode) - 支持上下文记忆
 * @param userMessage 用户的问题
 * @param modelId 模型ID
 * @param context 上下文数据 (可能是字符串或JSON对象)
 */
export async function processChat(userMessage: string, modelId: string = 'deepseek-r1', context?: any) {
  const config = CONFIGS[modelId] || CONFIGS['deepseek-r1'];
  const currentKey = process.env[config.envKey];

  if (!currentKey) {
    return "❌ 配置错误: 未找到 API Key。";
  }

  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey: currentKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/SmartClipper", 
    }
  });

  // 构建消息列表
  const messages: any[] = [
    { role: "system", content: "你是一个乐于助人的 AI 助手。" }
  ];

  // 如果有上下文，把它塞给 AI
  if (context) {
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
    messages.push({
      role: "system", 
      content: `【当前上下文信息】\n用户正在浏览或讨论以下内容，请基于此回答用户的问题：\n\n${contextStr.substring(0, 10000)}` // 限制长度防报错
    });
  }

  // 最后放入用户的问题
  messages.push({ role: "user", content: userMessage });

  console.log(`💬 [Chat] 调用模型: ${config.model}, 上下文长度: ${context ? JSON.stringify(context).length : 0}`);

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: messages,
      temperature: 0.7,
    });

    const rawContent = completion.choices[0].message.content || "（无回复）";
    // 清洗 R1 思考过程
    const cleanContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    return cleanContent;

  } catch (error: any) {
    console.error("Chat Error:", error);
    return `❌ 对话失败: ${error.message}`;
  }
}