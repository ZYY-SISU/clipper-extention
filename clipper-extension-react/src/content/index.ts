// src/content/index.ts
console.log('AI剪藏助手：通用智能抓取脚本已就绪');

// ============【类型定义】=================
import type{ SelectionData, PageMeta, PageData, ImageData, LinkData, ClipContentPayload } from '../types/index';

// =============【状态管理】================
let toolbar: HTMLElement | null = null;
let selectedData: SelectionData | null = null;
let toastElement: HTMLElement | null = null;
let loadingToast: HTMLElement | null = null;
let multipleSelections: SelectionData[] = []; // 多选支持
let highlightOverlay: HTMLElement | null = null; // 高亮覆盖层
let multiSelectionHighlights: HTMLElement[] = []; // 多选高亮元素

// =============【工具函数】================
/**
 * 将相对URL转换为绝对URL
 */
function resolveUrl(url: string, baseUrl: string = window.location.href): string {
  try {
    // 如果已经是绝对URL，直接返回
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return url.startsWith('//') ? `https:${url}` : url;
    }
    // 转换为绝对URL
    return new URL(url, baseUrl).href;
  } catch (e) {
    console.warn('URL转换失败:', url, e);
    return url;
  }
}

/**
 * 过滤和去重图片
 */
function filterAndDeduplicateImages(images: ImageData[]): ImageData[] {
  const seen = new Set<string>();
  const filtered: ImageData[] = [];
  
  for (const img of images) {
    // 转换为绝对URL
    const absoluteSrc = resolveUrl(img.src);
    
    // 过滤条件：
    // 1. 不是data:image
    // 2. 不是空字符串
    // 3. 去重
    // 4. 过滤太小的图片（可能是图标）
    if (
      !absoluteSrc.startsWith('data:image') &&
      absoluteSrc.length > 0 &&
      !seen.has(absoluteSrc) &&
      (img.width === undefined || img.width > 50) &&
      (img.height === undefined || img.height > 50)
    ) {
      seen.add(absoluteSrc);
      filtered.push({
        ...img,
        src: absoluteSrc
      });
    }
  }
  
  return filtered.slice(0, 20); // 最多20张图片
}

/**
 * 过滤和去重链接
 */
function filterAndDeduplicateLinks(links: LinkData[]): LinkData[] {
  const seen = new Set<string>();
  const filtered: LinkData[] = [];
  
  for (const link of links) {
    // 转换为绝对URL
    const absoluteHref = resolveUrl(link.href);
    
    // 过滤条件：
    // 1. 是http或https协议
    // 2. 有文本内容
    // 3. 去重
    if (
      (absoluteHref.startsWith('http://') || absoluteHref.startsWith('https://')) &&
      link.text.trim().length > 0 &&
      !seen.has(absoluteHref)
    ) {
      seen.add(absoluteHref);
      filtered.push({
        ...link,
        href: absoluteHref
      });
    }
  }
  
  return filtered.slice(0, 50); // 最多50个链接
}

// =============【元数据获取函数】================
// 依次尝试传入的选择器，返回第一个获取到的非空值
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

// 获取页面元信息
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

// 通用页面解析器
// 不依赖特定网站结构，而是依赖通用的互联网标准 (Open Graph)
function extractUniversalContent(): ClipContentPayload {
  const url = window.location.href;

  // 1. 获取标题
  const title = getMetaContent([
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
    'title'
  ]) || '未命名网页';

  // 2. 获取简介
  const desc = getMetaContent([
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
    'meta[name="description"]'
  ]) || '暂无简介';

  // 3. 获取封面图
  const image = getMetaContent([
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'link[rel="image_src"]'
  ]);

  // 4. 智能判断类型
  const ogType = getMetaContent(['meta[property="og:type"]']);
  const isVideo = ogType.includes('video') || 
                  url.includes('bilibili.com/video') || 
                  url.includes('youtube.com/watch');

  // 5. 组装数据
  const meta = getPageMeta();
  
  return {
    text: `【${isVideo ? '视频' : '网页'}智能剪藏】\n标题：${title}\n链接：${url}\n\n${desc ? `简介：${desc}` : ''}\n${image ? `\n![封面图](${resolveUrl(image)})` : ''}`,
    sourceUrl: url,
    meta: meta
  };
}

// ============= 【浮动工具栏】================
// 创建并返回一个浮动工具栏
function createToolbar(): HTMLElement { 
  // 动态创建样式 - 增强兼容性和优先级
  const styleElement = document.createElement('style');
  styleElement.setAttribute('data-smart-clipper', 'true');
  styleElement.textContent = `
    /* CSS重置和基础样式 */
    #smart-clipper-toolbar, 
    #smart-clipper-toolbar *,
    .sc-toast,
    .sc-toast * {
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
    }
    
    /* 工具栏样式 - 增强优先级和视觉效果 */
    body #smart-clipper-toolbar {
      position: fixed !important;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%) !important;
      border: 1px solid rgba(226, 232, 240, 0.9) !important;
      color: #1e293b !important;
      border-radius: 20px !important;
      padding: 10px 12px !important;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08) !important;
      -webkit-box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08) !important;
      z-index: 2147483647 !important;
      display: none !important;
      gap: 6px !important;
      opacity: 0 !important;
      transform: translateY(-12px) scale(0.95) !important;
      -webkit-transform: translateY(-12px) scale(0.95) !important;
      pointer-events: none !important;
      backdrop-filter: blur(20px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
      transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      -webkit-transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      will-change: transform, opacity !important;
    }
    
    /* 显示工具栏的visible类 - 优化动画 */
    body #smart-clipper-toolbar.visible {
      display: flex !important;
      opacity: 1 !important;
      transform: translateY(0) scale(1) !important;
      -webkit-transform: translateY(0) scale(1) !important;
      pointer-events: auto !important;
      animation: sc-fadeInScale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
      -webkit-animation: sc-fadeInScale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
    }
    
    /* 隐藏动画 */
    body #smart-clipper-toolbar:not(.visible) {
      animation: sc-fadeOutScale 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
      -webkit-animation: sc-fadeOutScale 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
    }
    
    /* 动画 - 性能优化，使用transform和opacity */
    @keyframes sc-fadeInScale {
      0% {
        opacity: 0 !important;
        transform: translateY(-12px) scale(0.95) !important;
      }
      100% {
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
      }
    }

    @-webkit-keyframes sc-fadeInScale {
      0% {
        opacity: 0 !important;
        -webkit-transform: translateY(-12px) scale(0.95) !important;
      }
      100% {
        opacity: 1 !important;
        -webkit-transform: translateY(0) scale(1) !important;
      }
    }
    
    @keyframes sc-fadeOutScale {
      0% {
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
      }
      100% {
        opacity: 0 !important;
        transform: translateY(-8px) scale(0.98) !important;
      }
    }

    @-webkit-keyframes sc-fadeOutScale {
      0% {
        opacity: 1 !important;
        -webkit-transform: translateY(0) scale(1) !important;
      }
      100% {
        opacity: 0 !important;
        -webkit-transform: translateY(-8px) scale(0.98) !important;
      }
    }

    /* 按钮样式 - 增强优先级和交互性 */
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
      -webkit-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      outline: none !important;
      pointer-events: auto !important;
      font-weight: 600 !important;
      font-size: 13px !important;
      position: relative !important;
      overflow: hidden !important;
      white-space: nowrap !important;
    }
    
    /* 按钮悬停效果 - 更流畅的渐变和阴影 */
    #smart-clipper-toolbar button::before {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: -100% !important;
      width: 100% !important;
      height: 100% !important;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent) !important;
      transition: left 0.5s ease !important;
    }
    
    #smart-clipper-toolbar button:hover::before {
      left: 100% !important;
    }

    #smart-clipper-toolbar button:hover {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
      transform: translateY(-2px) scale(1.02) !important;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35), 0 2px 8px rgba(37, 99, 235, 0.2) !important;
      border-color: rgba(37, 99, 235, 0.3) !important;
    }

    #smart-clipper-toolbar button:active {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
      transform: translateY(0) scale(0.98) !important;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3) !important;
    }
    
    /* 按钮焦点样式 */
    #smart-clipper-toolbar button:focus-visible {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px !important;
    }

    /* SVG图标样式 */
    #smart-clipper-toolbar svg {
      display: block !important;
      width: 16px !important;
      height: 16px !important;
      flex-shrink: 0 !important;
    }

    #smart-clipper-toolbar button:hover svg {
      color: white !important;
    }
    
    /* Toast提示样式 - 增强兼容性 */
    body .sc-toast {
      position: fixed !important;
      top: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      -webkit-transform: translateX(-50%) !important;
      background: rgba(0, 0, 0, 0.8) !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 4px !important;
      z-index: 2147483647 !important;
      opacity: 0 !important;
      transition: opacity 0.3s ease !important;
      -webkit-transition: opacity 0.3s ease !important;
      min-width: 200px !important;
      text-align: center !important;
      pointer-events: none !important;
    }
    
    body .sc-toast.show {
      opacity: 1 !important;
    }
    
    body .sc-toast.success {
      background: rgba(46, 204, 113, 0.9) !important;
    }
    
    body .sc-toast.error {
      background: rgba(231, 76, 60, 0.9) !important;
    }
    
    body .sc-toast.info {
      background: rgba(52, 152, 219, 0.9) !important;
    }
    
    body .sc-toast.warning {
      background: rgba(241, 196, 15, 0.9) !important;
    }
    
    body .sc-toast.loading {
      background: rgba(52, 152, 219, 0.9) !important;
    }
    
    /* 选中高亮样式 - 增强可见性 */
    body .sc-selection-highlight {
      background-color: rgba(102, 126, 234, 0.3) !important;
      background-color: -webkit-rgba(102, 126, 234, 0.3) !important;
      border: 1px solid rgba(102, 126, 234, 0.6) !important;
      border-radius: 2px !important;
      outline: none !important;
      pointer-events: none !important;
    }
    
    /* 防止页面样式覆盖 */
    #smart-clipper-toolbar button span {
      color: inherit !important;
      background: none !important;
      text-decoration: none !important;
      font-size: inherit !important;
    }
    
    /* 主要按钮样式 */
    #smart-clipper-toolbar button.primary {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
      border-color: rgba(37, 99, 235, 0.3) !important;
    }
    
    #smart-clipper-toolbar button.primary:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4), 0 2px 8px rgba(37, 99, 235, 0.25) !important;
    }
    
    /* 工具栏按钮组 - 用于子菜单定位 */
    #smart-clipper-toolbar .sc-toolbar-group {
      position: relative !important;
    }
    
    /* 子菜单连接区域 - 填充剪藏按钮和子菜单之间的空隙，防止鼠标移开时子菜单消失 */
    #smart-clipper-toolbar .sc-submenu::before {
      content: '' !important;
      position: absolute !important;
      bottom: -12px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      width: 150% !important;
      height: 18px !important;
      background: transparent !important;
      pointer-events: auto !important;
      z-index: 2147483649 !important;
    }
    
    /* 子菜单容器 - 默认隐藏 */
    #smart-clipper-toolbar .sc-submenu {
      position: absolute !important;
      bottom: 100% !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      margin-bottom: 8px !important;
      display: none !important;
      flex-direction: row !important;
      gap: 6px !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.15s ease, transform 0.15s ease !important;
      z-index: 2147483648 !important;
      padding-top: 18px !important; /* 为连接区域留出空间 */
    }
    
    /* 鼠标悬停时显示子菜单 - 支持整个工具栏组区域（包括子菜单本身和连接区域） */
    #smart-clipper-toolbar .sc-toolbar-group:hover .sc-submenu,
    #smart-clipper-toolbar .sc-submenu:hover {
      display: flex !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }
    
    /* 确保连接区域也能保持子菜单显示 */
    #smart-clipper-toolbar .sc-toolbar-group:hover .sc-submenu::before {
      pointer-events: auto !important;
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
  `;
  
  // 避免重复添加样式
  const existingStyle = document.querySelector('style[data-smart-clipper="true"]');
  if (existingStyle) {
    existingStyle.remove();
  }
  document.head.appendChild(styleElement);

  const toolbarElement = document.createElement('div');
  toolbarElement.id = 'smart-clipper-toolbar';
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
        <button id="sc-merge-selections" title="合并多个选区 (Ctrl+M)" class="submenu-item merge-btn">
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
  `;

  // 添加到页面
  document.body.appendChild(toolbarElement);
  return toolbarElement;
}

// 显示工具栏 - 优化位置计算算法
function showToolbar(rect: DOMRect): void {
  if (!toolbar) return;

  // 确保工具栏已渲染以获取准确尺寸
  if (toolbar.offsetWidth === 0 || toolbar.offsetHeight === 0) {
    toolbar.style.visibility = 'hidden';
    toolbar.classList.add('visible');
    // 强制重排以获取尺寸
    void toolbar.offsetWidth;
  }
  
  const toolbarWidth = toolbar.offsetWidth || 200;
  const toolbarHeight = toolbar.offsetHeight || 50;
  const padding = 12; // 与视口边缘的最小距离
  const gap = 10; // 与选区的距离
  
  // 获取视口和滚动信息
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  
  // 计算选区的绝对位置
  const rectTop = rect.top + scrollY;
  const rectBottom = rect.bottom + scrollY;
  const rectLeft = rect.left + scrollX;
  // const rectRight = rect.right + scrollX;
  const rectCenterX = rectLeft + rect.width / 2;
  
  // 优先位置：选区上方居中
  const preferredTop = rectTop - toolbarHeight - gap;
  const preferredLeft = rectCenterX - toolbarWidth / 2;
  
  // 垂直方向智能定位
  let finalTop = preferredTop;
  const spaceAbove = rectTop - scrollY - padding;
  const spaceBelow = scrollY + viewportHeight - rectBottom - padding;
  
  if (spaceAbove < toolbarHeight + gap && spaceBelow > spaceAbove) {
    // 上方空间不足，且下方空间更大，显示在下方
    finalTop = rectBottom + gap;
  } else if (spaceAbove < toolbarHeight + gap && spaceBelow < toolbarHeight + gap) {
    // 上下都不足，选择空间更大的一侧
    if (spaceBelow > spaceAbove) {
      finalTop = rectBottom + gap;
    } else {
      // 上方空间稍大，但可能超出视口，需要调整
      finalTop = Math.max(scrollY + padding, rectTop - toolbarHeight - gap);
    }
  } else if (finalTop < scrollY + padding) {
    // 确保不超出视口顶部
    finalTop = scrollY + padding;
  }
  
  // 水平方向智能定位
  let finalLeft = preferredLeft;
  
  // 左边界检查
  if (finalLeft < scrollX + padding) {
    finalLeft = scrollX + padding;
  }
  
  // 右边界检查
  if (finalLeft + toolbarWidth > scrollX + viewportWidth - padding) {
    finalLeft = scrollX + viewportWidth - toolbarWidth - padding;
  }
  
  // 如果工具栏太宽，至少保证左对齐
  if (toolbarWidth > viewportWidth - padding * 2) {
    finalLeft = scrollX + padding;
  }
  
  // 应用位置（使用fixed定位，相对于视口）
  toolbar.style.top = `${finalTop - scrollY}px`;
  toolbar.style.left = `${finalLeft - scrollX}px`;
  toolbar.style.visibility = 'visible';
  toolbar.classList.add('visible');
}

// 隐藏工具栏
function hideToolbar(): void {
  if (!toolbar) return;
  toolbar.classList.remove('visible');
  // 注意：不清除多选高亮，让用户可以看到已选择的区域
}

// ==================【Toast提示】====================
function showToast(message: string, type: 'info' | 'success' | 'error' | 'warning' | 'loading' = 'info'): HTMLElement {
  // 移除已有的toast
  if (toastElement && type !== 'loading') {
    toastElement.remove();
    toastElement = null;
  }

  const toast = document.createElement('div');
  toast.className = `sc-toast sc-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // 强制显示
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  if (type === 'loading') {
    loadingToast = toast;
  } else {
    toastElement = toast;
  }

  // 自动消失（loading类型需要手动移除）
  if (type !== 'loading') {
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

// ============= 【数据提取】================
// 提取选区数据 - 增强版，支持更多媒体类型
function extractSelectionContent(selection: Selection, range: Range): SelectionData { 
  // 获取纯文本
  const text = selection.toString().trim();

  // 获取 HTML 内容
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  const html = container.innerHTML;

  // 提取选区内的图片 - 增强识别
  const images: ImageData[] = [];
  
  // 1. 直接包含的img标签
  container.querySelectorAll('img').forEach(img => {
    const src = img.src || 
                img.getAttribute('data-src') || 
                img.getAttribute('data-lazy-src') || 
                img.getAttribute('data-original') ||
                img.getAttribute('srcset')?.split(',')[0]?.trim().split(' ')[0] ||
                '';
    if (src) {
      images.push({
        src: resolveUrl(src),
        alt: img.alt || img.getAttribute('title') || '',
        width: img.naturalWidth || img.width || img.getAttribute('width') ? parseInt(img.getAttribute('width') || '0') : undefined,
        height: img.naturalHeight || img.height || img.getAttribute('height') ? parseInt(img.getAttribute('height') || '0') : undefined
      });
    }
  });
  
  // 2. 背景图片（CSS background-image）
  container.querySelectorAll('*').forEach(el => {
    const htmlEl = el as HTMLElement;
    const style = window.getComputedStyle(htmlEl);
    const bgImage = style.backgroundImage;
    if (bgImage && bgImage !== 'none') {
      const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match && match[1]) {
        const bgSrc = resolveUrl(match[1]);
        // 检查是否已存在
        if (!images.some(img => img.src === bgSrc)) {
          images.push({
            src: bgSrc,
            alt: htmlEl.getAttribute('alt') || htmlEl.getAttribute('title') || '',
            width: htmlEl.offsetWidth || undefined,
            height: htmlEl.offsetHeight || undefined
          });
        }
      }
    }
  });
  
  // 3. 视频元素（提取封面图和视频链接）
  const videos: Array<{src: string, poster?: string, type?: string}> = [];
  container.querySelectorAll('video').forEach(video => {
    const videoSrc = video.src || video.getAttribute('src') || '';
    const poster = video.poster || video.getAttribute('poster') || '';
    if (videoSrc) {
      videos.push({
        src: resolveUrl(videoSrc),
        poster: poster ? resolveUrl(poster) : undefined,
        type: video.getAttribute('type') || 'video/mp4'
      });
      // 如果有封面图，也添加到图片列表
      if (poster) {
        images.push({
          src: resolveUrl(poster),
          alt: '视频封面',
          width: video.videoWidth || video.offsetWidth || undefined,
          height: video.videoHeight || video.offsetHeight || undefined
        });
      }
    }
  });
  
  // 4. iframe中的视频（YouTube, Bilibili等）
  container.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    if (src) {
      // 检测是否是视频平台
      if (src.includes('youtube.com') || src.includes('youtu.be') || 
          src.includes('bilibili.com') || src.includes('vimeo.com')) {
        videos.push({
          src: resolveUrl(src),
          type: 'iframe'
        });
      }
    }
  });

  // 提取选区内的链接 - 增强识别
  const links: LinkData[] = [];
  container.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href) {
      const htmlElement = a as HTMLElement;
      const linkText = (a.textContent || htmlElement.innerText || '').trim();
      // 也提取title属性作为补充
      const title = a.getAttribute('title') || '';
      links.push({
        href: resolveUrl(href),
        text: linkText || title || href
      });
    }
  });
  
  // 将视频链接也添加到links中，方便后续处理
  videos.forEach(video => {
    // 检查是否已存在相同的链接
    const exists = links.some(link => link.href === video.src);
    if (!exists) {
      links.push({
        href: video.src,
        text: `视频: ${video.type === 'iframe' ? '嵌入视频' : video.type}`
      });
    }
  });
  
  // 5. 提取代码块
  const codeBlocks: string[] = [];
  container.querySelectorAll('pre code, code').forEach(code => {
    const codeText = code.textContent || '';
    if (codeText.trim().length > 0) {
      codeBlocks.push(codeText);
    }
  });
  
  // 6. 提取表格数据
  const tables: string[] = [];
  container.querySelectorAll('table').forEach(table => {
    const tableText = table.textContent || '';
    if (tableText.trim().length > 0) {
      tables.push(table.outerHTML);
    }
  });

  // 增强文本内容：添加媒体信息
  let enhancedText = text;
  if (images.length > 0) {
    enhancedText += `\n\n[包含 ${images.length} 张图片]`;
  }
  if (videos.length > 0) {
    enhancedText += `\n\n[包含 ${videos.length} 个视频]`;
  }
  if (codeBlocks.length > 0) {
    enhancedText += `\n\n[包含 ${codeBlocks.length} 个代码块]`;
  }
  if (tables.length > 0) {
    enhancedText += `\n\n[包含 ${tables.length} 个表格]`;
  }

  return {
    type: 'selection',
    text: enhancedText,
    html,
    images: filterAndDeduplicateImages(images),
    links: filterAndDeduplicateLinks(links),
    meta: getPageMeta()
  };
}

// 提取整页数据
function extractFullPageData(): PageData {
  // 获取主要内容区域（尝试智能识别正文）
  const article = document.querySelector('article') 
    || document.querySelector('[role="main"]')
    || document.querySelector('main')
    || document.querySelector('.content')
    || document.querySelector('#content')
    || document.body;

  // 克隆并清理内容
  const clone = article.cloneNode(true) as HTMLElement;
  
  // 移除脚本、样式、广告等
  clone.querySelectorAll('script, style, nav, header, footer, aside, .ad, .advertisement, [class*="sidebar"]')
    .forEach(el => el.remove());

  const text = clone.textContent?.trim().replace(/\s+/g, ' ') || '';
  const html = clone.innerHTML;

  // 提取所有图片
  const images: ImageData[] = [];
  clone.querySelectorAll('img').forEach(img => {
    const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
    if (src && !src.startsWith('data:image')) {
      images.push({
        src: src,
        alt: img.alt || '',
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0
      });
    }
  });

  // 提取所有链接
  const links: LinkData[] = [];
  clone.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href) {
      const htmlElement = a as HTMLElement;
      links.push({
        href: href,
        text: (a.textContent || htmlElement.innerText || '').trim()
      });
    }
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
 */
function convertToClipPayload(data: SelectionData | PageData): ClipContentPayload {
  // 构建Markdown格式的文本
  let markdownText = data.text;
  
  // 添加图片信息 - 增强展示
  if (data.images && data.images.length > 0) {
    markdownText += `\n\n## 📷 图片 (${data.images.length}张)\n\n`;
    data.images.slice(0, 10).forEach((img, idx) => {
      const sizeInfo = img.width && img.height ? ` (${img.width}×${img.height})` : '';
      markdownText += `${idx + 1}. ![${img.alt || '图片'}](${img.src})${sizeInfo}\n`;
    });
    if (data.images.length > 10) {
      markdownText += `\n...还有 ${data.images.length - 10} 张图片\n`;
    }
  }

  // 添加链接信息 - 增强展示
  if (data.links && data.links.length > 0) {
    markdownText += `\n\n## 🔗 链接 (${data.links.length}个)\n\n`;
    data.links.slice(0, 15).forEach((link) => {
      const domain = new URL(link.href).hostname;
      markdownText += `- [${link.text || link.href}](${link.href}) \`${domain}\`\n`;
    });
    if (data.links.length > 15) {
      markdownText += `\n...还有 ${data.links.length - 15} 个链接\n`;
    }
  }
  
  // 检测并添加视频信息
  const videoPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|bilibili\.com\/video\/|vimeo\.com\/)/i,
    /\.(mp4|webm|ogg|mov)(\?|$)/i
  ];
  
  const videoLinks = data.links?.filter(link => 
    videoPatterns.some(pattern => pattern.test(link.href))
  ) || [];
  
  if (videoLinks.length > 0) {
    markdownText += `\n\n## 🎥 视频 (${videoLinks.length}个)\n\n`;
    videoLinks.forEach((link, idx) => {
      markdownText += `${idx + 1}. [${link.text || '视频链接'}](${link.href})\n`;
    });
  }

  return {
    text: markdownText,
    html: data.html,
    images: data.images,
    links: data.links,
    meta: data.meta,
    sourceUrl: data.meta.url
  };
}

// ===============【事件处理】==================
// 选中文本：保存选中的数据 + 显示工具栏
function handleMouseUp(e: MouseEvent): void {
  // 如果点击的是工具栏本身，不处理
  if (toolbar && toolbar.contains(e.target as Node)) return;

  const selection = window.getSelection();
  if (!selection) return;

  const selectedText = selection.toString().trim();
  
  if (selectedText.length > 0 && selection.rangeCount > 0) {
    // 获取选区位置
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // 保存选中的数据
    selectedData = extractSelectionContent(selection, range);
    
    // 检查是否按住Ctrl/Cmd键进行多选
    if (e.ctrlKey || e.metaKey) {
      // 添加到多选列表（去重）
      const rangeText = range.toString().trim();
      const exists = multipleSelections.some(sel => sel.text === rangeText);
      if (!exists && rangeText.length > 0) {
        multipleSelections.push(selectedData);
        showToast(`已添加选区 ${multipleSelections.length}`, 'info');
        
        // 创建多选高亮标记
        const highlight = document.createElement('div');
        highlight.className = 'sc-multi-selection-highlight';
        highlight.setAttribute('data-index', String(multipleSelections.length));
        highlight.style.top = `${rect.top + window.scrollY}px`;
        highlight.style.left = `${rect.left + window.scrollX}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
        document.body.appendChild(highlight);
        multiSelectionHighlights.push(highlight);
      } else if (exists) {
        showToast('该选区已添加', 'warning');
      }
    } else {
      // 单选模式，清空多选列表和高亮
      if (multipleSelections.length > 0) {
        clearMultiSelectionHighlights();
        multipleSelections = [];
      }
    }
    
    updateMergeButton();
    
    // 显示工具栏
    showToolbar(rect);
  } else {
    hideToolbar();
  }
}

// 点击其他区域：隐藏工具栏
function handleMouseDown(e: MouseEvent): void {
  // 点击工具栏以外的地方，隐藏工具栏
  if (!toolbar || !toolbar.contains(e.target as Node)) {
    hideToolbar();
  }
}

// =================【剪藏操作】=====================
// 剪藏选中内容
async function clipSelection() {
  if (!selectedData) {
    showToast('请先选择要剪藏的内容', 'warning');
    return;
  }

  hideToolbar();
  const payload = convertToClipPayload(selectedData);
  await sendToBackground(payload);
  // 清除多选状态
  multipleSelections = [];
  updateMergeButton();
  // 自动打开侧边栏
  await openSidebar();
}

// 剪藏整页内容
async function clipFullPage() {
  hideToolbar();
  const fullPageData = extractFullPageData();
  const payload = convertToClipPayload(fullPageData);
  await sendToBackground(payload);
  // 自动打开侧边栏
  await openSidebar();
}


// 高亮选中内容
function highlightSelection() {
  if (!selectedData) {
    showToast('请先选择要高亮的内容', 'warning');
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // 移除旧的高亮
  if (highlightOverlay) {
    highlightOverlay.remove();
  }
  
  // 创建高亮覆盖层
  highlightOverlay = document.createElement('div');
  highlightOverlay.className = 'sc-highlight-overlay';
  highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
  highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;
  document.body.appendChild(highlightOverlay);
  
  showToast('已高亮选中内容', 'success');
  hideToolbar();
  
  // 3秒后自动移除高亮
  setTimeout(() => {
    if (highlightOverlay) {
      highlightOverlay.style.opacity = '0';
      setTimeout(() => {
        highlightOverlay?.remove();
        highlightOverlay = null;
      }, 200);
    }
  }, 3000);
}

// 合并多个选区
async function mergeSelections() {
  if (multipleSelections.length === 0) {
    showToast('没有可合并的选区', 'warning');
    return;
  }

  const count = multipleSelections.length;
  hideToolbar();
  clearMultiSelectionHighlights();
  
  // 合并所有选区的文本（智能合并，去除重复段落）
  const mergedText = multipleSelections.map((sel, idx) => 
    `【选区 ${idx + 1}】\n${sel.text.trim()}\n`
  ).join('\n---\n\n');
  
  // 合并HTML（添加分隔符）
  const mergedHtml = multipleSelections.map((sel, idx) => 
    `<div class="sc-merged-selection" data-index="${idx + 1}">${sel.html}</div>`
  ).join('\n<hr class="sc-selection-divider">\n');
  
  // 合并图片和链接（去重）
  const mergedImages: ImageData[] = [];
  const mergedLinks: LinkData[] = [];
  const seenImages = new Set<string>();
  const seenLinks = new Set<string>();
  
  multipleSelections.forEach(sel => {
    sel.images.forEach(img => {
      const absoluteSrc = resolveUrl(img.src);
      if (!seenImages.has(absoluteSrc)) {
        seenImages.add(absoluteSrc);
        mergedImages.push({ ...img, src: absoluteSrc });
      }
    });
    sel.links.forEach(link => {
      const absoluteHref = resolveUrl(link.href);
      if (!seenLinks.has(absoluteHref)) {
        seenLinks.add(absoluteHref);
        mergedLinks.push({ ...link, href: absoluteHref });
      }
    });
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
  await sendToBackground(payload);
  
  // 清除多选状态
  multipleSelections = [];
  updateMergeButton();
  showToast(`已合并 ${count} 个选区`, 'success');
  // 自动打开侧边栏
  await openSidebar();
}

// 清除多选高亮
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
  if (mergeBtn) {
    if (multipleSelections.length > 1) {
      mergeBtn.style.display = 'flex';
      mergeBtn.title = `合并 ${multipleSelections.length} 个选区 (Ctrl+M)`;
      // 显示合并按钮的父容器（子菜单）
      const submenu = mergeBtn.closest('.sc-submenu') as HTMLElement;
      if (submenu) {
        submenu.style.display = 'flex';
      }
    } else {
      // 不隐藏按钮，只是更新标题
      mergeBtn.title = '合并多个选区 (Ctrl+M) - 请先选择多个选区';
    }
  }
}

// 打开侧边栏
// 注意：必须在用户点击事件的处理函数中直接调用，以保持用户手势上下文
// 根据 Chrome API 文档，chrome.sidePanel.open() 只能在响应用户操作时调用
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

// 通用页面内容提取（用于自动剪藏）
function extractAndSendUniversalContent(): void {
  const pageData = extractUniversalContent();
  chrome.runtime.sendMessage({
    type: 'CLIP_CONTENT',
    payload: pageData
  }).catch(() => {}); // 忽略侧边栏未打开的错误
}

// =================【发送消息】======================
async function sendToBackground(payload: ClipContentPayload) {
  try {
    // 显示loading 状态
    showToast('正在发送剪藏请求...', 'loading');

    // 发送消息
    const response = await chrome.runtime.sendMessage({
      type: 'CLIP_CONTENT',
      payload: payload
    });

    // 隐藏loading toast
    hideLoadingToast();

    if (response && response.status === 'success') {
      showToast('剪藏成功！', 'success');
      // 清除选中
      window.getSelection()?.removeAllRanges();
      selectedData = null;
    } else {
      showToast('发送剪藏失败，请稍后再试', 'error');
    }

  } catch (error) {
    console.error('[SmartClipper] Error:', error);
    hideLoadingToast();
    showToast('发送剪藏失败，请稍后再试', 'error');
  }
}

// =================【快捷键处理】=====================
function handleKeyboardShortcuts(e: KeyboardEvent): void {
  // 如果用户正在输入，不处理快捷键
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return;
  }

  // Ctrl+K 或 Cmd+K: 剪藏当前选中内容
  if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.shiftKey) {
    e.preventDefault();
    if (selectedData) {
      clipSelection();
    } else {
      showToast('请先选择要剪藏的内容', 'warning');
    }
    return;
  }

  // Ctrl+M 或 Cmd+M: 合并多个选区
  if ((e.ctrlKey || e.metaKey) && e.key === 'm' && !e.shiftKey) {
    e.preventDefault();
    if (multipleSelections.length > 1) {
      mergeSelections();
    } else {
      showToast('请先选择多个选区（按住Ctrl/Cmd选择）', 'warning');
    }
    return;
  }


  // Esc: 隐藏工具栏并清除所有状态
  if (e.key === 'Escape') {
    e.preventDefault();
    hideToolbar();
    // 清除选中
    window.getSelection()?.removeAllRanges();
    selectedData = null;
    multipleSelections = [];
    clearMultiSelectionHighlights();
    updateMergeButton();
    return;
  }

  // Enter: 快速剪藏（工具栏可见时）
  if (e.key === 'Enter' && !e.shiftKey && toolbar?.classList.contains('visible')) {
    e.preventDefault();
    if (selectedData) {
      clipSelection();
    }
    return;
  }
}

// =================【初始化】==========================
function init() {
  // 创建工具栏
  toolbar = createToolbar();

  // 绑定事件监听
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // 添加滚动监听，使工具栏跟随文本移动
  window.addEventListener('scroll', () => {
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
  }, true);
  
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

  // 工具栏点击事件
  toolbar.querySelector('#sc-clip-selection')?.addEventListener('click', clipSelection);
  toolbar.querySelector('#sc-highlight')?.addEventListener('click', highlightSelection);
  toolbar.querySelector('#sc-open-sidebar')?.addEventListener('click', openSidebar);
  toolbar.querySelector('#sc-clip-page')?.addEventListener('click', clipFullPage);
  toolbar.querySelector('#sc-merge-selections')?.addEventListener('click', mergeSelections);

  // 1. 页面加载完成后，自动尝试提取整页信息
  window.addEventListener('load', () => {
    setTimeout(() => {
      // 只有当用户没有进行划词操作时，才发送整页数据，避免打扰
      const selection = window.getSelection()?.toString().trim() || '';
      if (!selection) {
        extractAndSendUniversalContent();
      }
    }, 1500);
  });

  // 2. 监听 URL 变化 (针对 B站、YouTube 这类单页应用切换视频)
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('检测到页面跳转，重新抓取...');
      setTimeout(() => {
        extractAndSendUniversalContent();
      }, 2000);
    }
  }).observe(document, { subtree: true, childList: true });

  console.log('[SmartClipper] Content script loaded');
}

// ==================【消息监听】========================
// 监听来自后台或侧边栏的消息
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.type === 'REQUEST_CONTENT') {
    // 当收到请求内容的消息时，提取页面内容并返回
    const pageData = extractUniversalContent();
    sendResponse(pageData);
    return true; // 保持消息通道开放
  }
  return false;
});

// ==================【启动应用】========================
// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
} else {
  init();
}
