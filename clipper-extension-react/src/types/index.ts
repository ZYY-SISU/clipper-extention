export type MessageType =
 | 'CLIP_CONTENT'        // 侧边栏接收内容
 | 'FETCH_TEMPLATES'     // 获取模板列表
 | 'GET_SELECTION'       // 获取选中内容
 | 'ANALYZE'             // 分析
 | 'SAVE_TO_FEISHU'      // 保存到飞书
 | 'OPEN_SIDEPANEL'      // 打开侧边栏
 | 'TOGGLE_PANEL'
 | 'CAPTURE_AND_VISION'  // 截图AI识图
 | 'VISION_RESULT_READY' // AI识图结果已准备好
 | 'CROP_IMAGE'          // 裁剪图片
 | 'GET_VISION_RESULT'   // 获取识图结果
 | string;

// CLIP_CONTENT 的负载结构（允许 text/html 可选，同时扩展来源 URL 等）
export interface ClipContentPayload {
  text?: string;
  html?: string;
  images?: Array<ImageData>;
  links?: Array<LinkData>;
  meta?: PageMeta;
  sourceUrl?: string;
  structuredData?: StructuredDataType | Record<string, unknown>;
}


export type requestType =
 | {type: 'CLIP_CONTENT', payload: ClipContentPayload}
 | {type: 'FETCH_TEMPLATES'}
 | {type: 'GET_SELECTION', payload?: string}
 | {type: 'ANALYZE', payload: {content: string, template: string, model: string}}
 | {type: 'SAVE_TO_FEISHU', payload: {content: string, template: string, model: string, url: string}}
 | {type: 'OPEN_SIDEPANEL'}
 | { type: 'UPDATE_STRUCTURED_DATA';payload: StructuredDataType }
 | { type: 'TOGGLE_PANEL' }
 | { type: 'CAPTURE_AND_VISION'; selection?: { x: number; y: number; width: number; height: number }; pageUrl?: string; isScreenshot?: boolean }
 | { type: 'VISION_RESULT_READY'; payload: ClipContentPayload }
 | { type: 'CROP_IMAGE'; dataUrl: string; selection: { x: number; y: number; width: number; height: number } }
 | { type: 'GET_VISION_RESULT' }


// Chrome 发送方信息（对齐 chrome.runtime.MessageSender 的常用字段，全部可选，避免类型报错）
export interface senderType {
  tab?: {
    id?: number;
    url?: string;
    title?: string;
  };
  frameId?: number;
  id?: string; // extension id or content script id
}

// 响应负载结构（状态 + 可选数据/消息）
export interface ResponsePayload {
  status: 'success' | 'error';
  data?: unknown;
  message?: string;
  isLoading?: boolean;
  result?: unknown;  // AI识图结果
  error?: string;    // 错误信息
  croppedDataUrl?: string;  // 裁剪后的图片
}

// sendResponse 回调类型（便于需要时进行显式标注）
export type sendResponseType = (response: ResponsePayload) => void;


// -----------------------------------------------------------
export interface templateType {
  id: string; 
  name: string; 
  iconType: string;
  isCustom?: boolean;
}

export interface chatHistoryType {
  role: string
  text: string
}

// -----------------------------------------------------------
export interface SelectionData {
  type: string;
  text: string;
  html: string;
  images: Array<ImageData>;
  links: Array<LinkData>;
  meta: PageMeta;
}

export interface PageMeta {
  url: string;
  title: string;
  description: string;
  author: string;
  siteName: string;
  publishedTime: string;
  image: string;
  clipTime: string;
}

export interface PageData {
  type: string;
  text: string;
  html: string;
  images: Array<ImageData>;
  links: Array<LinkData>;
  meta: PageMeta;
}

export interface ImageData {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface LinkData {
  href: string;
  text: string;
}


  // 新的配置结构：包含一个 tables 字典 用来决定保存到哪个表
export interface UserConfig {
    userId: string;
    name: string;
    // avatar: string;
    appToken: string;
    tables: { [key: string]: string }; // key是模版ID(summary/bilibili), value是tableId
  }

  export interface AuthResult {
  user: {
    open_id: string; //  确保后端登录接口一定要返回这个 open_id
    name: string;
    avatar_url: string;
    [key: string]: any;
  };
  token: string;
  expiresIn: number;
}


// // 🟢 [改动] 定义用户配置类型
// export interface UserConfig {
//   userId: string;
//   name: string;
//   // email: string;
//   // avatar: string;
//   token: string;
//   appToken: string;
//   tables: {
//     summary: string;      // 摘要表 ID
//     'video-summary': string; // 视频表 ID
//     default: string;      // 默认表 ID
//     // ... 可根据你的模板扩展 ...
//   };
//   expiresIn: number;
//   loginTime: number;
// }

  // -----------------------------------------------------
  // 后端返回的结构化数据
  export interface StructuredDataType {
    [key: string]: unknown;
    title?: string;
    summary?: string;
    tags?: string[];
    sentiment?: string;
    up_name?: string;
    play_count?: string;
    like_count?: string;
    coin_count?: string;
    collect_count?: string;
    columns?: string[];
    data?: string[];
    text?: string;
    checked?: boolean;
    // 技术文档相关字段
    description?: string;
    category?: string;
    mainSections?: string[];
    parameters?: parameterType[];
    returns?: string;
    examples?: string[];
    keyPoints?: string[];
    relatedLinks?: string[];
    templateId?: string; // 🟢 新增这一行，? 表示它是可选的
  }

  export interface SummaryType {
    title?: string;
    summary?: string;
    tags?: string[];
    sentiment?: string;
    templateId?: string; // 🟢 新增这一行，? 表示它是可选的
  }

  export interface VideoType {
    title?: string;
    summary?: string;
    tags?: string[];
    sentiment?: string;
    up_name?: string;
    play_count?: string;
    like_count?: string;
    coin_count?: string;
    collect_count?: string;
    templateId?: string; // 🟢 新增这一行，? 表示它是可选的
  }

  interface parameterType {
    name: string;
    type: string;
    description: string;
    required?: boolean;
    default?: string;
  }

  export interface TechDocType {
    title?: string;
    description?: string;
    category?: string;
    mainSections?: string[];
    parameters?: parameterType[];
    returns?: string;
    examples?: string[];
    keyPoints?: string[];
    relatedLinks?: string[];
    tags?: string[];
    templateId?: string; // 🟢 新增这一行，? 表示它是可选的
  }