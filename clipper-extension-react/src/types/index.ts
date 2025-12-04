export type MessageType =
 | 'CLIP_CONTENT'        // 侧边栏接收内容
 | 'FETCH_TEMPLATES'     // 获取模板列表
 | 'GET_SELECTION'       // 获取选中内容
 | 'ANALYZE'             // 分析
 | 'SAVE_TO_FEISHU'      // 保存到飞书
 | 'OPEN_SIDEPANEL'      // 打开侧边栏
 | string;

// CLIP_CONTENT 的负载结构（允许 text/html 可选，同时扩展来源 URL 等）
export interface ClipContentPayload {
  text?: string;
  html?: string;
  images?: Array<ImageData>;
  links?: Array<LinkData>;
  meta?: PageMeta;
  sourceUrl?: string;
}


export type requestType =
 | {type: 'CLIP_CONTENT', payload: ClipContentPayload}
 | {type: 'FETCH_TEMPLATES'}
 | {type: 'GET_SELECTION', payload?: string}
 | {type: 'ANALYZE', payload: {content: string, template: string, model: string}}
 | {type: 'SAVE_TO_FEISHU', payload: {content: string, template: string, model: string, url: string}}
 | {type: 'OPEN_SIDEPANEL'}


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

// export interface UserConfig {
//     appToken: string;
//     tableId: string;
//   }

  // 🟢  新的配置结构：包含一个 tables 字典 用来决定保存到哪个表
export interface UserConfig {
    appToken: string;
    tables: { [key: string]: string }; // key是模版ID(summary/bilibili), value是tableId
  }