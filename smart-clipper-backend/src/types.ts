// src/types.ts

// 定义模板的数据结构
export interface TemplateConfig {
  id: string;
  name: string;
  iconType: 'text' | 'table' | 'check' | 'globe'; 
  description: string;
  systemPrompt: string; // 🌟 核心：提示词存在这里
  isCustom?: boolean;   // 标记是否为用户自定义
}

// 定义前端 /api/analyze 发来的数据结构
export interface AnalyzeRequest {
  content: string;      // 前端传来的网页文字
  template: string;     // 模板 ID (前端叫 template)
  model: string;        // 模型 ID (前端叫 model)
}