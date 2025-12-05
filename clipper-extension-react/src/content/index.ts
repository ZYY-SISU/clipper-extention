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

// ✨ [新增] 全局开关状态与悬浮球元素
let isGlobalActive: boolean = true; // 默认为开启
let suspensionBall: HTMLElement | null = null;

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

function extractUniversalContent(): ClipContentPayload {
  const url = window.location.href;
  const title = getMetaContent(['meta[property="og:title"]', 'meta[name="twitter:title"]', 'meta[name="title"]', 'title']) || '未命名网页';
  const desc = getMetaContent(['meta[property="og:description"]', 'meta[name="twitter:description"]', 'meta[name="description"]']) || '暂无简介';
  const image = getMetaContent(['meta[property="og:image"]', 'meta[name="twitter:image"]', 'link[rel="image_src"]']);
  const ogType = getMetaContent(['meta[property="og:type"]']);
  const isVideo = ogType.includes('video') || url.includes('bilibili.com/video') || url.includes('youtube.com/watch');
  const meta = getPageMeta();
  
  return {
    text: `【${isVideo ? '视频' : '网页'}智能剪藏】\n标题：${title}\n链接：${url}\n\n${desc ? `简介：${desc}` : ''}\n${image ? `\n![封面图](${resolveUrl(image)})` : ''}`,
    sourceUrl: url,
    meta: meta
  };
}

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

    /* 悬停 Wrapper 显示卫星 */
    #sc-suspension-wrapper:hover .sc-sub-action {
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    /* 卫星弹出位置 */
    #sc-suspension-wrapper:hover .sc-action-feedback { transform: translateY(-55px) scale(1) !important; }
    #sc-suspension-wrapper:hover .sc-action-toggle { transform: translateX(-55px) scale(1) !important; }

    /* 卫星悬停态 */
    .sc-sub-action:hover {
      background: #3b82f6 !important; color: white !important; transform: scale(1.1) !important;
    }
    /* 修正悬停时位置保持，防止回弹 */
    #sc-suspension-wrapper:hover .sc-action-feedback:hover { transform: translateY(-55px) scale(1.1) !important; }
    #sc-suspension-wrapper:hover .sc-action-toggle:hover { transform: translateX(-55px) scale(1.1) !important; }
    
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
    
    /* 高亮层 */
    .sc-highlight-overlay { position: absolute !important; background-color: rgba(255, 235, 59, 0.3) !important; border: 2px solid rgba(255, 193, 7, 0.6) !important; pointer-events: none !important; z-index: 2147483646 !important; }
    .sc-multi-selection-highlight { position: absolute !important; background-color: rgba(139, 92, 246, 0.25) !important; border: 2px dashed rgba(139, 92, 246, 0.8) !important; pointer-events: none !important; z-index: 2147483645 !important; }
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

  document.body.appendChild(toolbarElement);
  return toolbarElement;
}

// ============= 【工具栏显示逻辑 (保持原样)】================
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
  
  const rectTop = rect.top + scrollY;
  const rectBottom = rect.bottom + scrollY;
  const rectLeft = rect.left + scrollX;
  const rectCenterX = rectLeft + rect.width / 2;
  
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
  
  toolbar.style.top = `${finalTop - scrollY}px`;
  toolbar.style.left = `${finalLeft - scrollX}px`;
  toolbar.style.visibility = 'visible';
  toolbar.classList.add('visible');
}

function hideToolbar(): void {
  if (!toolbar) return;
  toolbar.classList.remove('visible');
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

function convertToClipPayload(data: SelectionData | PageData): ClipContentPayload {
  let markdownText = data.text;
  
  if (data.images && data.images.length > 0) {
    markdownText += `\n\n## 📷 图片 (${data.images.length}张)\n\n`;
    data.images.slice(0, 10).forEach((img, idx) => {
      markdownText += `${idx + 1}. ![${img.alt || '图片'}](${img.src})\n`;
    });
  }

  if (data.links && data.links.length > 0) {
    markdownText += `\n\n## 🔗 链接 (${data.links.length}个)\n\n`;
    data.links.slice(0, 15).forEach((link) => {
      markdownText += `- [${link.text || link.href}](${link.href})\n`;
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
    } else {
      hideToolbar();
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
  await sendToBackground(payload);
  
  multipleSelections = [];
  updateMergeButton();
  await openSidebar();
}

async function clipFullPage() {
  hideToolbar();
  const fullPageData = extractFullPageData();
  const payload = convertToClipPayload(fullPageData);
  await sendToBackground(payload);
  await openSidebar();
}

function highlightSelection() {
  if (!selectedData) {
    showToast('请先选择要高亮的内容', 'warning');
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  if (highlightOverlay) highlightOverlay.remove();
  
  highlightOverlay = document.createElement('div');
  highlightOverlay.className = 'sc-highlight-overlay';
  highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
  highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;
  document.body.appendChild(highlightOverlay);
  
  showToast('已高亮选中内容', 'success');
  hideToolbar();
  
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
  await sendToBackground(payload);
  
  multipleSelections = [];
  updateMergeButton();
  showToast(`已合并 ${count} 个选区`, 'success');
  await openSidebar();
}

function clearMultiSelectionHighlights() {
  multiSelectionHighlights.forEach(el => el.remove());
  multiSelectionHighlights = [];
}

function updateMergeButton() {
  const mergeBtn = toolbar?.querySelector('#sc-merge-selections') as HTMLElement;
  const submenu = toolbar?.querySelector('.sc-submenu') as HTMLElement;
  
  if (mergeBtn && submenu) {
    if (multipleSelections.length > 1) {
      mergeBtn.style.display = 'flex';
      mergeBtn.title = `合并 ${multipleSelections.length} 个选区 (Ctrl+M)`;
      submenu.style.display = 'flex';
    } else {
      mergeBtn.title = '合并多个选区 (Ctrl+M) - 请先选择多个选区';
    }
  }
}

// 侧边栏通信
async function openSidebar() {
  try {
    console.log('[SmartClipper] 尝试打开侧边栏');
    await chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
  } catch (error) {
    console.error('[SmartClipper] 打开侧边栏失败:', error);
    showToast('打开侧边栏失败，请点击浏览器右上角图标', 'error');
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
  };
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);

  // 4. 绑定工具栏按钮事件
  toolbar.querySelector('#sc-clip-selection')?.addEventListener('click', clipSelection);
  toolbar.querySelector('#sc-highlight')?.addEventListener('click', highlightSelection);
  toolbar.querySelector('#sc-open-sidebar')?.addEventListener('click', openSidebar);
  toolbar.querySelector('#sc-clip-page')?.addEventListener('click', clipFullPage);
  toolbar.querySelector('#sc-merge-selections')?.addEventListener('click', mergeSelections);

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
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.type === 'REQUEST_CONTENT') {
    const pageData = extractUniversalContent();
    sendResponse(pageData);
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