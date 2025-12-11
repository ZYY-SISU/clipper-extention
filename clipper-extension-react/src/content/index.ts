// src/content/index.ts
console.log('AI剪藏助手：通用智能抓取脚本已就绪');

// ============【类型定义】=================
import type{ SelectionData, PageMeta, PageData, ImageData, LinkData, ClipContentPayload, HighlightInfo } from '../types/index';

// =============【图标工具函数 - 替换emoji】================
/**
 * 获取SVG图标字符串（用于替代emoji）
 * 基于lucide-react图标库的SVG路径
 */
function getIconSVG(iconName: string, size: number = 16, color: string = 'currentColor'): string {
  const icons: Record<string, string> = {
    'package': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>',
    'book': '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>',
    'lightbulb': '<line x1="9" y1="18" x2="9.01" y2="18"></line><line x1="15" y1="18" x2="15.01" y2="18"></line><path d="M9 9a3 3 0 0 1 6 0c0 2-3 3-3 3"></path><path d="M12 3v3"></path>',
    'shopping-bag': '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path>',
    'newspaper': '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8Z"></path>',
    'video': '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect>',
    'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
    'image': '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>',
    'music': '<circle cx="9" cy="18" r="4"></circle><path d="M9 18V2l13-1v13"></path>',
    'sparkles': '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>',
    'merge': '<path d="M8 18h8M8 12h8M8 6h8"></path><circle cx="4" cy="6" r="1.5"></circle><circle cx="4" cy="12" r="1.5"></circle><circle cx="4" cy="18" r="1.5"></circle>',
    'batch': '<rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect>',
    'compare': '<path d="M21 21l-6-6m6 6v-4.8m0 4.8h-4.8"></path><path d="M3 16.2V21m0 0h4.8M3 21l6-6"></path><path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"></path><path d="M3 7.8V3m0 0h4.8M3 3l6 6"></path>',
    'code': '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
    'bug': '<path d="m8 2 1.88 1.88"></path><path d="M14.12 3.88 16 2"></path><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"></path><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6Z"></path><path d="M12 20v-9"></path><path d="M6.53 9C4.6 8.8 3 7.1 3 5"></path><path d="M6 13H2"></path><path d="M3 21c0-2.1 1.7-3.9 3.8-4"></path><path d="M21 21c-2.1 0-3.8-1.9-3.8-4"></path><path d="M18 13h4"></path><path d="M17.47 9c1.93-.2 3.53-1.9 3.53-4"></path>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 5H8"></path>',
    'highlighter': '<path d="m9 11-6 6v3h3l6-6"></path><path d="m21.5 11.5-6.5 6.5-4-4 6.5-6.5a2.5 2.5 0 1 1 4 4Z"></path>',
  };
  
  const path = icons[iconName] || icons['sparkles'];
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

/**
 * 获取图标HTML（用于内联显示）
 */
function getIconHTML(iconName: string, size: number = 16, color: string = 'currentColor'): string {
  return getIconSVG(iconName, size, color);
}

// =============【状态管理】================
let toolbar: HTMLElement | null = null;
let selectedData: SelectionData | null = null;
let toastElement: HTMLElement | null = null;
let loadingToast: HTMLElement | null = null;
let multipleSelections: SelectionData[] = []; // 多选支持
// let highlightOverlay: HTMLElement | null = null; // 高亮覆盖层 - 已废弃，改用 highlightedRanges
let multiSelectionHighlights: HTMLElement[] = []; // 多选高亮元素
let highlightedRanges: Array<{range: Range, overlay: HTMLElement, id: string}> = []; // 持久高亮列表
let highlightIdCounter = 0; // 高亮ID计数器
let contextAwarePanel: HTMLElement | null = null; // 上下文感知浮动窗口

// 🟢 用户行为追踪（用于第三层智能识别）
let userBehaviorHistory: Array<{
  timestamp: number;
  action: 'select' | 'clip' | 'merge' | 'highlight';
  url: string;
  selectionCount?: number;
  selectionText?: string;
}> = [];

// ✨ [新增] 全局开关状态与悬浮球元素
let isGlobalActive: boolean = true; // 默认为开启
let suspensionBall: HTMLElement | null = null;

//  [AI 识图] 缓存最近一次识图结果
let lastVisionResult: { text?: string; html?: string; structuredData?: unknown; raw?: string } | null = null;

// =============【智能意图识别系统 - 类型定义】================
// 第一层：识别内容类型
interface ContentTypeDetection {
  type: 'code' | 'table' | 'api-doc' | 'product' | 'contact' | 'paragraph' | 'unknown';
  confidence: number;
  template?: string;
  prefillFields?: Record<string, any>;
}

// 第二层：识别网页类型
interface PageTypeDetection {
  type: string;
  autoActions: Array<{label: string; action: string; autoExecute?: boolean; icon?: string}>;
}

// 第三层：识别用户行为意图
interface UserIntentDetection {
  intent: 'merge' | 'batch-collect' | 'compare' | 'continue-selecting' | 'task-complete' | 'unknown';
  confidence: number;
  suggestedAction?: string;
}

// =============【智能意图识别系统 - 实现函数】================
// 第一层：识别内容类型 → 自动推荐模板（优化版：提高检测精度）
function detectContentType(selection: Selection, range: Range): ContentTypeDetection {
  const selectedText = selection.toString().trim();
  const container = range.commonAncestorContainer as HTMLElement;
  const parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
  
  // 计算文本特征
  const textLength = selectedText.length;
  const lineCount = selectedText.split('\n').length;
  const hasSpecialChars = /[{}();=]/.test(selectedText);
  const hasNumbers = /\d/.test(selectedText);
  
  // 1. 检测代码片段（增强版：更精确的代码识别）
  const codeElements = parentElement?.querySelectorAll('pre, code, .highlight, .code-block, [class*="code"]') || [];
  const codeIndicators = [
    codeElements.length > 0,
    /^[\s\S]*\{[\s\S]*\}$/.test(selectedText), // 包含大括号
    /function\s+\w+\s*\(/.test(selectedText), // 函数定义
    /(const|let|var)\s+\w+\s*=/.test(selectedText), // 变量声明
    /(def|class|import|from)\s+\w+/.test(selectedText), // Python/JS关键字
    /(public|private|static|void|class)\s+/.test(selectedText), // Java关键字
    hasSpecialChars && lineCount > 1 && (hasSpecialChars || /[{}();=]/.test(selectedText)), // 多行且包含特殊字符
    parentElement?.closest('pre, code, .code-block, [class*="code"]') !== null // 在代码容器内
  ];
  const codeScore = codeIndicators.filter(Boolean).length;
  if (codeScore >= 2) {
    const codeText = Array.from(codeElements).map(el => el.textContent).join('\n') || selectedText;
    const language = detectCodeLanguage(codeText);
    return {
      type: 'code',
      confidence: Math.min(0.95, 0.7 + codeScore * 0.05), // 动态置信度
      template: 'code-snippet',
      prefillFields: { language, code: codeText, sourceUrl: window.location.href }
    };
  }
  
  // 2. 检测表格（增强版：更精确的表格识别）
  const tableElement = parentElement?.closest('table') || parentElement?.querySelector('table');
  if (tableElement) {
    const rows = tableElement.querySelectorAll('tr');
    const hasHeader = tableElement.querySelector('thead, th') !== null;
    if (rows.length >= 2) { // 至少2行才认为是表格
      const tableData = extractTableData(tableElement);
      return {
        type: 'table',
        confidence: 0.95 + (hasHeader ? 0.03 : 0), // 有表头提高置信度
        template: 'table-extract',
        prefillFields: { headers: tableData.headers, rows: tableData.rows }
      };
    }
  }
  
  // 3. 检测API文档（增强版：更精确的API识别）
  const apiIndicators = [
    /^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+\//.test(selectedText), // HTTP方法
    /\/api\/|\/v\d+\//.test(selectedText), // API路径模式
    /(endpoint|api|request|response|status\s*code)/i.test(selectedText), // API关键词
    parentElement?.querySelector('.api-endpoint, .api-doc, [class*="api"], [class*="endpoint"]') !== null,
    /(query|body|params|headers?)\s*[:=]/.test(selectedText) // 请求参数模式
  ];
  const apiScore = apiIndicators.filter(Boolean).length;
  if (apiScore >= 2) {
    const methodMatch = selectedText.match(/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)/);
    const endpointMatch = selectedText.match(/(?:https?:\/\/[^\s]+|\/[^\s]+)/);
    return {
      type: 'api-doc',
      confidence: Math.min(0.95, 0.75 + apiScore * 0.05),
      template: 'api-doc',
      prefillFields: {
        endpoint: endpointMatch?.[0] || selectedText.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/)?.[2],
        method: methodMatch?.[1] || 'GET'
      }
    };
  }
  
  // 4. 检测商品信息（增强版：更精确的商品识别）
  const productIndicators = [
    /(¥|\$|元|价格|￥)\s*\d+/.test(selectedText), // 价格格式
    /(加入购物车|立即购买|库存|销量|评价)/i.test(selectedText), // 电商关键词
    parentElement?.querySelector('.product-info, .price, [class*="product"], [class*="goods"]') !== null,
    /(商品|产品|规格|型号|品牌)/i.test(selectedText) && hasNumbers // 商品描述+数字
  ];
  const productScore = productIndicators.filter(Boolean).length;
  if (productScore >= 2) {
    return {
      type: 'product',
      confidence: Math.min(0.9, 0.7 + productScore * 0.05),
      template: 'ecommerce-product',
      prefillFields: {
        price: selectedText.match(/[¥$￥]\s*\d+\.?\d*/)?.[0] || selectedText.match(/\d+\.?\d*\s*元/)?.[0],
        productName: parentElement?.querySelector('h1, .product-title, [class*="title"]')?.textContent?.trim() || ''
      }
    };
  }
  
  // 5. 检测联系方式（增强版：更精确的联系方式识别）
  const phoneRegex = /(1[3-9]\d{9}|(\d{3,4}[- ]?)?\d{7,8})/;
  const emailRegex = /[\w\.-]+@[\w\.-]+\.\w{2,}/;
  const contactIndicators = [
    phoneRegex.test(selectedText),
    emailRegex.test(selectedText),
    /(电话|手机|联系|邮箱|email|tel|phone)/i.test(selectedText),
    parentElement?.querySelector('[href^="tel:"], [href^="mailto:"]') !== null
  ];
  const contactScore = contactIndicators.filter(Boolean).length;
  if (contactScore >= 2) {
    return {
      type: 'contact',
      confidence: Math.min(0.95, 0.8 + contactScore * 0.05),
      template: 'contact',
      prefillFields: {
        phone: selectedText.match(phoneRegex)?.[0],
        email: selectedText.match(emailRegex)?.[0]
      }
    };
  }
  
  // 6. 检测列表（增强版：更精确的列表识别）
  const listElement = parentElement?.closest('ul, ol, dl') || parentElement?.querySelector('ul, ol, dl');
  const listItemCount = selectedText.split('\n').filter(line => {
    const trimmed = line.trim();
    return /^[-*•\d+\.]/.test(trimmed) || /^[a-zA-Z]\)/.test(trimmed) || trimmed.startsWith('·');
  }).length;
  
  if (listElement || listItemCount >= 2) {
    const isOrderedList = /^\d+[\.\)]/.test(selectedText.split('\n')[0]?.trim() || '');
    const listType = isOrderedList ? 'ordered-list' : 'unordered-list';
    return {
      type: 'list',
      confidence: listItemCount >= 3 ? 0.9 : 0.75,
      template: 'summary',
      prefillFields: { 
        title: document.title, 
        summary: selectedText, 
        originalText: selectedText,
        listType 
      }
    };
  }
  
  // 7. 检测引用/引用块（新增）
  const quoteElement = parentElement?.closest('blockquote, .quote, [class*="quote"]') || 
                       parentElement?.querySelector('blockquote, .quote');
  if (quoteElement || selectedText.startsWith('"') || selectedText.startsWith('「') || selectedText.startsWith('"')) {
    return {
      type: 'quote',
      confidence: 0.85,
      template: 'summary',
      prefillFields: { title: document.title, summary: selectedText, originalText: selectedText }
    };
  }
  
  // 8. 检测标题（新增）
  const headingElement = parentElement?.closest('h1, h2, h3, h4, h5, h6, .title, .heading') ||
                         parentElement?.querySelector('h1, h2, h3, h4, h5, h6');
  if (headingElement || (textLength < 100 && lineCount === 1 && !hasSpecialChars)) {
    const headingLevel = headingElement?.tagName?.match(/h(\d)/)?.[1] || '1';
    return {
      type: 'heading',
      confidence: 0.8,
      template: 'summary',
      prefillFields: { 
        title: selectedText, 
        summary: '', 
        originalText: selectedText,
        headingLevel: parseInt(headingLevel)
      }
    };
  }
  
  // 9. 检测日期时间（新增）
  const dateTimePatterns = [
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/, // YYYY-MM-DD
    /\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY
    /\d{4}年\d{1,2}月\d{1,2}日/, // 中文日期
    /\d{1,2}:\d{2}(:\d{2})?/, // 时间
    /(今天|明天|昨天|本周|下周|上周|本月|下月|上月)/i
  ];
  if (dateTimePatterns.some(pattern => pattern.test(selectedText)) && textLength < 50) {
    return {
      type: 'datetime',
      confidence: 0.9,
      template: 'summary',
      prefillFields: { title: document.title, summary: selectedText, originalText: selectedText }
    };
  }
  
  // 10. 检测链接/URL（新增）
  const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/i;
  if (urlPattern.test(selectedText) && textLength < 200) {
    const urls = selectedText.match(urlPattern);
    return {
      type: 'link',
      confidence: 0.95,
      template: 'summary',
      prefillFields: { 
        title: document.title, 
        summary: selectedText, 
        originalText: selectedText,
        urls: urls || []
      }
    };
  }
  
  // 11. 检测图片描述（新增）
  const imageElement = parentElement?.closest('img')?.parentElement || 
                       parentElement?.querySelector('img');
  if (imageElement && textLength < 200) {
    const imgAlt = (imageElement as HTMLImageElement).alt || '';
    if (imgAlt || textLength < 100) {
      return {
        type: 'image-caption',
        confidence: 0.8,
        template: 'summary',
        prefillFields: { 
          title: document.title, 
          summary: selectedText || imgAlt, 
          originalText: selectedText,
          imageUrl: (imageElement as HTMLImageElement).src
        }
      };
    }
  }
  
  // 12. 普通段落（优化：更智能的段落识别）
  if (textLength > 20 && lineCount <= 10) { // 至少20字符，不超过10行
    const isParagraph = !hasSpecialChars || (hasSpecialChars && textLength > 100); // 长文本即使有特殊字符也可能是段落
    if (isParagraph) {
      // 检查是否是结构化段落（如FAQ、步骤说明）
      const isStructured = /(问|答|步骤|第\d+[步点]|Q\d+|A\d+)/i.test(selectedText);
      return {
        type: 'paragraph',
        confidence: Math.min(0.75, 0.5 + Math.min(textLength / 200, 0.25)), // 根据长度动态调整
        template: 'summary',
        prefillFields: { 
          title: document.title, 
          summary: selectedText.substring(0, 200), 
          originalText: selectedText,
          isStructured
        }
      };
    }
  }
  
  // 13. 未知类型（但至少返回一个结果）
  return {
    type: 'unknown',
    confidence: 0.5,
    template: 'summary',
    prefillFields: { title: document.title, summary: selectedText.substring(0, 200), originalText: selectedText }
  };
}

function detectCodeLanguage(code: string): string {
  const patterns: Record<string, RegExp> = {
    'javascript': /function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=/,
    'python': /def\s+\w+|import\s+\w+|print\(/,
    'java': /public\s+class|public\s+static\s+void\s+main/,
    'html': /<[a-z]+[^>]*>/i,
    'css': /[a-z-]+\s*:\s*[^;]+;/i,
    'sql': /SELECT\s+.+\s+FROM/i
  };
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(code)) return lang;
  }
  return 'unknown';
}

function extractTableData(table: HTMLTableElement): { headers: string[], rows: string[][] } {
  const headers: string[] = [];
  const rows: string[][] = [];
  const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
  if (headerRow) {
    headerRow.querySelectorAll('th, td').forEach(cell => headers.push(cell.textContent?.trim() || ''));
  }
  table.querySelectorAll('tbody tr, tr').forEach((row, idx) => {
    if (idx === 0 && !table.querySelector('thead')) return;
    const rowData: string[] = [];
    row.querySelectorAll('td').forEach(cell => rowData.push(cell.textContent?.trim() || ''));
    if (rowData.length > 0) rows.push(rowData);
  });
  return { headers, rows };
}

// 第二层：识别网页类型 → 自动调整提取策略（增强版：更深入的网址、内容、行为识别）
function detectPageType(): PageTypeDetection {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  const url = window.location.href;
  const title = document.title.toLowerCase();
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content')?.toLowerCase() || '';
  const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute('content')?.toLowerCase() || '';
  
  // 综合内容特征检测
  const hasVideoPlayer = document.querySelector('video, iframe[src*="youtube"], iframe[src*="bilibili"], .video-player, [class*="video"]') !== null;
  const hasProductInfo = document.querySelector('.price, [class*="price"], [class*="product"], [data-product-id], [itemprop="price"]') !== null;
  const hasArticleContent = document.querySelector('article, .article, .post, .content, [role="article"]') !== null;
  const hasCodeContent = document.querySelector('pre, code, .highlight, .code-block') !== null;
  
  // 1. GitHub相关页面（增强识别）
  if (hostname.includes('github.com')) {
    if (/\/[^\/]+\/[^\/]+$/.test(pathname) && !pathname.includes('/issues') && !pathname.includes('/pull')) {
      return {
        type: 'github-repo',
        autoActions: [{ label: '一键提取仓库信息', action: 'extract-github-repo', autoExecute: false, icon: 'package' }]
      };
    }
    if (pathname.includes('/blob/') || pathname.includes('/tree/')) {
      return { type: 'github-code', autoActions: [{ label: '提取代码文件', action: 'extract-code', autoExecute: false, icon: 'code' }] };
    }
    if (pathname.includes('/issues/') || pathname.includes('/pull/')) {
      return { type: 'github-issue', autoActions: [{ label: '提取Issue/PR信息', action: 'extract-issue', autoExecute: false, icon: 'bug' }] };
    }
  }
  
  // 2. 技术文档平台（增强识别）
  const techDocPatterns = [
    /docs?\./i, /documentation/i, /api/i, /guide/i, /tutorial/i,
    /developer\./i, /dev\./i, /learn\./i, /reference/i
  ];
  const isTechDoc = techDocPatterns.some(pattern => 
    pattern.test(hostname) || pattern.test(pathname) || pattern.test(title)
  );
  if (isTechDoc || hasCodeContent) {
    return { type: 'tech-doc', autoActions: [{ label: '文档提取模式', action: 'doc-extract-mode', autoExecute: true, icon: 'book' }] };
  }
  
  // 3. 问答社区（增强识别）
  const qaDomains = ['stackoverflow.com', 'zhihu.com', 'segmentfault.com', 'juejin.cn', 'csdn.net'];
  const isQAPage = qaDomains.some(domain => hostname.includes(domain)) || 
                   pathname.includes('/questions/') || pathname.includes('/question/') ||
                   pathname.includes('/answer/') || document.querySelector('.question, .answer, [class*="question"]') !== null;
  if (isQAPage) {
    return { type: 'stackoverflow', autoActions: [{ label: '提取问题+最佳答案', action: 'extract-so-qa', autoExecute: false, icon: 'lightbulb' }] };
  }
  
  // 4. 电商平台（增强识别）
  const ecommerceDomains = ['taobao.com', 'tmall.com', 'jd.com', 'pdd.com', 'amazon.com', 'amazon.cn', 
                            '1688.com', 'suning.com', 'gome.com.cn', 'dangdang.com'];
  const isEcommerce = ecommerceDomains.some(domain => hostname.includes(domain)) ||
                     hasProductInfo ||
                     ogType === 'product' ||
                     document.querySelector('[itemtype*="Product"], [itemprop="product"]') !== null;
  if (isEcommerce) {
    return { type: 'ecommerce-product', autoActions: [{ label: '提取商品信息', action: 'extract-product-info', autoExecute: false, icon: 'shopping-bag' }] };
  }
  
  // 5. 视频平台（增强识别）
  const videoDomains = ['bilibili.com', 'youtube.com', 'youku.com', 'iqiyi.com', 'v.qq.com', 'acfun.cn', 
                        'douyin.com', 'kuaishou.com', 'tiktok.com'];
  const isVideoPage = videoDomains.some(domain => hostname.includes(domain)) ||
                     pathname.includes('/video/') || pathname.includes('/watch') ||
                     hasVideoPlayer ||
                     ogType === 'video.movie' || ogType === 'video.episode';
  if (isVideoPage) {
    return { type: 'bilibili-video', autoActions: [{ label: '提取视频信息', action: 'extract-bilibili-video', autoExecute: false, icon: 'video' }] };
  }
  
  // 6. 文章/博客平台（增强识别）
  const articleDomains = ['mp.weixin.qq.com', 'jianshu.com', 'cnblogs.com', 'oschina.net', 'infoq.cn',
                         'medium.com', 'dev.to', 'hashnode.com'];
  const isArticle = articleDomains.some(domain => hostname.includes(domain)) ||
                   hasArticleContent ||
                   ogType === 'article' ||
                   document.querySelector('[itemtype*="Article"], [itemprop="articleBody"]') !== null ||
                   (metaDescription && (metaDescription.includes('文章') || metaDescription.includes('blog')));
  if (isArticle) {
    return { type: 'wechat-article', autoActions: [{ label: '提取文章信息', action: 'extract-wechat-article', autoExecute: false, icon: 'newspaper' }] };
  }
  
  // 7. 音乐平台（新增）
  const musicDomains = ['y.qq.com', 'music.163.com', 'kugou.com', 'kuwo.cn', 'spotify.com', 'music.apple.com'];
  if (musicDomains.some(domain => hostname.includes(domain)) || 
      pathname.includes('/song/') || pathname.includes('/album/') || pathname.includes('/playlist/')) {
    return { type: 'music', autoActions: [{ label: '提取音乐信息', action: 'extract-music', autoExecute: false, icon: 'music' }] };
  }
  
  // 8. 新闻平台（新增）
  const newsDomains = ['news.qq.com', 'news.sina.com.cn', 'news.163.com', 'xinhuanet.com', 'people.com.cn'];
  if (newsDomains.some(domain => hostname.includes(domain)) || ogType === 'article' && title.includes('新闻')) {
    return { type: 'news', autoActions: [{ label: '提取新闻信息', action: 'extract-news', autoExecute: false, icon: 'newspaper' }] };
  }
  
  // 9. 社交媒体（新增）
  if (hostname.includes('weibo.com') || hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return { type: 'social-media', autoActions: [{ label: '提取动态信息', action: 'extract-post', autoExecute: false, icon: 'sparkles' }] };
  }
  
  // 10. 知识库/Wiki（新增）
  if (hostname.includes('wiki') || pathname.includes('/wiki/') || document.querySelector('.wiki, [class*="wiki"]') !== null) {
    return { type: 'wiki', autoActions: [{ label: '提取Wiki内容', action: 'extract-wiki', autoExecute: false, icon: 'book' }] };
  }
  
  return { type: 'general', autoActions: [] };
}

// 第三层：识别用户行为意图（增强版：更深入的行为分析）
function detectUserIntent(): UserIntentDetection {
  const recentActions = userBehaviorHistory.slice(-20); // 扩大历史记录范围到20条
  const currentUrl = window.location.href;
  const now = Date.now();
  
  // 计算行为统计
  const recentSelects = recentActions.filter(a => a.action === 'select' && a.url === currentUrl);
  const recentClips = recentActions.filter(a => a.action === 'clip');
  const recentHighlights = recentActions.filter(a => a.action === 'highlight');
  
  // 1. 连续选中多段内容 → 想合并剪藏（增强版：更精确的时间分析）
  if (recentSelects.length >= 2) {
    const timeGaps: number[] = [];
    for (let i = 1; i < recentSelects.length; i++) {
      timeGaps.push(recentSelects[i].timestamp - recentSelects[i-1].timestamp);
    }
    const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
    const minGap = Math.min(...timeGaps);
    const maxGap = Math.max(...timeGaps);
    
    // 多维度判断：时间间隔、选择数量、选择位置
    let confidence = 0.7;
    if (avgGap < 3000) confidence = 0.95; // 3秒内多次选择
    else if (avgGap < 5000) confidence = 0.85; // 5秒内
    else if (avgGap < 10000) confidence = 0.75; // 10秒内
    
    // 如果选择间隔很稳定，更可能是合并意图
    if (maxGap - minGap < 2000 && recentSelects.length >= 3) {
      confidence = Math.min(0.98, confidence + 0.1);
    }
    
    // 检查选择内容是否相关（通过关键词重叠）
    if (recentSelects.length >= 2) {
      const texts = recentSelects.map(a => a.selectionText?.toLowerCase() || '').filter(t => t.length > 0);
      if (texts.length >= 2) {
        const commonWords = new Set<string>();
        texts[0].split(/\s+/).forEach(word => {
          if (word.length > 2 && texts.slice(1).every(t => t.includes(word))) {
            commonWords.add(word);
          }
        });
        if (commonWords.size >= 2) {
          confidence = Math.min(0.98, confidence + 0.1); // 有共同关键词，提高置信度
        }
      }
    }
    
    return { intent: 'merge', confidence, suggestedAction: '显示"追加到当前剪藏"按钮' };
  }
  
  // 2. 同一网站连续剪藏多次 → 批量收集（增强版：更智能的网站识别）
  const sameSiteClips = recentClips.filter(a => {
    try { 
      const aHost = new URL(a.url).hostname.replace(/^www\./, '');
      const currentHost = new URL(currentUrl).hostname.replace(/^www\./, '');
      return aHost === currentHost;
    } catch { return false; }
  });
  
  if (sameSiteClips.length >= 2) {
    const clipTimes = sameSiteClips.map(a => a.timestamp).sort((a, b) => a - b);
    const timeSpan = clipTimes[clipTimes.length - 1] - clipTimes[0];
    
    let confidence = 0.7;
    if (timeSpan < 30000) confidence = 0.95; // 30秒内
    else if (timeSpan < 60000) confidence = 0.9; // 1分钟内
    else if (timeSpan < 300000) confidence = 0.8; // 5分钟内
    else confidence = 0.7;
    
    // 如果剪藏的是相似路径（如文章列表），置信度更高
    const paths = sameSiteClips.map(a => {
      try { return new URL(a.url).pathname; } catch { return ''; }
    });
    const pathPattern = paths[0]?.match(/^\/[^\/]+\//)?.[0];
    if (pathPattern && paths.every(p => p.startsWith(pathPattern))) {
      confidence = Math.min(0.98, confidence + 0.1);
    }
    
    if (sameSiteClips.length >= 3) {
      return { intent: 'batch-collect', confidence, suggestedAction: '提示"是否开启批量模式？"' };
    }
  }
  
  // 3. 同一页面反复选择不同区域 → 在做对比（增强版：更精确的对比识别）
  if (recentSelects.length >= 3) {
    const compareKeywords = /(优点|缺点|对比|比较|vs|versus|差异|不同|相同|相似|优劣|好坏|哪个|选择|推荐)/i;
    const hasCompareKeywords = recentSelects.some(a => 
      a.selectionText && compareKeywords.test(a.selectionText)
    );
    
    // 检查选择内容长度：对比通常选择相似长度的内容
    const textLengths = recentSelects.map(a => a.selectionText?.length || 0).filter(l => l > 0);
    const lengthVariance = textLengths.length > 1 ? 
      Math.max(...textLengths) / Math.min(...textLengths) : 1;
    const isSimilarLength = lengthVariance < 2.5; // 长度差异小于2.5倍
    
    // 检查选择位置：对比通常选择相邻区域
    const selectionRects = recentSelects.map(a => {
      const range = window.getSelection()?.getRangeAt(0);
      return range?.getBoundingClientRect();
    }).filter(r => r !== undefined);
    
    let isAdjacent = false;
    if (selectionRects.length >= 2) {
      const distances = [];
      for (let i = 1; i < selectionRects.length; i++) {
        const prev = selectionRects[i-1];
        const curr = selectionRects[i];
        if (prev && curr) {
          const distance = Math.abs(curr.top - (prev.top + prev.height));
          distances.push(distance);
        }
      }
      isAdjacent = distances.every(d => d < 200); // 相邻区域距离小于200px
    }
    
    if (hasCompareKeywords || (isSimilarLength && recentSelects.length >= 3) || isAdjacent) {
      const confidence = hasCompareKeywords ? 0.95 : (isAdjacent ? 0.85 : 0.75);
      return { intent: 'compare', confidence, suggestedAction: '提示"是否创建对比表格？"' };
    }
  }
  
  // 4. 选中内容后没有立即剪藏 → 可能在犹豫/想继续选（增强版：更细致的时间分析）
  const lastSelect = recentActions.find(a => a.action === 'select');
  if (lastSelect) {
    const timeSinceSelect = now - lastSelect.timestamp;
    const selectionLength = lastSelect.selectionText?.length || 0;
    
    // 2-5秒：可能在思考
    if (timeSinceSelect > 2000 && timeSinceSelect < 5000) {
      const isShortSelection = selectionLength < 50;
      return { 
        intent: 'continue-selecting', 
        confidence: isShortSelection ? 0.85 : 0.65, 
        suggestedAction: '保持选区高亮，可继续追加选择' 
      };
    }
    
    // 5-10秒：可能在继续选择或犹豫
    if (timeSinceSelect > 5000 && timeSinceSelect < 10000) {
      // 如果选择很短且没有后续操作，更可能是想继续选择
      if (selectionLength < 30 && recentActions.filter(a => a.timestamp > lastSelect.timestamp && a.action !== 'select').length === 0) {
        return { 
          intent: 'continue-selecting', 
          confidence: 0.75, 
          suggestedAction: '保持选区高亮，可继续追加选择' 
        };
      }
    }
    
    // 超过10秒未操作：可能已完成任务或放弃
    if (timeSinceSelect > 10000) {
      const hasClipAfter = recentActions.some(a => a.timestamp > lastSelect.timestamp && a.action === 'clip');
      if (!hasClipAfter) {
        return { intent: 'task-complete', confidence: 0.7, suggestedAction: '提示"是否已完成剪藏？"' };
      }
    }
  }
  
  // 5. 检测快速连续操作模式（增强版：更精确的快速操作识别）
  const rapidActions = recentActions.filter(a => now - a.timestamp < 3000);
  if (rapidActions.length >= 3) {
    const allSelects = rapidActions.every(a => a.action === 'select');
    const selectClipPattern = rapidActions.some((a, i) => 
      i > 0 && a.action === 'clip' && rapidActions[i-1].action === 'select'
    );
    
    if (allSelects) {
      return { intent: 'merge', confidence: 0.9, suggestedAction: '检测到快速多选，建议合并剪藏' };
    }
    if (selectClipPattern && rapidActions.length >= 4) {
      return { intent: 'batch-collect', confidence: 0.85, suggestedAction: '检测到快速剪藏模式' };
    }
  }
  
  // 6. 检测高亮模式（新增：用户频繁高亮可能是想标记重点）
  if (recentHighlights.length >= 3) {
    const highlightTimes = recentHighlights.map(a => a.timestamp).sort((a, b) => a - b);
    const timeSpan = highlightTimes[highlightTimes.length - 1] - highlightTimes[0];
    if (timeSpan < 60000) { // 1分钟内多次高亮
      return { intent: 'highlight-focus', confidence: 0.8, suggestedAction: '检测到频繁高亮，建议提取高亮内容' };
    }
  }
  
  // 7. 检测阅读模式（新增：长时间停留但无操作）
  const pageLoadTime = recentActions.find(a => a.url === currentUrl)?.timestamp || now;
  const timeOnPage = now - pageLoadTime;
  if (timeOnPage > 60000 && recentActions.filter(a => a.url === currentUrl && a.action === 'clip').length === 0) {
    // 页面停留超过1分钟但未剪藏，可能是深度阅读
    const hasScroll = window.scrollY > window.innerHeight;
    if (hasScroll) {
      return { intent: 'deep-reading', confidence: 0.6, suggestedAction: '检测到深度阅读，建议提取全文' };
    }
  }
  
  return { intent: 'unknown', confidence: 0 };
}

// =============【上下文感知工具函数（旧版，保留兼容）】================
/**
 * 检测当前网站类型并返回相关操作建议
 */
// @ts-expect-error - 这个函数保留供未来功能使用
function _detectSiteContext(): { type: string; suggestions: Array<{label: string; action: string; icon: string}> } {
  const hostname = window.location.hostname;
  
  // GitHub
  if (hostname.includes('github.com')) {
    return {
      type: 'github',
      suggestions: [
        { label: '提取代码片段', action: 'extract-code', icon: '💻' },
        { label: '查看README', action: 'view-readme', icon: '📖' },
        { label: '复制仓库链接', action: 'copy-repo', icon: '🔗' },
        { label: '查看Issues', action: 'view-issues', icon: '🐛' }
      ]
    };
  }
  
  // 技术文档/博客
  if (hostname.includes('stackoverflow.com') || hostname.includes('medium.com') || 
      hostname.includes('dev.to') || hostname.includes('juejin.cn') || 
      hostname.includes('zhihu.com') || hostname.includes('segmentfault.com')) {
    return {
      type: 'tech-blog',
      suggestions: [
        { label: '提取代码示例', action: 'extract-code', icon: '💻' },
        { label: '保存为技术笔记', action: 'save-note', icon: '📝' },
        { label: '翻译内容', action: 'translate', icon: '🌐' },
        { label: '生成摘要', action: 'summarize', icon: '📄' }
      ]
    };
  }
  
  // 视频平台
  if (hostname.includes('bilibili.com') || hostname.includes('youtube.com') || 
      hostname.includes('youku.com') || hostname.includes('iqiyi.com')) {
    return {
      type: 'video',
      suggestions: [
        { label: '提取视频信息', action: 'extract-video', icon: '🎬' },
        { label: '保存字幕', action: 'save-subtitle', icon: '📝' },
        { label: '生成视频摘要', action: 'video-summary', icon: '📄' }
      ]
    };
  }
  
  // 购物网站
  if (hostname.includes('taobao.com') || hostname.includes('tmall.com') || 
      hostname.includes('jd.com') || hostname.includes('amazon.com')) {
    return {
      type: 'shopping',
      suggestions: [
        { label: '提取商品信息', action: 'extract-product', icon: '🛍️' },
        { label: '比价', action: 'compare-price', icon: '💰' },
        { label: '保存到购物清单', action: 'save-wishlist', icon: '📋' }
      ]
    };
  }
  
  // 新闻/资讯
  if (hostname.includes('news.') || hostname.includes('sina.com') || 
      hostname.includes('163.com') || hostname.includes('qq.com')) {
    return {
      type: 'news',
      suggestions: [
        { label: '提取关键信息', action: 'extract-key-info', icon: '📰' },
        { label: '生成新闻摘要', action: 'news-summary', icon: '📄' },
        { label: '保存到稍后读', action: 'save-later', icon: '📚' }
      ]
    };
  }
  
  // 代码相关（检测代码块）
  const hasCodeBlocks = document.querySelectorAll('pre, code, .highlight').length > 0;
  if (hasCodeBlocks) {
    return {
      type: 'code',
      suggestions: [
        { label: '提取代码', action: 'extract-code', icon: '💻' },
        { label: '格式化代码', action: 'format-code', icon: '✨' },
        { label: '检查语法', action: 'check-syntax', icon: '✓' }
      ]
    };
  }
  
  // 默认建议
  return {
    type: 'general',
    suggestions: [
      { label: '智能摘要', action: 'summarize', icon: '📄' },
      { label: '翻译内容', action: 'translate', icon: '🌐' },
      { label: '提取链接', action: 'extract-links', icon: '🔗' },
      { label: '保存图片', action: 'save-images', icon: '📷' }
    ]
  };
}

/**
 * 🟢 创建智能建议浮动窗口（三层智能识别）
 */
function createContextAwarePanel(rect: DOMRect, selection?: Selection, range?: Range): void {
  if (contextAwarePanel) {
    contextAwarePanel.remove();
  }
  
  // 第一层：识别内容类型
  let contentType: ContentTypeDetection | null = null;
  let pageType: PageTypeDetection | null = null;
  let userIntent: UserIntentDetection | null = null;
  
  if (selection && range) {
    contentType = detectContentType(selection, range);
    console.log('[智能识别] 内容类型:', contentType);
  }
  
  // 第二层：识别网页类型
  pageType = detectPageType();
  console.log('[智能识别] 网页类型:', pageType);
  
  // 第三层：识别用户行为意图
  userIntent = detectUserIntent();
  console.log('[智能识别] 用户意图:', userIntent);
  
  // 构建智能建议内容
  const suggestions: Array<{label: string; action: string; icon: string; autoExecute?: boolean}> = [];
  
  // 优先显示内容类型识别结果（降低阈值，让更多内容能被识别）
  if (contentType && contentType.confidence > 0.5) {
    const templateMap: Record<string, {label: string; icon: string}> = {
      'code': { label: `检测到代码片段，推荐使用代码模板`, icon: 'code' },
      'table': { label: `检测到表格数据，推荐使用表格模板`, icon: 'file-text' },
      'api-doc': { label: `检测到API文档，推荐使用API文档模板`, icon: 'link' },
      'product': { label: `检测到商品信息，推荐使用电商模板`, icon: 'shopping-bag' },
      'contact': { label: `检测到联系方式，推荐使用联系人模板`, icon: 'link' },
      'paragraph': { label: `检测到普通段落，推荐使用摘要模板`, icon: 'file-text' },
      'unknown': { label: `智能推荐模板`, icon: 'sparkles' }
    };
    
    const templateInfo = templateMap[contentType.type] || { label: '智能推荐模板', icon: 'sparkles' };
    suggestions.push({
      label: templateInfo.label,
      action: `use-template-${contentType.template || 'summary'}`,
      icon: templateInfo.icon,
      autoExecute: false
    });
  }
  
  // 显示网页类型相关操作
  if (pageType.autoActions.length > 0) {
    pageType.autoActions.forEach(action => {
      suggestions.push({
        label: action.label,
        action: action.action,
        icon: action.icon || 'sparkles',
        autoExecute: action.autoExecute
      });
    });
  }
  
  // 显示用户行为意图建议（降低阈值）
  if (userIntent && userIntent.confidence > 0.5) {
    const intentMap: Record<string, {label: string; icon: string}> = {
      'merge': { label: '检测到您在做多选，是否合并剪藏？', icon: 'merge' },
      'batch-collect': { label: '检测到批量收集，是否开启批量模式？', icon: 'batch' },
      'compare': { label: '检测到对比信息，是否创建对比表格？', icon: 'compare' },
      'continue-selecting': { label: '保持选区高亮，可继续追加选择', icon: 'highlighter' }
    };
    
    const intentInfo = intentMap[userIntent.intent];
    if (intentInfo) {
      suggestions.push({
        label: intentInfo.label,
        action: `handle-intent-${userIntent.intent}`,
        icon: intentInfo.icon,
        autoExecute: false
      });
    }
  }
  
  // 🟢 如果没有智能建议，至少显示一个默认建议（确保弹窗总是显示）
  if (suggestions.length === 0) {
    // 即使没有识别到特定类型，也显示一个通用建议
    suggestions.push({
      label: '智能剪藏建议',
      action: 'smart-clip',
      icon: 'sparkles',
      autoExecute: false
    });
  }
  
  console.log('[智能识别] 最终建议列表:', suggestions);
  
  const panel = document.createElement('div');
  panel.id = 'sc-context-aware-panel';
  panel.className = 'sc-context-panel';
  
  panel.innerHTML = `
    <div class="sc-context-header">
      <span class="sc-context-title">智能识别</span>
      <button class="sc-context-close" title="关闭">×</button>
    </div>
    <div class="sc-context-suggestions">
      ${suggestions.map(s => `
        <div class="sc-context-item" data-action="${s.action}" data-auto="${s.autoExecute ? 'true' : 'false'}">
          <span class="sc-context-icon">${getIconHTML(s.icon, 18)}</span>
          <span class="sc-context-label">${s.label}</span>
          ${s.autoExecute ? '<span class="sc-auto-badge">自动</span>' : ''}
        </div>
      `).join('')}
    </div>
  `;
  
  // 定位在工具栏下方
  const toolbarRect = toolbar?.getBoundingClientRect();
  if (toolbarRect) {
    panel.style.top = `${toolbarRect.bottom + window.scrollY + 10}px`;
    panel.style.left = `${toolbarRect.left + window.scrollX}px`;
  } else {
    panel.style.top = `${rect.bottom + window.scrollY + 10}px`;
    panel.style.left = `${rect.left + window.scrollX}px`;
  }
  
  // 关闭按钮
  panel.querySelector('.sc-context-close')?.addEventListener('click', () => {
    panel.remove();
    contextAwarePanel = null;
  });
  
  // 建议项点击 - 自动执行推荐的操作
  panel.querySelectorAll('.sc-context-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = (item as HTMLElement).dataset.action;
      const autoExecute = (item as HTMLElement).dataset.auto === 'true';
      
      if (autoExecute) {
        // 自动执行
        executeSmartAction(action || '', contentType, pageType, userIntent);
      } else {
        // 用户确认后执行
        handleSmartAction(action || '', contentType, pageType, userIntent);
      }
      
      panel.remove();
      contextAwarePanel = null;
    });
  });
  
  document.body.appendChild(panel);
  contextAwarePanel = panel;
  
  // 5秒后自动关闭（比之前长，因为信息更有价值）
  setTimeout(() => {
    if (contextAwarePanel === panel) {
      panel.remove();
      contextAwarePanel = null;
    }
  }, 5000);
}

/**
 * 执行智能操作（自动执行）
 */
function executeSmartAction(action: string, contentType: ContentTypeDetection | null, _pageType: PageTypeDetection | null, _userIntent: UserIntentDetection | null): void {
  // 实现自动执行逻辑
  if (action.startsWith('use-template-')) {
    const templateId = action.replace('use-template-', '');
    showToast(`已自动切换到模板: ${templateId}`, 'success');
    // 这里可以发送消息到侧边栏，自动选择模板
    chrome.runtime.sendMessage({ 
      type: 'AUTO_SELECT_TEMPLATE', 
      templateId: templateId,
      prefillFields: contentType?.prefillFields 
    }).catch(() => {});
  }
}

/**
 * 处理智能操作（需要用户确认）
 */
function handleSmartAction(action: string, contentType: ContentTypeDetection | null, _pageType: PageTypeDetection | null, userIntent: UserIntentDetection | null): void {
  if (action.startsWith('use-template-')) {
    const templateId = action.replace('use-template-', '');
    showToast(`推荐使用模板: ${templateId}，请在侧边栏确认`, 'info');
    chrome.runtime.sendMessage({ 
      type: 'SUGGEST_TEMPLATE', 
      templateId: templateId,
      prefillFields: contentType?.prefillFields 
    }).catch(() => {});
  } else if (action.startsWith('handle-intent-')) {
    const intent = action.replace('handle-intent-', '');
    handleUserIntent(intent, userIntent);
  } else if (action === 'smart-clip') {
    // 默认智能剪藏
    if (selectedData) {
      clipSelection();
      showToast('已执行智能剪藏', 'success');
    }
  } else {
    handleContextAction(action);
  }
}

/**
 * 处理用户意图
 */
function handleUserIntent(intent: string, _userIntent: UserIntentDetection | null): void {
  switch (intent) {
    case 'merge':
      // 显示合并选项
      if (multipleSelections.length > 1) {
        mergeSelections();
      } else {
        showToast('请继续选择其他内容以合并', 'info');
      }
      break;
    case 'batch-collect':
      showToast('批量模式功能开发中...', 'info');
      break;
    case 'compare':
      // 创建对比表格
      createCompareTable();
      break;
    case 'continue-selecting':
      showToast('选区已保持高亮，可继续追加选择', 'info');
      break;
  }
}

/**
 * 创建对比表格
 */
function createCompareTable(): void {
  const recentSelections = userBehaviorHistory
    .filter(a => a.action === 'select' && a.url === window.location.href)
    .slice(-3);
  
  if (recentSelections.length < 2) {
    showToast('需要至少2个选择才能创建对比表格', 'info');
    return;
  }
  
  // 提取对比项
  const compareItems = recentSelections.map((sel, idx) => {
    const title = sel.selectionText?.match(/^[^：:]+[：:]?/)?.[0] || `项目${idx + 1}`;
    const content = sel.selectionText?.replace(/^[^：:]+[：:]?\s*/, '') || sel.selectionText || '';
    return { title, content };
  });
  
  // 生成表格Markdown
  const tableMarkdown = `| 项目 | 内容 |\n|------|------|\n${compareItems.map(item => `| ${item.title} | ${item.content} |`).join('\n')}`;
  
  // 发送到侧边栏
  chrome.runtime.sendMessage({
    type: 'CLIP_CONTENT_UPDATED',
    payload: {
      text: tableMarkdown,
      html: '',
      images: [],
      links: [],
      meta: { url: window.location.href, title: document.title },
      sourceUrl: window.location.href
    }
  }).catch(() => {});
  
  showToast('已创建对比表格', 'success');
}

/**
 * 处理上下文感知操作
 */
function handleContextAction(action: string): void {
  switch (action) {
    case 'extract-code':
      // 提取代码
      if (selectedData) {
        const codeBlocks = document.querySelectorAll('pre code, .highlight, code');
        if (codeBlocks.length > 0) {
          const codeText = Array.from(codeBlocks).map(cb => cb.textContent).join('\n\n');
          showToast('代码已提取到剪贴板', 'success');
          navigator.clipboard.writeText(codeText);
        }
      }
      break;
    case 'summarize':
      // 触发智能摘要
      if (selectedData) {
        clipSelection();
        showToast('正在生成摘要...', 'info');
      }
      break;
    case 'translate':
      // 翻译（可以调用翻译API）
      showToast('翻译功能开发中...', 'info');
      break;
    case 'extract-links':
      // 提取链接
      if (selectedData && selectedData.links.length > 0) {
        const linksText = selectedData.links.map(l => l.href).join('\n');
        navigator.clipboard.writeText(linksText);
        showToast(`已复制 ${selectedData.links.length} 个链接`, 'success');
      }
      break;
    default:
      showToast(`执行操作: ${action}`, 'info');
  }
}

// =============【工具函数 (保持原样)】================
function resolveUrl(url: string, baseUrl: string = window.location.href): string {
  try {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return url.startsWith('//') ? `https:${url}` : url;
    }
    return new URL(url, baseUrl).href;
  } catch (e) {
    console.warn('URL转换失败:', url, e);
    return url;
  }
}

function filterAndDeduplicateImages(images: ImageData[]): ImageData[] {
  const seen = new Set<string>();
  const filtered: ImageData[] = [];
  
  for (const img of images) {
    const absoluteSrc = resolveUrl(img.src);
    if (
      !absoluteSrc.startsWith('data:image') &&
      absoluteSrc.length > 0 &&
      !seen.has(absoluteSrc) &&
      (img.width === undefined || img.width > 50) &&
      (img.height === undefined || img.height > 50)
    ) {
      seen.add(absoluteSrc);
      filtered.push({ ...img, src: absoluteSrc });
    }
  }
  return filtered.slice(0, 20);
}

function filterAndDeduplicateLinks(links: LinkData[]): LinkData[] {
  const seen = new Set<string>();
  const filtered: LinkData[] = [];
  
  for (const link of links) {
    const absoluteHref = resolveUrl(link.href);
    if (
      (absoluteHref.startsWith('http://') || absoluteHref.startsWith('https://')) &&
      link.text.trim().length > 0 &&
      !seen.has(absoluteHref)
    ) {
      seen.add(absoluteHref);
      filtered.push({ ...link, href: absoluteHref });
    }
  }
  return filtered.slice(0, 50);
}

// =============【元数据获取函数 (保持原样)】================
function getMetaContent(selectors: string[]): string {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const content = element.getAttribute('content') || (element as HTMLElement).innerText;
      if (content && content.trim()) return content.trim();
    }
  }
  return '';
}

function getPageMeta(): PageMeta {
  const getMeta = (name: string): string => {
    return getMetaContent([
      `meta[property="${name}"]`,
      `meta[name="${name}"]`
    ]);
  }

  const url = window.location.href;
  const title = getMetaContent([
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
    'title'
  ]) || '未命名网页';
  const description = getMeta('description') || getMeta('og:description') || '暂无简介';
  const author = getMeta('author') || getMeta('article:author') || '未命名作者';
  const siteName = getMeta('og:site_name') || new URL(window.location.href).hostname;
  const publishedTime = getMeta('article:published_time') || '未指定时间';
  const image = getMetaContent([
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'link[rel="image_src"]'
  ]);

  return {
    url,
    title,
    description,
    author,
    siteName,
    publishedTime,
    image: image ? resolveUrl(image) : '',
    clipTime: new Date().toISOString()
  };
}


//////////////////////// 音乐专用提取器 (zyy)/////////////////////////////////////

// 所有提取器只需要关注：能不能处理当前页面？如果能，返回 Markdown 文本。
interface MusicExtractor {
  match: (url: string) => boolean;
  extract: () => string | null;
}

//  QQ 音乐 
const qqMusicStrategy: MusicExtractor = {
  match: (url) => url.includes('y.qq.com'),
  extract: () => {
    console.log('🎵 正在执行 QQ 音乐提取...');
    const rows = document.querySelectorAll('.songlist__list li, .songlist__item');
    if (rows.length === 0) return null;

    let md = `### 歌单元数据\n\n`;
    const coverImg = document.querySelector('.data__photo') as HTMLImageElement;
    if (coverImg) md += `![Cover](${coverImg.src})\n\n`;

    const desc = document.querySelector('.data__cont') || document.querySelector('.js_desc_content');
    if (desc) md += `> 简介：${desc.textContent?.trim().slice(0, 300)}...\n\n`;

    md += `### 播放列表\n| 歌名 | 歌手 | 专辑 | 时长 |\n|---|---|---|---|\n`;

    rows.forEach((row) => {
      const nameEl = row.querySelector('.songlist__songname_txt a') as HTMLAnchorElement;
      const name = nameEl ? nameEl.textContent?.trim() : 'N/A';
      const link = nameEl ? nameEl.href : '';
      const artist = Array.from(row.querySelectorAll('.songlist__artist a')).map(el => el.textContent).join(', ') || 'N/A';
      const album = row.querySelector('.songlist__album a')?.textContent?.trim() || 'N/A';
      const time = row.querySelector('.songlist__time')?.textContent?.trim() || 'N/A';

      md += `| [${name}](${link}) | ${artist} | ${album} | ${time} |\n`;
    });
    return md;
  }
};

// 网易云音乐 
// 难点：网易云的内容通常嵌在一个 id="g_iframe" 的 iframe 里
const netEaseStrategy: MusicExtractor = {
  match: (url) => url.includes('music.163.com'),
  extract: () => {
    console.log('🔴 正在执行网易云音乐提取...');
    
    // ⚡️ 网易云特攻：穿透 iframe 获取 DOM
    // 如果我们在顶层页面，数据其实在 iframe 里
    const iframe = document.querySelector('#g_iframe') as HTMLIFrameElement;
    // 如果能获取到 iframe 内容就用 iframe，否则用当前 document (防止插件已经注入进 iframe)
    const doc = (iframe && iframe.contentDocument) ? iframe.contentDocument : document;
    
    // 网易云歌单列表通常在 table.m-table
    const rows = doc.querySelectorAll('.m-table tbody tr');
    if (rows.length === 0) return null;

    let md = `### 歌单元数据\n\n`;
    const coverImg = doc.querySelector('.cover img') as HTMLImageElement;
    if (coverImg) md += `![Cover](${coverImg.src})\n\n`;

    const desc = doc.querySelector('#album-desc-more') || doc.querySelector('#album-desc-dot');
    if (desc) md += `> 简介：${desc.textContent?.trim().slice(0, 300)}...\n\n`;

    md += `### 播放列表\n| 歌名 | 歌手 | 专辑 | 时长 |\n|---|---|---|---|\n`;

    rows.forEach((row) => {
      // 网易云 DOM 结构比较老旧，很多信息在 title 属性里
      const nameEl = row.querySelector('.txt b') || row.querySelector('.txt a');
      const name = nameEl?.getAttribute('title') || nameEl?.textContent?.trim() || 'N/A';
      const linkEl = row.querySelector('.txt a') as HTMLAnchorElement;
      const link = linkEl ? `https://music.163.com${linkEl.getAttribute('href')}` : '';
      
      const duration = row.querySelector('.u-dur')?.textContent?.trim() || 'N/A';
      // 第4列是歌手，第5列是专辑 (简单处理)
      const artist = (row.querySelector('.text') as HTMLElement)?.getAttribute('title') || 'N/A';
      const album = (row.querySelectorAll('.text a')[0])?.getAttribute('title') || 'N/A';

      md += `| [${name}](${link}) | ${artist} | ${album} | ${duration} |\n`;
    });

    return md;
  }
};


//  策略分发中心 (Aggregator)
function extractMusicContent(): string | null {
  const currentUrl = window.location.href;
  
  // 定义所有支持的策略
  const strategies = [qqMusicStrategy, netEaseStrategy];

  // 找到第一个匹配的策略并执行
  for (const strategy of strategies) {
    if (strategy.match(currentUrl)) {
      return strategy.extract();
    }
  }
  
  return null;
}

//  [新] 纯前端 HTML -> Markdown 转换器
// 专门用于技术文档，保留代码块、标题和链接
function htmlToMarkdown(root: Element): string {
  // 1. 克隆节点，避免修改原页面
  const clone = root.cloneNode(true) as HTMLElement;

  // 🧹 增强清洗规则：移除更多干扰元素
  const removeSelectors = [
    'script', 'style', 'iframe', 'svg', 'noscript', 
    'nav', 'footer', 'header', 
    '.sidebar', '.aside', '.ad', '.comment', 
    '.nav-list', '.menu', '.toc', // 移除目录和菜单
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]' // ARIA 角色
  ];
  removeSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  // 3. 处理代码块 (Tech Doc 核心!)
  // 把 <pre><code>...</code></pre> 替换为 ```\n...\n```
  clone.querySelectorAll('pre').forEach(pre => {
    const code = pre.innerText; // 获取纯文本代码
    // 简单的替换逻辑，避免破坏 DOM 结构
    pre.replaceWith(`\n\n\`\`\`\n${code}\n\`\`\`\n\n`);
  });

  // 4. 处理标题 (保留层级)
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag, index) => {
    clone.querySelectorAll(tag).forEach(header => {
      const prefix = '#'.repeat(index + 1);
      header.replaceWith(`\n\n${prefix} ${header.textContent}\n\n`);
    });
  });

  // 5. 处理链接
  clone.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    const text = a.textContent?.trim();
    if (href && text && !href.startsWith('javascript:')) {
      a.replaceWith(`[${text}](${href})`);
    }
  });

  // 6. 处理列表
  clone.querySelectorAll('li').forEach(li => {
    li.replaceWith(`\n- ${li.textContent}`);
  });

  // 7. 处理图片
  clone.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    const alt = img.getAttribute('alt') || 'image';
    if (src) img.replaceWith(`\n![${alt}](${src})\n`);
  });

  // 8. 获取最终文本并清理多余换行
  let text = clone.innerText || clone.textContent || '';
  // 将连续的3个以上换行压缩为2个
  return text.replace(/\n{3,}/g, '\n\n').trim();
}



function extractUniversalContent(): ClipContentPayload {

// ==========================音乐合集处理逻辑，直接返回处理好的 Markdown，不再走下面的通用逻辑(zyy)========================
const musicContent = extractMusicContent();
  
  if (musicContent) {
    return {
      text: musicContent,
      sourceUrl: window.location.href,
      meta: getPageMeta()
    };
  }
  
  //==================================通用逻辑======================================================
  // const url = window.location.href;
  // const title = getMetaContent(['meta[property="og:title"]', 'meta[name="twitter:title"]', 'meta[name="title"]', 'title']) || '未命名网页';
  // const desc = getMetaContent(['meta[property="og:description"]', 'meta[name="twitter:description"]', 'meta[name="description"]']) || '暂无简介';
  // const image = getMetaContent(['meta[property="og:image"]', 'meta[name="twitter:image"]', 'link[rel="image_src"]']);
  // const ogType = getMetaContent(['meta[property="og:type"]']);
  // const isVideo = ogType.includes('video') || url.includes('bilibili.com/video') || url.includes('youtube.com/watch');
  // const meta = getPageMeta();
  
  // return {
  //   text: `【${isVideo ? '视频' : '网页'}智能剪藏】\n标题：${title}\n链接：${url}\n\n${desc ? `简介：${desc}` : ''}\n${image ? `\n![封面图](${resolveUrl(image)})` : ''}`,
  //   sourceUrl: url,
  //   meta: meta
  // };

  // =================================================================================
  //  通用逻辑 (升级版：支持抓取正文 HTML)
  // =================================================================================
  
  const url = window.location.href;
  const title = document.title;
  const meta = getPageMeta();
  
  // 核心升级：智能寻找网页正文区域
  // 技术文档、博客通常放在 main, article 或特定的 class 里
  const contentNode = document.querySelector('main') 
    || document.querySelector('article') 
    || document.querySelector('.markdown-body')       // GitHub README
    || document.querySelector('.documentation-content') // 很多文档站
    || document.querySelector('.doc-content')
    || document.querySelector('#content') 
    || document.body; // 实在找不到就抓整个 body (保底)

 // [关键] 在前端把 HTML 转成 Markdown 字符串
  console.log('正在前端执行 Markdown 转换...');
  const markdownText = htmlToMarkdown(contentNode);

  // 组装数据
  // 我们给它加个头，告诉 AI 这是什么
  const finalContent = `
# ${title}
> 来源：${url}
> 简介：${meta.description || '暂无'}

---
${markdownText}
  `;
  
  return {
    text: finalContent, // 现在发给后端的是干净的 Markdown 文本！
    sourceUrl: url,
    meta: meta
  };




}



////////////////////////////////////////////////////////////////////////////////////////





// ============= 【✨ 悬浮球 & 交互核心逻辑 (新增部分)】================

/**
 * 创建悬浮球开关及相关组件
 */
function createSuspensionBall(): void {
  if (document.getElementById('sc-suspension-wrapper')) return;

  // 1. 创建容器 Wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'sc-suspension-wrapper';
  
  // 2. 主按钮：剪刀图标
  const mainBall = document.createElement('div');
  mainBall.id = 'sc-suspension-ball';
  mainBall.className = 'sc-ball-main'; 
  mainBall.title = '打开 Smart Clipper 侧边栏';
  mainBall.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
      <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
      <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
    </svg>
  `;

  // 3. 卫星按钮：静默开关 (左侧)
  const toggleBtn = document.createElement('div');
  toggleBtn.className = 'sc-sub-action sc-action-toggle';
  toggleBtn.title = '切换静默模式';
  toggleBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  `;
  
  // 4. 卫星按钮：反馈 (上方)
  const feedbackBtn = document.createElement('div');
  feedbackBtn.className = 'sc-sub-action sc-action-feedback';
  feedbackBtn.title = '问题反馈';
  feedbackBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;

  // 组装 DOM
  wrapper.appendChild(toggleBtn);
  wrapper.appendChild(feedbackBtn);
  wrapper.appendChild(mainBall);

  // 初始化反馈弹窗 DOM
  createFeedbackModal();

  // 核心：启用拖拽和智能点击识别
  bindSmartInteraction(wrapper, mainBall, toggleBtn, feedbackBtn);
  
  suspensionBall = mainBall; // 保持兼容

  document.body.appendChild(wrapper);
  updateSuspensionBallVisuals();
}

/**
 * 绑定智能交互事件 (解决点击/拖拽冲突)
 */
function bindSmartInteraction(wrapper: HTMLElement, mainBall: HTMLElement, toggleBtn: HTMLElement, feedbackBtn: HTMLElement) {
  let isDragging = false;
  let startX = 0, startY = 0;
  
  // 拖拽逻辑
  wrapper.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // 仅左键
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    
    wrapper.style.transition = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      // 移动超过 5px 才视为拖拽
      if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isDragging = true;
      }

      if (isDragging) {
        // 简单跟随鼠标
        wrapper.style.bottom = 'auto';
        wrapper.style.right = 'auto';
        wrapper.style.left = `${moveEvent.clientX - 24}px`; // 24是半径近似值
        wrapper.style.top = `${moveEvent.clientY - 24}px`;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      wrapper.style.transition = '';
      
      // 延时重置，让 click 事件能读取状态
      setTimeout(() => { isDragging = false; }, 0);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // 主按钮点击
  mainBall.addEventListener('click', (e) => {
    if (isDragging) return;
    e.stopPropagation();
    openSidebar();
  });

  // 开关点击
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleExtensionActiveState();
  });

  // 反馈点击
  feedbackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openFeedbackModal();
  });
}

/**
 * 视觉状态更新
 */
function updateSuspensionBallVisuals() {
  const toggleBtn = document.querySelector('.sc-action-toggle');
  const mainBall = document.getElementById('sc-suspension-ball');
  
  if (!toggleBtn || !mainBall) return;
  
  if (isGlobalActive) {
    // 开启状态
    toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`; // 眼睛
    toggleBtn.classList.add('is-on');
    toggleBtn.classList.remove('is-off');
    mainBall.classList.add('active');
  } else {
    // 静默状态
    toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M1 1l22 22"></path></svg>`; // 闭眼
    toggleBtn.classList.add('is-off');
    toggleBtn.classList.remove('is-on');
    mainBall.classList.remove('active');
  }
}

/**
 * 切换扩展激活状态
 */
function toggleExtensionActiveState() {
  isGlobalActive = !isGlobalActive;
  updateSuspensionBallVisuals();
  
  showToast(
    isGlobalActive ? '🟢 划词剪藏已开启' : '⚪️ 划词剪藏已暂停 (静默模式)', 
    isGlobalActive ? 'success' : 'info'
  );

  if (!isGlobalActive) hideToolbar();
  chrome.storage.local.set({ 'sc_is_active': isGlobalActive });
}

/**
 * 创建反馈弹窗 DOM
 */
function createFeedbackModal() {
  if (document.getElementById('sc-feedback-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'sc-feedback-modal';
  modal.innerHTML = `
    <div class="sc-modal-box">
      <div class="sc-modal-title">📝 剪藏助手 - 问题反馈</div>
      <textarea class="sc-modal-input" placeholder="请描述您遇到的问题或改进建议..."></textarea>
      <div class="sc-modal-btns">
        <button class="sc-btn sc-btn-can">取消</button>
        <button class="sc-btn sc-btn-sub">发送反馈</button>
      </div>
    </div>
  `;
  
  // 绑定内部事件
  const close = () => {
    modal.classList.remove('visible');
    setTimeout(() => modal.style.display = 'none', 200);
  };
  
  modal.querySelector('.sc-btn-can')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  
  modal.querySelector('.sc-btn-sub')?.addEventListener('click', () => {
    const val = (modal.querySelector('textarea') as HTMLTextAreaElement).value;
    if (val.trim()) {
      showToast('反馈已提交，感谢您的建议！', 'success');
      (modal.querySelector('textarea') as HTMLTextAreaElement).value = '';
      close();
    } else {
      showToast('请输入反馈内容', 'warning');
    }
  });

  document.body.appendChild(modal);
}

function openFeedbackModal() {
  const modal = document.getElementById('sc-feedback-modal');
  if (modal) {
    modal.style.display = 'flex';
    void modal.offsetWidth; // 触发重绘
    modal.classList.add('visible');
    (modal.querySelector('textarea') as HTMLTextAreaElement)?.focus();
  }
}

// ============= 【浮动工具栏 (含完整原有结构 + 新增样式)】================
function createToolbar(): HTMLElement { 
  const styleElement = document.createElement('style');
  styleElement.setAttribute('data-smart-clipper', 'true');
  styleElement.textContent = `
    /* === 基础重置 === */
    #smart-clipper-toolbar, #sc-suspension-wrapper, #sc-feedback-modal,
    #smart-clipper-toolbar *, #sc-suspension-wrapper *, #sc-feedback-modal * {
      box-sizing: border-box !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }

    /* === 悬浮球容器 === */
    #sc-suspension-wrapper {
      position: fixed !important;
      bottom: 80px !important; right: 30px !important;
      width: 48px !important; height: 48px !important;
      z-index: 2147483648 !important;
      user-select: none !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
    }
    
    /* 悬停时提高层级，防止被下方元素遮挡交互 */
    #sc-suspension-wrapper:hover {
      z-index: 2147483650 !important; 
    }

    /* === 主按钮 (深色磨砂) === */
    #sc-suspension-ball {
      width: 48px !important; height: 48px !important;
      border-radius: 50% !important;
      background: rgba(30, 41, 59, 0.9) !important; /* 深蓝灰 */
      backdrop-filter: blur(12px) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
      cursor: pointer !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
      color: #f1f5f9 !important;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      z-index: 10 !important;
      position: relative !important;
    }
    
    #sc-suspension-ball:hover { transform: scale(1.1) !important; }
    #sc-suspension-ball:active { transform: scale(0.95) !important; }
    #sc-suspension-ball svg { width: 22px !important; height: 22px !important; pointer-events: none !important; }
    
    /* 开启状态微光 */
    #sc-suspension-ball.active {
       box-shadow: 0 8px 32px rgba(59, 130, 246, 0.4) !important;
       border-color: rgba(59, 130, 246, 0.5) !important;
    }
    #sc-suspension-ball.active svg { color: #60a5fa !important; }

    /* === 卫星按钮 === */
    .sc-sub-action {
      position: absolute !important;
      width: 36px !important; height: 36px !important;
      border-radius: 50% !important;
      background: rgba(255, 255, 255, 0.95) !important;
      backdrop-filter: blur(8px) !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      border: 1px solid rgba(0,0,0,0.05) !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
      cursor: pointer !important;
      color: #475569 !important;
      z-index: 1 !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transform: scale(0.5) !important;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }

    .sc-sub-action svg { width: 18px !important; height: 18px !important; pointer-events: none !important; }

    /* === 核心修复：隐形桥接层 (Invisible Bridge) === */
    /* 填充主球和卫星球之间的空隙，防止鼠标移出导致收起 */
    .sc-action-feedback::after {
      content: '' !important; position: absolute !important;
      top: 100% !important; left: 0 !important; width: 100% !important; height: 40px !important;
      background: transparent !important;
    }
    .sc-action-toggle::after {
      content: '' !important; position: absolute !important;
      left: 100% !important; top: 0 !important; width: 40px !important; height: 100% !important;
      background: transparent !important;
    }
    .sc-action-vision::after {
      content: '' !important; position: absolute !important;
      right: 100% !important; top: 0 !important; width: 40px !important; height: 100% !important;
      background: transparent !important;
    }

    /* 悬停 Wrapper 显示卫星 */
    #sc-suspension-wrapper:hover .sc-sub-action {
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    /* 卫星弹出位置 */
    #sc-suspension-wrapper:hover .sc-action-feedback { transform: translateY(-55px) scale(1) !important; }
    #sc-suspension-wrapper:hover .sc-action-toggle { transform: translateX(-55px) scale(1) !important; }
    #sc-suspension-wrapper:hover .sc-action-vision { transform: translateX(55px) scale(1) !important; }

    /* 卫星悬停态 */
    .sc-sub-action:hover {
      background: #3b82f6 !important; color: white !important; transform: scale(1.1) !important;
    }
    /* 修正悬停时位置保持，防止回弹 */
    #sc-suspension-wrapper:hover .sc-action-feedback:hover { transform: translateY(-55px) scale(1.1) !important; }
    #sc-suspension-wrapper:hover .sc-action-toggle:hover { transform: translateX(-55px) scale(1.1) !important; }
    #sc-suspension-wrapper:hover .sc-action-vision:hover { transform: translateX(55px) scale(1.1) !important; }
    
    .sc-action-toggle.is-on { color: #3b82f6 !important; }

    /* === 反馈弹窗 === */
    #sc-feedback-modal {
      position: fixed !important; inset: 0 !important;
      background: rgba(0,0,0,0.5) !important; backdrop-filter: blur(4px) !important;
      z-index: 2147483650 !important;
      display: none !important; align-items: center !important; justify-content: center !important;
      opacity: 0 !important; transition: opacity 0.2s ease !important;
    }
    #sc-feedback-modal.visible { display: flex !important; opacity: 1 !important; }
    
    .sc-modal-box {
      background: #1e293b !important; color: #f8fafc !important;
      width: 400px !important; max-width: 90vw !important;
      padding: 24px !important; border-radius: 16px !important;
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5) !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      transform: scale(0.95) !important; transition: transform 0.2s !important;
    }
    #sc-feedback-modal.visible .sc-modal-box { transform: scale(1) !important; }
    
    .sc-modal-title { font-size: 16px !important; font-weight: 600 !important; margin-bottom: 16px !important; }
    .sc-modal-input {
      width: 100% !important; height: 100px !important;
      background: rgba(0,0,0,0.3) !important; border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 8px !important; color: white !important; padding: 12px !important;
      resize: none !important; margin-bottom: 16px !important; outline: none !important;
      font-family: inherit !important;
    }
    .sc-modal-input:focus { border-color: #3b82f6 !important; }
    .sc-modal-btns { display: flex !important; justify-content: flex-end !important; gap: 10px !important; }
    .sc-btn { padding: 8px 16px !important; border-radius: 6px !important; border: none !important; cursor: pointer !important; font-size: 13px !important; }
    .sc-btn-sub { background: #3b82f6 !important; color: white !important; }
    .sc-btn-can { background: transparent !important; color: #94a3b8 !important; }

    /* === 原有工具栏样式 (保留) === */
    body #smart-clipper-toolbar {
      position: fixed !important;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%) !important;
      border: 1px solid rgba(226, 232, 240, 0.9) !important;
      color: #1e293b !important;
      border-radius: 20px !important;
      padding: 10px 12px !important;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08) !important;
      z-index: 2147483647 !important;
      display: none !important;
      gap: 6px !important;
      opacity: 0 !important;
      transform: translateY(-12px) scale(0.95) !important;
      pointer-events: none !important;
      backdrop-filter: blur(20px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
      transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    body #smart-clipper-toolbar.visible {
      display: flex !important;
      opacity: 1 !important;
      transform: translateY(0) scale(1) !important;
      pointer-events: auto !important;
    }
    
    /* 按钮样式 */
    #smart-clipper-toolbar button {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
      border: 1px solid rgba(226, 232, 240, 0.6) !important;
      border-radius: 14px !important;
      color: #475569 !important;
      padding: 10px 18px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      outline: none !important;
      pointer-events: auto !important;
      font-weight: 600 !important;
      font-size: 13px !important;
      position: relative !important;
      overflow: hidden !important;
      white-space: nowrap !important;
    }
    
    #smart-clipper-toolbar button:hover {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
      transform: translateY(-2px) scale(1.02) !important;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35), 0 2px 8px rgba(37, 99, 235, 0.2) !important;
      border-color: rgba(37, 99, 235, 0.3) !important;
    }

    #smart-clipper-toolbar button.primary {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
      border-color: rgba(37, 99, 235, 0.3) !important;
    }
    
    #smart-clipper-toolbar svg { display: block !important; width: 16px !important; height: 16px !important; }

    /* 子菜单 */
    #smart-clipper-toolbar .sc-toolbar-group { position: relative !important; }
    #smart-clipper-toolbar .sc-submenu {
      position: absolute !important; bottom: 100% !important; left: 50% !important; transform: translateX(-50%) !important;
      margin-bottom: 8px !important; display: none !important; flex-direction: row !important; gap: 6px !important;
      opacity: 0 !important; transition: opacity 0.15s ease !important; z-index: 2147483648 !important;
      padding-top: 18px !important;
    }
    #smart-clipper-toolbar .sc-toolbar-group.submenu-open .sc-submenu { display: flex !important; opacity: 1 !important; }
    #smart-clipper-toolbar .sc-toolbar-group:hover .sc-submenu,
    #smart-clipper-toolbar .sc-submenu:hover { display: flex !important; opacity: 1 !important; }
    
    /* 必须保留的 Toast 样式 */
    body .sc-toast {
      position: fixed !important; top: 20px !important; left: 50% !important; transform: translateX(-50%) !important;
      background: rgba(0, 0, 0, 0.8) !important; color: white !important; padding: 12px 20px !important;
      border-radius: 4px !important; z-index: 2147483649 !important; opacity: 0 !important;
      transition: opacity 0.3s ease !important; min-width: 200px !important; text-align: center !important; pointer-events: none !important;
    }
    body .sc-toast.show { opacity: 1 !important; }
    
    /* 高亮覆盖层样式 */
    .sc-highlight-overlay {
      position: absolute !important;
      background-color: rgba(255, 235, 59, 0.3) !important;
      border: 2px solid rgba(255, 193, 7, 0.6) !important;
      border-radius: 4px !important;
      pointer-events: none !important;
      z-index: 2147483646 !important;
      transition: opacity 0.2s ease !important;
    }
    
    /* 持久高亮样式 - 更明显的视觉效果 */
    .sc-highlight-overlay.sc-persistent-highlight {
      background-color: rgba(255, 235, 59, 0.4) !important;
      border: 2px solid rgba(255, 193, 7, 0.8) !important;
      box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3) !important;
    }
    
    /* 多选高亮样式 */
    .sc-multi-selection-highlight {
      position: absolute !important;
      background-color: rgba(139, 92, 246, 0.25) !important;
      border: 2px dashed rgba(139, 92, 246, 0.8) !important;
      border-radius: 4px !important;
      pointer-events: none !important;
      z-index: 2147483645 !important;
      transition: all 0.2s ease !important;
    }
    
    .sc-multi-selection-highlight::before {
      content: attr(data-index) !important;
      position: absolute !important;
      top: -8px !important;
      left: -8px !important;
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
      color: white !important;
      width: 20px !important;
      height: 20px !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4) !important;
    }
    
    /* 子菜单按钮样式 - 与主按钮一致，横向排列 */
    #smart-clipper-toolbar .sc-submenu .submenu-item {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
      border: 1px solid rgba(226, 232, 240, 0.6) !important;
      border-radius: 14px !important;
      color: #475569 !important;
      padding: 10px 18px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      white-space: nowrap !important;
      min-width: 100px !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
    }
    
    #smart-clipper-toolbar .sc-submenu .submenu-item:hover {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
      transform: translateY(-2px) scale(1.02) !important;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35), 0 2px 8px rgba(37, 99, 235, 0.2) !important;
    }
    
    /* 合并按钮特殊样式 */
    #smart-clipper-toolbar .sc-submenu .submenu-item.merge-btn {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
      color: white !important;
      border-color: rgba(124, 58, 237, 0.3) !important;
    }
    
    #smart-clipper-toolbar .sc-submenu .submenu-item.merge-btn:hover {
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4) !important;
    }
    
    /* 🟢 上下文感知浮动窗口样式 */
    .sc-context-panel {
      position: fixed !important;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%) !important;
      border: 1px solid rgba(226, 232, 240, 0.9) !important;
      border-radius: 16px !important;
      padding: 12px !important;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1) !important;
      z-index: 2147483649 !important;
      min-width: 240px !important;
      max-width: 320px !important;
      backdrop-filter: blur(20px) saturate(180%) !important;
      animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .sc-context-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      margin-bottom: 8px !important;
      padding-bottom: 8px !important;
      border-bottom: 1px solid rgba(226, 232, 240, 0.5) !important;
    }
    
    .sc-context-title {
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #1e293b !important;
    }
    
    .sc-context-close {
      width: 20px !important;
      height: 20px !important;
      border: none !important;
      background: transparent !important;
      color: #64748b !important;
      cursor: pointer !important;
      font-size: 18px !important;
      line-height: 1 !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 4px !important;
      transition: all 0.2s !important;
    }
    
    .sc-context-close:hover {
      background: rgba(226, 232, 240, 0.5) !important;
      color: #1e293b !important;
    }
    
    .sc-context-suggestions {
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
    }
    
    .sc-context-item {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 10px 12px !important;
      border-radius: 10px !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      background: rgba(248, 250, 252, 0.8) !important;
      border: 1px solid transparent !important;
    }
    
    .sc-context-item:hover {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
      transform: translateX(4px) !important;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
    }
    
    .sc-context-icon {
      font-size: 18px !important;
      flex-shrink: 0 !important;
    }
    
    .sc-context-label {
      font-size: 13px !important;
      font-weight: 500 !important;
      color: inherit !important;
    }
    
    .sc-auto-badge {
      margin-left: auto !important;
      padding: 2px 6px !important;
      background: rgba(16, 185, 129, 0.1) !important;
      color: #10b981 !important;
      border-radius: 4px !important;
      font-size: 10px !important;
      font-weight: 600 !important;
    }
  `;
  
  const existingStyle = document.querySelector('style[data-smart-clipper="true"]');
  if (existingStyle) existingStyle.remove();
  document.head.appendChild(styleElement);

  const toolbarElement = document.createElement('div');
  toolbarElement.id = 'smart-clipper-toolbar';
  
  // 恢复原有的 HTML 结构
  toolbarElement.innerHTML = `
    <div class="sc-toolbar-group">
      <button id="sc-clip-selection" title="剪藏选中内容 (Ctrl+K)" class="primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
        <span>剪藏</span>
      </button>
      <div class="sc-submenu">
        <button id="sc-clip-page" title="剪藏整页" class="submenu-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span>整页</span>
        </button>
        <button id="sc-merge-selections" title="按住ctrl用鼠标选择不同选区以合并" class="submenu-item merge-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 18h8M8 12h8M8 6h8"></path>
            <circle cx="4" cy="6" r="1.5"></circle>
            <circle cx="4" cy="12" r="1.5"></circle>
            <circle cx="4" cy="18" r="1.5"></circle>
          </svg>
          <span>合并</span>
        </button>
      </div>
    </div>
    <button id="sc-highlight" title="高亮选中内容">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
      </svg>
      <span>高亮</span>
    </button>
    <button id="sc-open-sidebar" title="打开侧边栏">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
      </svg>
      <span>侧栏</span>
    </button>
    <button id="sc-ai-vision" title="AI 识图">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <span>AI识图</span>
    </button>
  `;

  const clipperGroup = toolbarElement.querySelector('.sc-toolbar-group');
  const submenu = clipperGroup?.querySelector('.sc-submenu') as HTMLElement | null;
  if (clipperGroup && submenu) {
    let hideTimer: number | null = null;
    const showSubmenu = () => {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      clipperGroup.classList.add('submenu-open');
    };
    const scheduleHide = () => {
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        clipperGroup.classList.remove('submenu-open');
        hideTimer = null;
      }, 160);
    };
    clipperGroup.addEventListener('mouseenter', showSubmenu);
    clipperGroup.addEventListener('mouseleave', scheduleHide);
    submenu.addEventListener('mouseenter', showSubmenu);
    submenu.addEventListener('mouseleave', scheduleHide);
  }

  document.body.appendChild(toolbarElement);
  return toolbarElement;
}

// ============= 【工具栏显示逻辑】================
function showToolbar(rect: DOMRect): void {
  if (!toolbar) return;

  if (toolbar.offsetWidth === 0 || toolbar.offsetHeight === 0) {
    toolbar.style.display = 'flex';
    toolbar.classList.add('visible');
    void toolbar.offsetWidth;
  }
  
  const toolbarWidth = toolbar.offsetWidth || 200;
  const toolbarHeight = toolbar.offsetHeight || 50;
  const padding = 12;
  const gap = 10;
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  
  // 检查rect是否有效，如果无效则使用默认位置
  let rectTop = rect.top + scrollY;
  let rectBottom = rect.bottom + scrollY;
  let rectLeft = rect.left + scrollX;
  let rectCenterX = rectLeft + rect.width / 2;
  
  // 如果rect无效，使用视口中心作为默认位置
  if (!rect.width || !rect.height || rect.top === 0 && rect.left === 0 && rect.bottom === 0 && rect.right === 0) {
    const viewportCenterX = scrollX + viewportWidth / 2;
    const viewportCenterY = scrollY + viewportHeight / 2;
    
    rectTop = viewportCenterY - 50;
    rectBottom = viewportCenterY + 50;
    rectLeft = viewportCenterX - 100;
    rectCenterX = viewportCenterX;
  }
  
  // 优先位置：选区上方居中
  const preferredTop = rectTop - toolbarHeight - gap;
  const preferredLeft = rectCenterX - toolbarWidth / 2;
  
  let finalTop = preferredTop;
  const spaceAbove = rectTop - scrollY - padding;
  const spaceBelow = scrollY + viewportHeight - rectBottom - padding;
  
  if (spaceAbove < toolbarHeight + gap && spaceBelow > spaceAbove) {
    finalTop = rectBottom + gap;
  } else if (spaceAbove < toolbarHeight + gap && spaceBelow < toolbarHeight + gap) {
    if (spaceBelow > spaceAbove) {
      finalTop = rectBottom + gap;
    } else {
      finalTop = Math.max(scrollY + padding, rectTop - toolbarHeight - gap);
    }
  } else if (finalTop < scrollY + padding) {
    finalTop = scrollY + padding;
  }
  
  let finalLeft = preferredLeft;
  if (finalLeft < scrollX + padding) finalLeft = scrollX + padding;
  if (finalLeft + toolbarWidth > scrollX + viewportWidth - padding) finalLeft = scrollX + viewportWidth - toolbarWidth - padding;
  if (toolbarWidth > viewportWidth - padding * 2) finalLeft = scrollX + padding;
  
  // 确保最终位置始终在视口内
  finalTop = Math.max(scrollY + padding, Math.min(finalTop, scrollY + viewportHeight - toolbarHeight - padding));
  finalLeft = Math.max(scrollX + padding, Math.min(finalLeft, scrollX + viewportWidth - toolbarWidth - padding));
  
  toolbar.style.top = `${finalTop - scrollY}px`;
  toolbar.style.left = `${finalLeft - scrollX}px`;
  toolbar.style.visibility = 'visible';
  toolbar.classList.add('visible');
}

function hideToolbar(): void {
  if (!toolbar) return;
  toolbar.classList.remove('visible');
}

// ==================【AI 识图功能】====================

/**
 * 创建截图选择器 UI
 * @returns 用户选择的区域坐标，如果取消则返回 null
 */
function createScreenshotSelector(): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.3) !important;
      cursor: crosshair !important;
      z-index: 2147483646 !important;
      user-select: none !important;
    `;

    // 选择框
    const selectionBox = document.createElement('div');
    selectionBox.style.cssText = `
      position: fixed !important;
      border: 2px dashed #3b82f6 !important;
      background: rgba(59, 130, 246, 0.1) !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      display: none !important;
    `;

    // 提示文本
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(0, 0, 0, 0.8) !important;
      color: white !important;
      padding: 12px 24px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      z-index: 2147483647 !important;
      backdrop-filter: blur(8px) !important;
    `;
    hint.textContent = '拖动选择截图区域，按 ESC 取消';

    document.body.appendChild(overlay);
    document.body.appendChild(selectionBox);
    document.body.appendChild(hint);

    let startX = 0, startY = 0;
    let isSelecting = false;

    const onMouseDown = (e: MouseEvent) => {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      selectionBox.style.display = 'block';
      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isSelecting) return;
      const currentX = e.clientX;
      const currentY = e.clientY;
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);

      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!isSelecting) return;
      isSelecting = false;
      const currentX = e.clientX;
      const currentY = e.clientY;
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);

      cleanup();

      if (width > 10 && height > 10) {
        resolve({ x: left, y: top, width, height });
      } else {
        showToast('选择区域太小', 'warning');
        resolve(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    };

    const cleanup = () => {
      overlay.remove();
      selectionBox.remove();
      hint.remove();
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
    };

    overlay.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
  });
}

/**
 * 主功能：截图并识别
 */
async function captureAndVision() {
  try {
    // 1. 显示选择器
    const selection = await createScreenshotSelector();
    if (!selection) return;

    // 2. 显示加载提示
    const loadingToast = showToast('AI 正在分析截图...', 'loading');

    // 3. 发送消息给 background 进行截图和识别
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_AND_VISION',
      pageUrl: window.location.href,
      selection: selection,
      isScreenshot: true
    });

    loadingToast.remove();

    console.log('【AI识图】收到响应:', response);

    if (response?.status === 'success' && response.result) {
      console.log('【AI识图】result 内容:', response.result);

      const structured = response.result.data;
      const formattedText = structured
        ? formatVisionStructuredData(structured).trim()
        : (response.result.raw || '');
      const fallbackText = formattedText || response.result.raw || JSON.stringify(structured ?? {}, null, 2);
      
      // 4. 缓存结果
      lastVisionResult = {
        text: fallbackText,
        html: `<pre>${fallbackText}</pre>`,
        structuredData: structured,
        raw: response.result.raw
      };

      // 5. 通知 sidebar 更新（如果已打开）
      chrome.runtime.sendMessage({
        type: 'VISION_RESULT_READY',
        payload: lastVisionResult
      });

      showToast('AI 识图完成！', 'success');
    } else {
      console.error('【AI识图】响应格式错误:', { status: response?.status, result: response?.result, error: response?.error });
      throw new Error(response?.error || '识图失败');
    }
  } catch (error) {
    console.error('AI 识图错误:', error);
    showToast(`识图失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
  }
}

// ==================【Toast提示 (保持原样)】====================
function showToast(message: string, type: 'info' | 'success' | 'error' | 'warning' | 'loading' = 'info'): HTMLElement {
  if (toastElement && type !== 'loading') {
    toastElement.remove();
    toastElement = null;
  }

  const toast = document.createElement('div');
  toast.className = `sc-toast sc-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  if (type === 'loading') {
    loadingToast = toast;
  } else {
    toastElement = toast;
    setTimeout(() => {
      if (toastElement === toast) {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.remove();
          toastElement = null;
        }, 300);
      }
    }, 3000);
  }

  return toast;
}

function hideLoadingToast(): void {
  if (loadingToast) {
    loadingToast.classList.remove('show');
    setTimeout(() => {
      loadingToast?.remove();
      loadingToast = null;
    }, 300);
  }
}

// ============= 【数据提取逻辑 (保持原样)】================
function extractSelectionContent(selection: Selection, range: Range): SelectionData { 
  const text = selection.toString().trim();
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  const html = container.innerHTML;

  const images: ImageData[] = [];
  container.querySelectorAll('img').forEach(img => {
    const src = img.src || img.getAttribute('data-src') || '';
    if (src) {
      images.push({
        src: resolveUrl(src),
        alt: img.alt || '',
        width: img.naturalWidth || undefined,
        height: img.naturalHeight || undefined
      });
    }
  });
  
  container.querySelectorAll('*').forEach(el => {
    const htmlEl = el as HTMLElement;
    const style = window.getComputedStyle(htmlEl);
    const bgImage = style.backgroundImage;
    if (bgImage && bgImage !== 'none') {
      const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match && match[1]) {
        images.push({ src: resolveUrl(match[1]), alt: '' });
      }
    }
  });

  const videos: Array<{src: string, poster?: string, type?: string}> = [];
  container.querySelectorAll('video').forEach(video => {
    const videoSrc = video.src || video.getAttribute('src') || '';
    if (videoSrc) {
      videos.push({
        src: resolveUrl(videoSrc),
        poster: video.poster ? resolveUrl(video.poster) : undefined,
        type: video.getAttribute('type') || 'video/mp4'
      });
    }
  });

  container.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    if (src && (src.includes('youtube') || src.includes('bilibili'))) {
       videos.push({ src: resolveUrl(src), type: 'iframe' });
    }
  });
  
  const links: LinkData[] = [];
  container.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href) {
      links.push({
        href: resolveUrl(href),
        text: a.textContent?.trim() || ''
      });
    }
  });
  
  let enhancedText = text;
  if (images.length > 0) enhancedText += `\n\n[包含 ${images.length} 张图片]`;
  if (videos.length > 0) enhancedText += `\n\n[包含 ${videos.length} 个视频]`;
  
  return {
    type: 'selection',
    text: enhancedText,
    html,
    images: filterAndDeduplicateImages(images),
    links: filterAndDeduplicateLinks(links),
    meta: getPageMeta()
  };
}

function extractFullPageData(): PageData {
  const article = document.querySelector('article') || document.querySelector('main') || document.body;
  const clone = article.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove());

  const text = clone.textContent?.trim().replace(/\s+/g, ' ') || '';
  const html = clone.innerHTML;

  const images: ImageData[] = [];
  clone.querySelectorAll('img').forEach(img => {
    if (img.src && !img.src.startsWith('data:image')) {
      images.push({ src: img.src, alt: img.alt || '' });
    }
  });

  const links: LinkData[] = [];
  clone.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href) links.push({ href, text: a.textContent?.trim() || '' });
  });

  return {
    type: 'page',
    text,
    html,
    images: filterAndDeduplicateImages(images),
    links: filterAndDeduplicateLinks(links),
    meta: getPageMeta()
  };
}

/**
 * 将SelectionData或PageData转换为ClipContentPayload格式 - 增强版
 * 包含高亮信息，并将高亮文本正确格式化为 Markdown 高亮语法
 */
function convertToClipPayload(data: SelectionData | PageData): ClipContentPayload {
  let markdownText = data.text;
  
  // 检查是否有高亮信息需要包含
  const hasHighlights = highlightedRanges.length > 0;
  
  if (hasHighlights) {
    // 收集所有高亮文本及其在原文中的位置
    const highlightTexts: Array<{ text: string; index: number }> = [];
    
    highlightedRanges.forEach(hr => {
      try {
        const highlightText = hr.range.toString().trim();
        if (highlightText && highlightText.length > 0) {
          // 在原文中查找高亮文本的位置（处理可能的重复）
          let searchIndex = 0;
          while (true) {
            const foundIndex = markdownText.indexOf(highlightText, searchIndex);
            if (foundIndex === -1) break;
            
            // 检查这个位置是否已经被标记为高亮
            const beforeText = markdownText.substring(Math.max(0, foundIndex - 2), foundIndex);
            const afterText = markdownText.substring(foundIndex + highlightText.length, foundIndex + highlightText.length + 2);
            
            // 如果前后不是 == 标记，说明这是新的高亮位置
            if (!beforeText.endsWith('==') && !afterText.startsWith('==')) {
              highlightTexts.push({ text: highlightText, index: foundIndex });
              break; // 只标记第一个匹配的位置
            }
            searchIndex = foundIndex + 1;
          }
        }
      } catch (e) {
        console.warn('处理高亮范围失败:', e);
      }
    });
    
    // 按位置从后往前排序，避免替换时位置偏移
    highlightTexts.sort((a, b) => b.index - a.index);
    
    // 应用高亮标记（从后往前替换，避免位置偏移）
    highlightTexts.forEach(({ text, index }) => {
      // 使用 Markdown 高亮语法 ==文本==
      markdownText = markdownText.substring(0, index) + 
                     `==${text}==` + 
                     markdownText.substring(index + text.length);
    });
  }
  
  // 添加图片信息 - 增强展示
  if (data.images && data.images.length > 0) {
    markdownText += `\n\n## 图片 (${data.images.length}张)\n\n`;
    data.images.slice(0, 10).forEach((img, idx) => {
      markdownText += `${idx + 1}. ![${img.alt || '图片'}](${img.src})\n`;
    });
  }

  if (data.links && data.links.length > 0) {
    markdownText += `\n\n## 链接 (${data.links.length}个)\n\n`;
    data.links.slice(0, 15).forEach((link) => {
      markdownText += `- [${link.text || link.href}](${link.href})\n`;
    });
  }

  // 构建高亮信息（用于后端存储和后续处理）
  const highlightInfo = hasHighlights ? highlightedRanges.map(hr => {
    try {
      return {
        id: hr.id,
        text: hr.range.toString().trim(),
        startOffset: hr.range.startOffset,
        endOffset: hr.range.endOffset,
        startContainer: hr.range.startContainer.nodeName,
        endContainer: hr.range.endContainer.nodeName
      };
    } catch {
      return null;
    }
  }).filter((h): h is HighlightInfo => h !== null) : undefined;

  return {
    text: markdownText,
    html: data.html,
    images: data.images,
    links: data.links,
    meta: data.meta,
    sourceUrl: data.meta.url,
    highlights: highlightInfo // 新增：高亮信息
  };
}

// ===============【事件处理】==================
function handleMouseUp(e: MouseEvent): void {
  // 0. 检查全局开关，如果关闭则直接退出
  if (!isGlobalActive) {
    hideToolbar(); 
    return;
  }

  // 1. 如果点击的是工具栏本身或悬浮球，不处理
  if (toolbar && toolbar.contains(e.target as Node)) return;
  if (suspensionBall && suspensionBall.contains(e.target as Node)) return;

  // 2. 延迟执行以等待选区稳定
  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection) return;

    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0 && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      selectedData = extractSelectionContent(selection, range);
      
      if (e.ctrlKey || e.metaKey) {
        const rangeText = range.toString().trim();
        const exists = multipleSelections.some(sel => sel.text === rangeText);
        if (!exists && rangeText.length > 0) {
          multipleSelections.push(selectedData);
          showToast(`已添加选区 ${multipleSelections.length}`, 'info');
          
          const highlight = document.createElement('div');
          highlight.className = 'sc-multi-selection-highlight';
          highlight.style.top = `${rect.top + window.scrollY}px`;
          highlight.style.left = `${rect.left + window.scrollX}px`;
          highlight.style.width = `${rect.width}px`;
          highlight.style.height = `${rect.height}px`;
          document.body.appendChild(highlight);
          multiSelectionHighlights.push(highlight);
        }
      } else {
        if (multipleSelections.length > 0) {
          clearMultiSelectionHighlights();
          multipleSelections = [];
        }
      }
      
      updateMergeButton();
      showToolbar(rect);
      
      // 🟢 显示智能建议浮动窗口（三层智能识别）
      setTimeout(() => {
        // 记录用户行为
        userBehaviorHistory.push({
          timestamp: Date.now(),
          action: 'select',
          url: window.location.href,
          selectionCount: multipleSelections.length + 1,
          selectionText: selectedText
        });
        // 只保留最近20条记录
        if (userBehaviorHistory.length > 20) {
          userBehaviorHistory = userBehaviorHistory.slice(-20);
        }
        
        createContextAwarePanel(rect, selection, range);
      }, 300);
    } else {
      hideToolbar();
      if (contextAwarePanel) {
        contextAwarePanel.remove();
        contextAwarePanel = null;
      }
    }
  }, 10);
}

function handleMouseDown(e: MouseEvent): void {
  // 点击页面其他位置隐藏工具栏
  // [重要] 排除悬浮球容器的点击，否则可能导致悬浮球交互被干扰
  const wrapper = document.getElementById('sc-suspension-wrapper');
  if (wrapper && wrapper.contains(e.target as Node)) return;

  if (toolbar && toolbar.contains(e.target as Node)) return;

  hideToolbar();
}

// =================【剪藏操作 (保持原样)】=====================
async function clipSelection() {
  if (!selectedData) {
    showToast('请先选择要剪藏的内容', 'warning');
    return;
  }

  hideToolbar();
  const payload = convertToClipPayload(selectedData);
  void openSidebar(); // 立即触发侧边栏，保持用户手势
  await sendToBackground(payload);
  
  // 清除已剪藏的高亮（只清除与当前选区相关的高亮）
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const currentRangeText = selection.getRangeAt(0).toString().trim();
    highlightedRanges = highlightedRanges.filter(hr => {
      try {
        const hrText = hr.range.toString().trim();
        if (hrText === currentRangeText) {
          hr.overlay.remove();
          return false; // 移除已剪藏的高亮
        }
        return true; // 保留其他高亮
      } catch {
        hr.overlay.remove();
        return false; // 移除无效的高亮
      }
    });
  }
  
  // 清除多选状态
  multipleSelections = [];
  updateMergeButton();
}

async function clipFullPage() {
  hideToolbar();
  const fullPageData = extractFullPageData();
  const payload = convertToClipPayload(fullPageData);
  void openSidebar();
  await sendToBackground(payload);
}

// 高亮选中内容 - 持久高亮版本
function highlightSelection() {
  if (!selectedData) {
    showToast('请先选择要高亮的内容', 'warning');
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  
  // 检查是否已经高亮过这个区域（避免重复高亮）
  const rangeText = range.toString().trim();
  const alreadyHighlighted = highlightedRanges.some(hr => {
    try {
      return hr.range.toString().trim() === rangeText;
    } catch {
      return false;
    }
  });
  
  if (alreadyHighlighted) {
    showToast('该内容已高亮', 'info');
    return;
  }
  
  // 创建持久高亮
  const highlightId = `sc-highlight-${++highlightIdCounter}`;
  const rect = range.getBoundingClientRect();
  
  // 创建高亮覆盖层
  const overlay = document.createElement('div');
  overlay.className = 'sc-highlight-overlay sc-persistent-highlight';
  overlay.setAttribute('data-highlight-id', highlightId);
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  document.body.appendChild(overlay);
  
  // 保存高亮信息
  highlightedRanges.push({
    range: range.cloneRange(), // 克隆range以便后续使用
    overlay: overlay,
    id: highlightId
  });
  
  showToast('已高亮选中内容（将保持直到剪藏）', 'success');
  hideToolbar();
}

// 更新所有高亮位置（响应滚动和窗口大小变化）
function updateAllHighlightPositions() {
  highlightedRanges.forEach(hr => {
    try {
      const rect = hr.range.getBoundingClientRect();
      hr.overlay.style.top = `${rect.top + window.scrollY}px`;
      hr.overlay.style.left = `${rect.left + window.scrollX}px`;
      hr.overlay.style.width = `${rect.width}px`;
      hr.overlay.style.height = `${rect.height}px`;
    } catch (e) {
      // Range可能已失效，移除高亮
      hr.overlay.remove();
      highlightedRanges = highlightedRanges.filter(h => h.id !== hr.id);
    }
  });
}

// 清除所有高亮
function clearAllHighlights() {
  highlightedRanges.forEach(hr => {
    hr.overlay.remove();
  });
  highlightedRanges = [];
}

// 清除指定高亮
// @ts-expect-error - 这个函数保留供未来功能使用
function _clearHighlight(highlightId: string) {
  const index = highlightedRanges.findIndex(hr => hr.id === highlightId);
  if (index !== -1) {
    highlightedRanges[index].overlay.remove();
    highlightedRanges.splice(index, 1);
  }
}

async function mergeSelections() {
  if (multipleSelections.length === 0) {
    showToast('没有可合并的选区', 'warning');
    return;
  }

  const count = multipleSelections.length;
  hideToolbar();
  clearMultiSelectionHighlights();
  
  const mergedText = multipleSelections.map((sel, idx) => 
    `【选区 ${idx + 1}】\n${sel.text.trim()}\n`
  ).join('\n---\n\n');
  
  const mergedHtml = multipleSelections.map((sel, idx) => 
    `<div class="sc-merged-selection" data-index="${idx + 1}">${sel.html}</div>`
  ).join('\n<hr class="sc-selection-divider">\n');
  
  const mergedImages: ImageData[] = [];
  const mergedLinks: LinkData[] = [];
  
  multipleSelections.forEach(sel => {
    sel.images.forEach(img => mergedImages.push(img));
    sel.links.forEach(link => mergedLinks.push(link));
  });
  
  const mergedData: SelectionData = {
    type: 'selection',
    text: mergedText,
    html: mergedHtml,
    images: filterAndDeduplicateImages(mergedImages),
    links: filterAndDeduplicateLinks(mergedLinks),
    meta: getPageMeta()
  };
  
  const payload = convertToClipPayload(mergedData);
  void openSidebar();
  await sendToBackground(payload);
  
  multipleSelections = [];
  updateMergeButton();
  showToast(`已合并 ${count} 个选区`, 'success');
}

function clearMultiSelectionHighlights() {
  multiSelectionHighlights.forEach(el => el.remove());
  multiSelectionHighlights = [];
}

// 显示多选高亮
// function showMultiSelectionHighlights() {
//   clearMultiSelectionHighlights();
  
//   multipleSelections.forEach((sel, index) => {
//     // 尝试从保存的数据中恢复选区位置
//     // 注意：由于选区是动态的，这里我们只能显示一个提示
//     // 实际应用中可能需要保存Range对象或使用其他方法
//   });
// }

// 更新合并按钮显示状态
function updateMergeButton() {
  const mergeBtn = toolbar?.querySelector('#sc-merge-selections') as HTMLElement;
  const submenu = toolbar?.querySelector('.sc-submenu') as HTMLElement;
  
  if (mergeBtn && submenu) {
    if (multipleSelections.length > 1) {
      mergeBtn.style.display = 'flex';
      mergeBtn.title = `合并 ${multipleSelections.length} 个选区 (Ctrl+M)`;
      submenu.style.display = 'flex';
    } else {
      mergeBtn.title = '按住ctrl用鼠标选择不同选区以合并';
    }
  }
}

// 侧边栏通信
async function openSidebar() {
  try {
    console.log('[SmartClipper] 开始打开侧边栏...');
    
    // 方法：通过消息通知background打开侧边栏
    // 由于这是在用户点击事件中同步调用的，用户手势上下文应该仍然有效
    // 使用 Promise 包装以确保消息在用户手势上下文中发送
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'OPEN_SIDEPANEL' },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    }) as { status: string; message?: string };
    
    console.log('[SmartClipper] 打开侧边栏请求已发送，响应:', response);
    
    if (response && response.status === 'success') {
      console.log('[SmartClipper] ✅ 侧边栏打开成功');
    } else {
      console.warn('[SmartClipper] ⚠️ 侧边栏打开可能失败:', response);
      if (response && response.message) {
        console.warn('[SmartClipper] 错误信息:', response.message);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SmartClipper] ❌ 打开侧边栏失败:', error);
    // 如果是因为消息通道已关闭（侧边栏可能已经打开），不显示错误
    if (!errorMessage.includes('message port closed') && 
        !errorMessage.includes('Extension context invalidated') &&
        !errorMessage.includes('Could not establish connection')) {
      showToast('打开侧边栏失败，请手动点击扩展图标', 'warning');
    }
  }
}

function extractAndSendUniversalContent(): void {
  const pageData = extractUniversalContent();
  chrome.runtime.sendMessage({
    type: 'CLIP_CONTENT',
    payload: pageData
  }).catch(() => {}); 
}

async function sendToBackground(payload: ClipContentPayload) {
  try {
    showToast('正在发送剪藏请求...', 'loading');
    const response = await chrome.runtime.sendMessage({
      type: 'CLIP_CONTENT',
      payload: payload
    });
    hideLoadingToast();

    if (response && response.status === 'success') {
      showToast('剪藏成功！', 'success');
      window.getSelection()?.removeAllRanges();
      selectedData = null;
    } else {
      showToast('发送剪藏失败', 'error');
    }
  } catch (error) {
    console.error('[SmartClipper] Error:', error);
    hideLoadingToast();
    showToast('发送失败，请检查扩展状态', 'error');
  }
}

function handleKeyboardShortcuts(e: KeyboardEvent): void {
  if (!isGlobalActive) return;

  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

  // Ctrl+K: 剪藏
  if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.shiftKey) {
    e.preventDefault();
    selectedData ? clipSelection() : showToast('请先选择要剪藏的内容', 'warning');
  }

  // Ctrl+M: 合并
  if ((e.ctrlKey || e.metaKey) && e.key === 'm' && !e.shiftKey) {
    e.preventDefault();
    multipleSelections.length > 1 ? mergeSelections() : showToast('请先选择多个选区', 'warning');
  }

  // Escape: 退出
  if (e.key === 'Escape') {
    e.preventDefault();
    hideToolbar();
    window.getSelection()?.removeAllRanges();
    selectedData = null;
    multipleSelections = [];
    clearMultiSelectionHighlights();
    updateMergeButton();
    const modal = document.getElementById('sc-feedback-modal');
    if (modal) modal.classList.remove('visible');
  }

  // Enter: 确认剪藏
  if (e.key === 'Enter' && !e.shiftKey && toolbar?.classList.contains('visible')) {
    e.preventDefault();
    if (selectedData) clipSelection();
  }
}

// =================【初始化】==========================
function init() {
  // 1. 初始化 DOM 元素
  toolbar = createToolbar();
  createSuspensionBall(); // 初始化悬浮球

  // 2. 读取持久化配置
  chrome.storage.local.get(['sc_is_active'], (result) => {
    if (result && typeof result.sc_is_active === 'boolean') {
      isGlobalActive = result.sc_is_active;
      updateSuspensionBallVisuals();
      console.log(`[SmartClipper] 状态: ${isGlobalActive ? '开启' : '关闭'}`);
    }
  });

  // 3. 绑定全局事件
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // 滚动和缩放时重新定位工具栏
  const reposition = () => {
    if (toolbar && toolbar.classList.contains('visible') && selectedData) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        showToolbar(selection.getRangeAt(0).getBoundingClientRect());
      } else hideToolbar();
    }
    // 更新所有高亮位置
    updateAllHighlightPositions();
  };
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  
  // 监听页面卸载，清除所有高亮
  window.addEventListener('beforeunload', () => {
    clearAllHighlights();
  });
  
  // 监听页面可见性变化，如果页面隐藏则清除高亮
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearAllHighlights();
    }
  });
  
  // 添加窗口大小变化监听，确保工具栏位置正确
  window.addEventListener('resize', () => {
    if (toolbar && toolbar.classList.contains('visible') && selectedData) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showToolbar(rect);
      } else {
        hideToolbar();
      }
    }
  });

  // 4. 绑定工具栏按钮事件
  toolbar.querySelector('#sc-clip-selection')?.addEventListener('click', clipSelection);
  toolbar.querySelector('#sc-highlight')?.addEventListener('click', highlightSelection);
  toolbar.querySelector('#sc-open-sidebar')?.addEventListener('click', openSidebar);
  toolbar.querySelector('#sc-clip-page')?.addEventListener('click', clipFullPage);
  toolbar.querySelector('#sc-merge-selections')?.addEventListener('click', mergeSelections);
  toolbar.querySelector('#sc-ai-vision')?.addEventListener('click', captureAndVision);

  // 5. 自动抓取逻辑
  window.addEventListener('load', () => {
    if (!isGlobalActive) return;
    setTimeout(() => {
      const selection = window.getSelection()?.toString().trim() || '';
      if (!selection) extractAndSendUniversalContent();
    }, 1500);
  });

  // 6. SPA 页面跳转监听
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      if (!isGlobalActive) return;
      console.log('检测到页面跳转，重新抓取...');
      setTimeout(() => extractAndSendUniversalContent(), 2000);
    }
  }).observe(document, { subtree: true, childList: true });

  console.log('[SmartClipper] Initialization complete.');
}

// ==================【消息监听】========================
chrome.runtime.onMessage.addListener((request: any, _, sendResponse) => {
  // 处理清除所有高亮的消息
  if (request.type === 'CLEAR_ALL_HIGHLIGHTS') {
    clearAllHighlights();
    clearMultiSelectionHighlights();
    hideToolbar();
    sendResponse({ status: 'success' });
    return true;
  }
  
  // 其他消息处理...
  // 请求页面内容
  if (request.type === 'REQUEST_CONTENT') {
    const pageData = extractUniversalContent();
    sendResponse(pageData);
    return true;
  }

  // 图像裁剪请求（从 background 发来）
  if (request.type === 'CROP_IMAGE') {
    (async () => {
      try {
        const { dataUrl, selection } = request;
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        // 创建 canvas 进行裁剪
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context 创建失败');

        // 获取设备像素比
        const dpr = window.devicePixelRatio || 1;

        canvas.width = selection.width * dpr;
        canvas.height = selection.height * dpr;

        // 裁剪图像
        ctx.drawImage(
          img,
          selection.x * dpr,
          selection.y * dpr,
          selection.width * dpr,
          selection.height * dpr,
          0,
          0,
          selection.width * dpr,
          selection.height * dpr
        );

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        sendResponse({ status: 'success', croppedDataUrl });
      } catch (error) {
        console.error('图像裁剪失败:', error);
        sendResponse({ status: 'error', error: error instanceof Error ? error.message : '未知错误' });
      }
    })();
    return true; // 保持消息通道开启
  }

  // Sidebar 请求 Vision 结果
  if (request.type === 'GET_VISION_RESULT') {
    if (lastVisionResult) {
      sendResponse({ status: 'success', result: lastVisionResult });
    } else {
      sendResponse({ status: 'error', error: '没有缓存的识图结果' });
    }
    return true;
  }

  return false;
});

// ==================【启动应用】========================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}

function formatVisionStructuredData(data: unknown, depth = 0): string {
  const indent = '  '.repeat(depth);

  if (data === null || data === undefined) {
    return `${indent}- —`;
  }

  if (typeof data !== 'object') {
    return `${indent}- ${String(data)}`;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `${indent}- （空）`;
    }
    return data
      .map((item, index) => {
        if (item && typeof item === 'object') {
          const nested = formatVisionStructuredData(item, depth + 1);
          return `${indent}- [#${index + 1}]
${nested}`;
        }
        return `${indent}- [#${index + 1}] ${String(item ?? '—')}`;
      })
      .join('\n');
  }

  return Object.entries(data)
    .map(([key, value]) => {
      if (value && typeof value === 'object') {
        const nested = formatVisionStructuredData(value, depth + 1);
        return `${indent}- **${key}**:\n${nested}`;
      }
      const finalValue = value === undefined || value === null || value === '' ? '—' : String(value);
      return `${indent}- **${key}**: ${finalValue}`;
    })
    .join('\n');
}