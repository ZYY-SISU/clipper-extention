// src/types.ts

// 定义模板的数据结构
export interface TemplateConfig {
  id: string;
  name: string;
  iconType: 'text' | 'table' | 'check' | 'globe'| 'Video'|'music'; // 图标类型
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

//飞书保存配置
// 🟢 新增：入参需要包含用户的 Token 和 目标表格信息
export interface SaveOptions {
  userAccessToken: string; // 用户的钥匙
  appToken: string;        // 用户的多维表格 ID (Base ID)
  tableId: string;         // 数据表 ID
}

// 结构化数据结果 (AI -> 前端 -> 后端 /api/save)
export interface FeishuData {
  title: string;
  summary: string;
  tags: string[];
  sentiment: string;
  url: string;
  // 🆕 新增字段
  images?: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  links?: Array<{
    href: string;
    text: string;
  }>;
  highlights?: Array<{
    id: string;
    text: string;
    startOffset: number;
    endOffset: number;
    startContainer: string;
    endContainer: string;
  }>;
  [key: string]: any; // 允许其他动态字段
}

//  登录结果 (后端 authService -> 前端)
export interface AuthResult {
  user: {
    name: string;
    avatar_url: string;
    [key: string]: any;
  };
  token: string;
  expiresIn: number;
}