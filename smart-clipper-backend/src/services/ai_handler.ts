/* // src/service/ai_handler.ts

import OpenAI from 'openai';

// 1. 定义模型配置
const CONFIGS: Record<string, any> = {
  // --- DeepSeek R1 (所以ai模型全部使用OpenRouter的聚合API调用)（胡）
  'deepseek-r1': {
    baseURL: 'https://openrouter.ai/api/v1'   //更改为OpenRouter地址  （胡）
    model: 'deepseek/deepseek-r1'             //更改为OpenRoute模型名 （胡）
    envKey: 'Openrouter_KEY'    
  },
  
  // --- GPT-4o  ---
  'gpt-4o': {
    baseURL: 'https://openrouter.ai/api/v1'
    model: 'openai/gpt-4'
    envKey: 'Openrouter_KEY'
  },

  // --- GPT-4o mini  ---
  'gpt-4o-mini': {
    baseURL: 'https://openrouter.ai/api/v1'
    model: 'openai/gpt-4o-mini'
    envKey: 'Openrouter_KEY'
  },

  // --- Claude 3.5  ---
  'claude-3-5': {
    baseURL: 'https://openrouter.ai/api/v1'
    model: 'anthropic/claude-3.5-sonnet'
    envKey: 'Openrouter_KEY'
  }
};

// // 2. 定义处理模版
// const TEMPLATES: Record<string, any> = {
//   'summary': {
//     system: '你是一个专业的摘要助手。请把用户的内容总结为 JSON 格式，包含 title(标题), summary(摘要), tags(标签数组)。不要输出 markdown 标记。'
//   },
//   'table': {
//     system: '你是一个数据分析师。请提取内容中的关键数据，整理为 columns(列名数组) 和 data(行数据数组) 的 JSON 格式。'
//   },
//   'list': {
//     system: '你是一个待办事项整理员。请提取内容为 checkItems 数组，每项包含 text(内容) 和 checked(false)。返回 JSON。'
//   }
// };

export async function processContent(htmlContent: string, templateId: string, systemPrompt: string,modelId: string = 'deepseek-r1') {
  // 1. 容错处理：如果前端没传 modelId，默认用 DeepSeek R1
  const config = CONFIGS[modelId] || CONFIGS['deepseek-r1'];
  // const template = TEMPLATES[templateId] || TEMPLATES['summary'];

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
 * ai对话模型
 * 不强制 JSON，支持自由文本回复
 */
/*
export async function processChat(userMessage: string, modelId: string = 'deepseek-r1') {
  const config = CONFIGS[modelId] || CONFIGS['deepseek-r1'];
  const currentKey = process.env[config.envKey];

  if (!currentKey) {
    return "❌ 配置错误: 未找到 API Key，请检查服务器 .env 文件。";
  }

  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey: currentKey,
    dangerouslyAllowBrowser: true
  });

  console.log(`💬 [Chat] 收到消息: ${userMessage.substring(0, 20)}... 使用模型: ${config.model}`);

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        // 这里的 Prompt 设定为通用助手，而不是 JSON 提取机器
        { role: "system", content: "你是一个乐于助人的 AI 助手。请用简洁、专业的语言回答用户的问题。" },
        { role: "user", content: userMessage }
      ],
      // ❌ 注意：这里千万不能加 response_format: { type: "json_object" }
      temperature: 0.7, // 稍微高一点，让对话更自然
    });

    const rawContent = completion.choices[0].message.content || "（无回复）";
    
    // 依然清洗掉 R1 的思考过程，只保留结论
    const cleanContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    return cleanContent;

  } catch (error: any) {
    console.error("Chat Error:", error);
    return `❌ 对话请求失败: ${error.message}`;
  }
}
 */

 // src/service/ai_handler.ts

import OpenAI from 'openai';

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

// // 2. 定义处理模版
// const TEMPLATES: Record<string, any> = {
//   'summary': {
//     system: '你是一个专业的摘要助手。请把用户的内容总结为 JSON 格式，包含 title(标题), summary(摘要), tags(标签数组)。不要输出 markdown 标记。'
//   },
//   'table': {
//     system: '你是一个数据分析师。请提取内容中的关键数据，整理为 columns(列名数组) 和 data(行数据数组) 的 JSON 格式。'
//   },
//   'list': {
//     system: '你是一个待办事项整理员。请提取内容为 checkItems 数组，每项包含 text(内容) 和 checked(false)。返回 JSON。'
//   }
// };

export async function processContent(htmlContent: string, systemPrompt: string,templateId: string,modelId: string = 'deepseek-r1') {
  // 1. 容错处理：如果前端没传 modelId，默认用 DeepSeek R1
  const config = CONFIGS[modelId] || CONFIGS['deepseek-r1'];
  // const template = TEMPLATES[templateId] || TEMPLATES['summary'];

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
        { role: "user", content: `网页内容如下：\n${htmlContent.substring(0, 15000)}` } 
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    const cleanContent = content?.replace(/```json|```/g, '').trim()|| "";
    
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
 * 纯对话模式    （胡）
 * 不强制 JSON，支持自由文本回复
 */

export async function processChat(userMessage: string, modelId: string = 'deepseek-r1') {
  const config = CONFIGS[modelId] || CONFIGS['deepseek-r1'];
  const currentKey = process.env[config.envKey];

  if (!currentKey) {
    return "❌ 配置错误: 未找到 API Key，请检查服务器 .env 文件。";
  }

  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey: currentKey,
    dangerouslyAllowBrowser: true
  });

  console.log(`💬 [Chat] 收到消息: ${userMessage.substring(0, 20)}... 使用模型: ${config.model}`);

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        // 这里的 Prompt 设定为通用助手，而不是 JSON 提取机器
        { role: "system", content: "你是一个乐于助人的 AI 助手。请用简洁、专业的语言回答用户的问题。" },
        { role: "user", content: userMessage }
      ],
      // ❌ 注意：这里千万不能加 response_format: { type: "json_object" }
      temperature: 0.7, // 稍微高一点，让对话更自然
    });

    const rawContent = completion.choices[0].message.content || "（无回复）";
    
    // 依然清洗掉 R1 的思考过程，只保留结论
    const cleanContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    return cleanContent;

  } catch (error: any) {
    console.error("Chat Error:", error);
    return `❌ 对话请求失败: ${error.message}`;
  }
}
 