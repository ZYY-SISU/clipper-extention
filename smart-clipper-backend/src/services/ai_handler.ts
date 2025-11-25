// src/service/ai_handler.ts

import OpenAI from 'openai';

// 1. 定义模型配置
const CONFIGS: Record<string, any> = {
  // --- DeepSeek R1 (使用硅基流动) ---
  'deepseek-r1': {
    baseURL: 'https://api.siliconflow.cn/v1',  // 硅基流动地址
    model: 'deepseek-ai/DeepSeek-R1',         // 硅基流动模型名
    envKey: 'SILICON_KEY'                     
  },
  
  // --- GPT-4o  ---
  'gpt-4o': {
    baseURL: 'https://api.siliconflow.cn/v1',
    model: 'gpt-4o',
    envKey: 'SILICON_KEY'
  },

  // --- GPT-4o mini  ---
  'gpt-4o-mini': {
    baseURL: 'https://api.siliconflow.cn/v1',
    model: 'gpt-4o-mini',
    envKey: 'SILICON_KEY'
  },

  // --- Claude 3.5  ---
  'claude-3-5': {
    baseURL: 'https://api.siliconflow.cn/v1',
    model: 'claude-3-5-sonnet-20240620',
    envKey: 'SILICON_KEY'
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