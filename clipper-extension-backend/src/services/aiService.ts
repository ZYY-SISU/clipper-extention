// src/services/aiService.ts
import axios from 'axios';
import { log } from 'console';
// import dotenv from 'dotenv';

// 加载环境变量因为在index已经加载过了。所以这里不需要重复加载，因为这个文件会被调用到index里面执行
// dotenv.config();

export interface StructuredData {
  title: string;
  summary: string;
  tags: string[];
  sentiment: string;
}

const SYSTEM_PROMPT = `
你是一个专业的数据结构化助手。
请分析用户提供的文本，提取以下信息并以严格的 JSON 格式返回：
1. title: 拟定一个简短的标题
2. summary: 50字以内的摘要
3. tags: 3个相关的关键词标签 (数组)
4. sentiment: 内容的情感倾向 (正面/中性/负面)

注意：只能返回 JSON 字符串，不要包含 Markdown 标记。
`;

/**
 * 🟢 修改点：增加 model 参数
 * @param text 用户选中的文本
 * @param model 用户选择的模型ID (默认为 deepseek-chat)
 */

export const analyzeText = async (text: string, model: string = "deepseek-chat"): Promise<StructuredData> => {
  //从服务器环境变量取 Key

  const apiKey = process.env.AI_API_KEY; // 从服务器环境变量取 Key
  const apiUrl = process.env.AI_API_URL || 'https://api.deepseek.com/chat/completions';
  // console.log(apiKey);
  // console.log(process.env.AI_API_KEY);
  

  if (!apiKey) {
    throw new Error("服务端未配置 AI_API_KEY");
  }

  try {
    console.log("正在调用 AI 接口(模型: ${model})...`");
    const response = await axios.post(
      apiUrl,
      {
        model:model, // 或 gpt-3.5-turbo
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const parsedData = JSON.parse(content);
    console.log("AI 分析完成");
    return parsedData;

  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error("AI 分析失败");
  }
};