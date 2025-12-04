// src/content/index.ts
console.log('AI剪藏助手：通用智能抓取脚本已就绪');

// ============【类型定义】=================
import type{ SelectionData, PageMeta, PageData, ImageData, LinkData, ClipContentPayload } from '../types/index';

// =============【状态管理】================
let toolbar: HTMLElement | null = null;
let selectedData: SelectionData | null = null;
let toastElement: HTMLElement | null = null;
let loadingToast: HTMLElement | null = null;

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
    
    /* 工具栏样式 - 增强优先级 */
    body #smart-clipper-toolbar {
      position: absolute !important;
      background: white !important;
      border: 1px solid rgba(226, 232, 240, 0.8) !important;
      color: #1e293b !important;
      border-radius: 16px !important;
      padding: 8px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
      -webkit-box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
      z-index: 2147483647 !important;
      display: none !important;
      gap: 8px !important;
      opacity: 0 !important;
      transform: translateY(-10px) !important;
      -webkit-transform: translateY(-10px) !important;
      pointer-events: none !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
    }
    
    /* 显示工具栏的visible类 */
    body #smart-clipper-toolbar.visible {
      display: flex !important;
      opacity: 1 !important;
      transform: translateY(0) !important;
      -webkit-transform: translateY(0) !important;
      pointer-events: auto !important;
      animation: sc-fadeIn 0.3s ease forwards !important;
      -webkit-animation: sc-fadeIn 0.3s ease forwards !important;
    }
    /* 动画 - 性能优化 */
    @keyframes sc-fadeIn {
      to {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
    }

    @-webkit-keyframes sc-fadeIn {
      to {
        opacity: 1 !important;
        -webkit-transform: translateY(0) !important;
      }
    }

    /* 按钮样式 - 增强优先级和交互性 */
    #smart-clipper-toolbar button {
      background: #f8fafc !important;
      border: 1px solid transparent !important;
      border-radius: 12px !important;
      color: #475569 !important;
      padding: 10px 16px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      -webkit-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      outline: none !important;
      pointer-events: auto !important;
      font-weight: 600 !important;
      font-size: 13px !important;
    }

    #smart-clipper-toolbar button:hover {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      color: white !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2) !important;
    }

    #smart-clipper-toolbar button:active {
      background: #2563eb !important;
      transform: translateY(0) !important;
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
    <button id="sc-clip-selection" title="剪藏选中内容">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
      </svg>
      <span>剪藏选区</span>
    </button>
    <button id="sc-clip-page" title="剪藏整页">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span>剪藏整页</span>
    </button>
  `;

  // 添加到页面
  document.body.appendChild(toolbarElement);
  return toolbarElement;
}

// 显示工具栏
function showToolbar(rect: DOMRect): void {
  if (!toolbar) return;

  // 计算位置 - 默认显示在选区上方居中位置
  let top = rect.top + window.scrollY - toolbar.offsetHeight - 8;
  let left = rect.left + window.scrollX + (rect.width / 2) - (toolbar.offsetWidth / 2);

  // 边界检查 - 垂直方向
  if (top < window.scrollY + 8) {
    // 如果上方空间不足，显示在选区下方
    top = rect.bottom + window.scrollY + 8;
  }
  
  // 边界检查 - 水平方向
  if (left < 8) left = 8; // 左边界限制
  if (left + toolbar.offsetWidth > window.innerWidth - 8) {
    // 右边界限制
    left = window.innerWidth - toolbar.offsetWidth - 8;
  }

  toolbar.style.top = `${top}px`;
  toolbar.style.left = `${left}px`;
  toolbar.classList.add('visible');
}

// 隐藏工具栏
function hideToolbar(): void {
  if (!toolbar) return;
  toolbar.classList.remove('visible');
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
// 提取选区数据
function extractSelectionContent(selection: Selection, range: Range): SelectionData { 
  // 获取纯文本
  const text = selection.toString().trim();

  // 获取 HTML 内容
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  const html = container.innerHTML;

  // 提取选区内的图片
  const images: ImageData[] = [];
  container.querySelectorAll('img').forEach(img => {
    const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
    if (src) {
      images.push({
        src: src,
        alt: img.alt || '',
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0
      });
    }
  });

  // 提取选区内的链接
  const links: LinkData[] = [];
  container.querySelectorAll('a[href]').forEach(a => {
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
    type: 'selection',
    text,
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
 * 将SelectionData或PageData转换为ClipContentPayload格式
 */
function convertToClipPayload(data: SelectionData | PageData): ClipContentPayload {
  // 构建Markdown格式的文本
  let markdownText = data.text;
  
  // 添加图片信息
  if (data.images && data.images.length > 0) {
    markdownText += `\n\n## 图片 (${data.images.length}张)\n\n`;
    data.images.slice(0, 5).forEach((img, idx) => {
      markdownText += `${idx + 1}. ![${img.alt || '图片'}](${img.src})\n`;
    });
    if (data.images.length > 5) {
      markdownText += `\n...还有 ${data.images.length - 5} 张图片\n`;
    }
  }

  // 添加链接信息
  if (data.links && data.links.length > 0) {
    markdownText += `\n\n## 链接 (${data.links.length}个)\n\n`;
    data.links.slice(0, 10).forEach((link) => {
      markdownText += `- [${link.text || link.href}](${link.href})\n`;
    });
    if (data.links.length > 10) {
      markdownText += `\n...还有 ${data.links.length - 10} 个链接\n`;
    }
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
}

// 剪藏整页内容
async function clipFullPage() {
  hideToolbar();
  const fullPageData = extractFullPageData();
  const payload = convertToClipPayload(fullPageData);
  await sendToBackground(payload);
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

// =================【初始化】==========================
function init() {
  // 创建工具栏
  toolbar = createToolbar();

  // 绑定事件监听
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousedown', handleMouseDown);
  
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
  toolbar.querySelector('#sc-clip-page')?.addEventListener('click', clipFullPage);

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
