// 类型定义引入
import type{ senderType, sendResponseType, templateType, requestType, StructuredDataType, ClipContentPayload } from '../types/index';

// 全局状态存储
const globalState = {
  latestClip: null as ClipContentPayload | null,
  content: '',
  fullPayload: null as ClipContentPayload | null, // 完整剪藏数据（包含图片、链接、高亮等）
  structuredData: null as StructuredDataType | null,
  templates: [] as templateType[],
  isLoadingTemplates: true
}

// 【AI 识图处理函数】
async function handleVisionCapture(request: Extract<requestType, { type: 'CAPTURE_AND_VISION' }>, sendResponse: sendResponseType) {
  try {
    const { pageUrl, selection, isScreenshot } = request;
    
    console.log('【Background】开始处理 AI 识图:', { pageUrl, selection, isScreenshot });
    
    // 1. 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      throw new Error('无法获取当前标签页');
    }

    // 2. 截取整个可见区域
    const fullScreenshot = await chrome.tabs.captureVisibleTab({ format: 'jpeg', quality: 80 });
    console.log('【Background】截图完成，大小:', fullScreenshot.length);

    let finalDataUrl = fullScreenshot;

    // 3. 如果有选择区域，发送给 content script 进行裁剪
    if (selection) {
      console.log('【Background】发送裁剪请求:', selection);
      const cropResponse = await chrome.tabs.sendMessage(tab.id, {
        type: 'CROP_IMAGE',
        dataUrl: fullScreenshot,
        selection: selection
      });

      if (cropResponse?.status === 'success') {
        finalDataUrl = cropResponse.croppedDataUrl;
        console.log('【Background】裁剪完成');
      } else {
        throw new Error(cropResponse?.error || '图像裁剪失败');
      }
    }

    // 4. 发送到后端进行 AI 识别
    console.log('【Background】发送到后端 API...');
    const response = await fetch('http://localhost:3000/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: [{ dataUrl: finalDataUrl }],
        pageUrl: pageUrl,
        isScreenshot: isScreenshot
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('【Background】服务器错误:', response.status, errorText);
      throw new Error(`服务器错误: ${response.status}`);
    }

    const result = await response.json();
    console.log('【Background】AI 识别成功:', result);
    sendResponse({ status: 'success', result });
  } catch (error) {
    console.error('【Background】AI 识图失败:', error);
    sendResponse({ 
      status: 'error', 
      error: error instanceof Error ? error.message : '未知错误' 
    });
  }
}


// 初始化
async function init() { 
  console.log('Background script 初始化...')

  // 注册消息监听器
  chrome.runtime.onMessage.addListener(handleMessage)

  // 配置侧边栏行为：点击扩展图标时自动打开侧边栏
  try {
    await chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true
    });
    console.log('✅ 侧边栏行为已配置：点击图标自动打开');
  } catch (error) {
    console.warn('⚠️ 配置侧边栏行为失败（不影响使用）:', error);
  }

  // 预加载模板列表（不阻塞初始化，静默失败）
  fetchTemplates().catch(err => {
    console.warn('模板列表预加载失败（不影响使用）:', err);
  });

  console.log('Background script 初始化完成')
}

// 消息处理函数
function handleMessage(request: requestType, sender: senderType, sendResponse: sendResponseType) {
  console.log('【Background】 收到消息:', request);

  switch(request.type) {
    // 【接收剪藏内容】
    case 'CLIP_CONTENT':
      globalState.latestClip = request.payload || null;
      globalState.content = request.payload?.text || request.payload?.html || '';
      // 保存完整payload（包含图片、链接、高亮信息）
      globalState.fullPayload = request.payload || null;
      sendResponse({ status: 'success', message: '内容已接收' });
      chrome.runtime.sendMessage({ type: 'CLIP_CONTENT_UPDATED', payload: request.payload }).catch(() => {});
      return true;
        case 'GET_LAST_CLIP':
          sendResponse({ status: 'success', data: globalState.latestClip });
          return true;
    // 【打开侧边栏】
    // 根据 Chrome API 文档：https://developer.chrome.com/docs/extensions/reference/api/sidePanel
    // chrome.sidePanel.open() 只能在响应用户操作时调用
    // 从 content script 发送消息到这里时，用户手势上下文应该仍然有效
    case 'OPEN_SIDEPANEL': {
      const tabId = sender?.tab?.id;
      const windowId = sender?.tab?.windowId;

      const handleError = (error: unknown) => {
        const errorMsg = error instanceof Error ? error.message || '打开侧边栏失败' : '未知错误';
        console.error('【Background】❌ 打开侧边栏失败:', errorMsg);
        sendResponse({ status: 'error', message: errorMsg });
      };

      const tryOpenWithTab = (id: number) => {
        chrome.sidePanel.open({ tabId: id })
          .then(() => {
            console.log('【Background】✅ 侧边栏已打开，标签页ID:', id);
            sendResponse({ status: 'success', message: '侧边栏已打开' });
          })
          .catch((error) => {
            if (windowId !== undefined) {
              chrome.sidePanel.open({ windowId })
                .then(() => {
                  console.log('【Background】✅ 侧边栏已打开（使用 windowId），窗口ID:', windowId);
                  sendResponse({ status: 'success', message: '侧边栏已打开' });
                })
                .catch(handleError);
            } else {
              handleError(error);
            }
          });
      };

      if (tabId !== undefined) {
        tryOpenWithTab(tabId);
        return true;
      }

      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id !== undefined) {
          tryOpenWithTab(tab.id);
        } else if (tab?.windowId !== undefined) {
          chrome.sidePanel.open({ windowId: tab.windowId })
            .then(() => sendResponse({ status: 'success', message: '侧边栏已打开' }))
            .catch(handleError);
        } else {
          handleError(new Error('无法获取当前标签页信息'));
        }
      }).catch(handleError);

      return true;
    }
    // 【获取模板列表】
    case 'FETCH_TEMPLATES':
      fetchTemplates().then(templates => {
        sendResponse({ status: 'success', data: templates, isLoading: globalState.isLoadingTemplates })
      }).catch(error => {
        sendResponse({status:'error', message: error.message})
      })
      return true;
    // 【AI 分析内容】
    // case 'ANALYZE':
    //   handleStructure(request.payload?.content || '', request.payload?.template || '', request.payload?.model || '').then(data => {
    //     console.log('【Background】 结果:', data);
    //     sendResponse({status: 'success', data})
    //   }).catch(error => {
    //     sendResponse({status:'error', message: error.message})
    //   })
    //   return true;
    
    
    // 【保存到飞书】
    case 'SAVE_TO_FEISHU':
      handleSaveToFeishu().then(() => {
        sendResponse({status: 'success', message: '已保存到飞书'})
      }).catch(error => {
        sendResponse({status:'error', message: error.message})
      })
      return true;
       // 🟢 [新增] 接收 SidePanel 的结果同步
    case 'UPDATE_STRUCTURED_DATA':
      globalState.structuredData = request.payload;
      console.log('【Background】✅ 已更新结构化数据:', request.payload.title);
      sendResponse({ status: 'success' });
      return true;

    // 【AI 识图】截图并识别
    case 'CAPTURE_AND_VISION':
      if (request.type === 'CAPTURE_AND_VISION') {
        // 立即调用异步函数，不等待完成
        handleVisionCapture(request, sendResponse).catch(err => {
          console.error('【Background】handleVisionCapture 未捕获的错误:', err);
          sendResponse({ status: 'error', error: '处理失败' });
        });
      } else {
        sendResponse({ status: 'error', error: '消息类型错误' });
      }
      return true; // 保持消息通道开启

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
  } catch(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    // 后端服务未启动或网络错误时，使用默认模板
    console.warn('⚠️ 后端服务不可用，使用默认模板列表:', errorMessage);
    globalState.templates = DEFAULT_TEMPLATES;
    globalState.isLoadingTemplates = false;
    return DEFAULT_TEMPLATES;
  }
}

// 处理AI分析
// async function handleStructure(content: string, template: string, model: string) {
//   try {
//     console.log('【Background】 调用AI分析接口，模型:', model);
    
//     // 检查必填参数
//     if (!content || !template || !model) {
//       throw new Error('缺少必要参数: content, template 或 model');
//     }
    
//     const response = await fetch('http://localhost:3000/api/analyze', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         content: content,
//         template, 
//         model       
//       })
//     });

//     const data = await response.json();
    
//     if (!response.ok) {
//       // 提取更详细的错误信息
//       const errorMessage = data.error || `服务器返回错误 (状态码: ${response.status})`;
//       console.error('【Background】 AI分析失败:', errorMessage);
//       throw new Error(errorMessage);
//     }

//     globalState.structuredData = data;
//     return data;
//   } catch (error) {
//     console.error('【Background】 AI分析失败:', error);
//     // 提供更友好的错误信息
//     const errorMessage = error instanceof Error ? 
//       (error.message.includes('model') ? `不支持的模型: ${model}` : error.message) : 
//       'AI分析请求失败';
//     throw new Error(errorMessage);
//   }
// }

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

