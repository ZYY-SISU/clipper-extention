// 类型定义引入
import type{ senderType, sendResponseType, templateType, requestType } from '../types/index';

// 全局状态存储
const globalState = {
  content: '',
  structuredData: null,
  templates: [] as templateType[],
  isLoadingTemplates: true
}


// 初始化
async function init() { 
  console.log('Background script 初始化...')

  // 注册消息监听器
  chrome.runtime.onMessage.addListener(handleMessage)

  // 预加载模板列表（不阻塞初始化，静默失败）
  fetchTemplates().catch(err => {
    console.warn('模板列表预加载失败（不影响使用）:', err);
  });

  console.log('Background script 初始化完成')
}

// 消息处理函数
function handleMessage(request: requestType, _: senderType, sendResponse: sendResponseType) {
  console.log('【Background】 收到消息:', request);

  switch(request.type) {
    // 【接收剪藏内容】
    case 'CLIP_CONTENT':
      globalState.content = request.payload?.text || request.payload?.html || '';
      sendResponse({ status: 'success', message: '内容已接收' });
      return true;
    // 【获取模板列表】
    case 'FETCH_TEMPLATES':
      fetchTemplates().then(templates => {
        sendResponse({ status: 'success', data: templates, isLoading: globalState.isLoadingTemplates })
      }).catch(error => {
        sendResponse({status:'error', message: error.message})
      })
      return true;
    // 【AI 分析内容】
    case 'ANALYZE':
      handleStructure(request.payload?.content || '', request.payload?.template || '', request.payload?.model || '').then(data => {
        console.log('【Background】 结果:', data);
        sendResponse({status: 'success', data})
      }).catch(error => {
        sendResponse({status:'error', message: error.message})
      })
      return true;
    
    // 【保存到飞书】
    case 'SAVE_TO_FEISHU':
      handleSaveToFeishu().then(() => {
        sendResponse({status: 'success', message: '已保存到飞书'})
      }).catch(error => {
        sendResponse({status:'error', message: error.message})
      })
      return true;

    default:
      sendResponse({status: 'error', message: '未知的消息类型'})
      return false;
  }
}

// 默认模板列表（当后端服务不可用时使用）
const DEFAULT_TEMPLATES: templateType[] = [
  { id: 'summary', name: '智能摘要', iconType: 'text' },
  { id: 'table', name: '表格提取', iconType: 'table' },
  { id: 'checklist', name: '清单整理', iconType: 'check' },
];

// 获取模板列表
async function fetchTemplates() { 
  try {
    const res = await fetch('http://localhost:3000/api/templates', {
      // 设置超时，避免长时间等待
      signal: AbortSignal.timeout(3000)
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const json = await res.json();

    if(json.code === 200 && Array.isArray(json.data)) {
      globalState.templates = json.data;
      globalState.isLoadingTemplates = false;
      console.log('✅ 模板列表加载成功:', json.data.length, '个模板');
      return json.data;
    } else {
      throw new Error(json.message || '获取模板列表失败');
    }
  } catch(error: any) {
    // 后端服务未启动或网络错误时，使用默认模板
    console.warn('⚠️ 后端服务不可用，使用默认模板列表:', error.message);
    globalState.templates = DEFAULT_TEMPLATES;
    globalState.isLoadingTemplates = false;
    return DEFAULT_TEMPLATES;
  }
}

// 处理AI分析
async function handleStructure(content: string, template: string, model: string) {
  try {
    console.log('【Background】 调用AI分析接口，模型:', model);
    
    // 检查必填参数
    if (!content || !template || !model) {
      throw new Error('缺少必要参数: content, template 或 model');
    }
    
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content,
        template, 
        model       
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      // 提取更详细的错误信息
      const errorMessage = data.error || `服务器返回错误 (状态码: ${response.status})`;
      console.error('【Background】 AI分析失败:', errorMessage);
      throw new Error(errorMessage);
    }

    globalState.structuredData = data;
    return data;
  } catch (error) {
    console.error('【Background】 AI分析失败:', error);
    // 提供更友好的错误信息
    const errorMessage = error instanceof Error ? 
      (error.message.includes('model') ? `不支持的模型: ${model}` : error.message) : 
      'AI分析请求失败';
    throw new Error(errorMessage);
  }
}

// 保存到飞书
async function handleSaveToFeishu() {
  if(!globalState.structuredData) {
    console.error('【Background】 没有可导出的数据');
    throw new Error('没有可导出的数据');
  }

  try {
    // 1. 获取当前浏览器 Tab 的 URL (需要加上 url 字段)
    // 注意：这需要在 manifest.json 中开启 "tabs" 或 "activeTab" 权限
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url || '';

    // 组装数据
    const payload = {
      ...globalState.structuredData as object,
      url: currentUrl
    };

    const res = await fetch('http://localhost:3000/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if(!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '保存失败');
      }

      return { success: true, message: '已保存到飞书' }

  }catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
}

// 启动初始化
init().catch(console.error)

// 监听图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 打开侧边栏
  chrome.sidePanel.open({ tabId: tab.id || 0 });
});

