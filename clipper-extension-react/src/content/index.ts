// src/content/index.js
console.log('AI剪藏助手：通用智能抓取脚本已就绪');

/**
 * 通用元数据获取工具
 * 依次尝试传入的选择器，返回第一个获取到的非空值
 */
function getMetaContent(selectors: string[]): string {
  for (const selector of selectors) {
    // 尝试获取 meta 标签的 content 属性
    const element = document.querySelector(selector);
    if (element) {
      // 兼容 innerText (如 title 标签) 和 content (如 meta 标签)
      const content = element.getAttribute('content') || (element as HTMLElement).innerText;
      if (content && content.trim()) return content.trim();
    }
  }
  return '';
}

/**
 * 核心：通用页面解析器
 * 不依赖特定网站结构，而是依赖通用的互联网标准 (Open Graph)
 */
const extractUniversalContent = () => {
  const url = window.location.href;

  // 1. 获取标题 (优先级: og:title -> twitter:title -> 网页title标签)
  const title = getMetaContent([
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
    'title'
  ]) || '未命名网页';

  // 2. 获取简介 (优先级: og:description -> twitter:description -> description)
  const desc = getMetaContent([
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
    'meta[name="description"]'
  ]) || '暂无简介';

  // 3. 获取封面图 (优先级: og:image -> twitter:image)
  const image = getMetaContent([
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'link[rel="image_src"]'
  ]);

  // 4. 智能判断类型 (是视频还是普通文章?)
  // 检查 og:type 是否包含 video，或者 URL 是否包含常见视频网站特征
  const ogType = getMetaContent(['meta[property="og:type"]']);
  const isVideo = ogType.includes('video') || 
                  url.includes('bilibili.com/video') || 
                  url.includes('youtube.com/watch');

  // 5. 组装数据
  return {
    type: isVideo ? 'VIDEO_CLIP' : 'PAGE_CLIP',
    // 这里组装成 Markdown 格式的文本，方便 Side Panel 预览
    text: `【${isVideo ? '视频' : '网页'}智能剪藏】
标题：${title}
链接：${url}

${desc ? `简介：${desc}` : ''}
${image ? `\n![封面图](${image})` : ''}`,
    
    // 同时把原始数据传过去，方便后续存储结构化数据
    raw: { title, url, desc, image, isVideo }
  };
};

// --- 事件监听逻辑 ---

// 1. 页面加载完成后，自动尝试提取整页信息
// 延迟 1.5秒 是为了等待某些单页应用(SPA)渲染 Meta 标签
window.addEventListener('load', () => {
  setTimeout(() => {
    // 只有当用户没有进行划词操作时，才发送整页数据，避免打扰
    const selection = window.getSelection()?.toString().trim() || '';
    if (!selection) {
      const pageData = extractUniversalContent();
      chrome.runtime.sendMessage({
        type: 'CLIP_CONTENT',
        payload: pageData
      }).catch(() => {}); // 忽略侧边栏未打开的错误
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
      const pageData = extractUniversalContent();
      chrome.runtime.sendMessage({
        type: 'CLIP_CONTENT',
        payload: pageData
      }).catch(() => {});
    }, 2000);
  }
}).observe(document, { subtree: true, childList: true });

// 3. 划词剪藏 (优先级最高)
document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  const selectedText = selection ? selection.toString().trim() : '';

  if (selectedText.length > 0) {
    chrome.runtime.sendMessage({
      type: 'CLIP_CONTENT',
      payload: {
        text: selectedText,
        source: 'selection'
      }
    }).catch(() => {});
  }
});