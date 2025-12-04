import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  FileText, Table, CheckSquare, Sparkles, Bot,
  Star, Send, MessageSquare, ChevronDown, Check, Zap,
  Brain ,Globe, PlusCircle, History,

 CloudUpload, // 🟢 新增：用于导出按钮的图标
  CheckCircle, // 🟢 新增：用于成功状态
  Loader2,      // 🟢 新增：用于加载状态
  User,         // 🟢 新增：用于个人用户图标
  Settings ,     // 🟢 新增：用于设置图标
  Video,
  PlayCircle, ThumbsUp, Coins, Bookmark, User as UserIcon, Quote, Tag, Smile, Frown, Meh// 🟢 [新增] 视频相关图标

} from 'lucide-react'; 
import type{ requestType, senderType, sendResponseType, templateType,UserConfig } from '../types/index';
import { ChatStorage } from '../utils/chatStorage';
import type { ChatMessage, Conversation } from '../utils/chatStorage';
import './SidePanel.css';

// --- 1. 定义模型列表 ---
const AI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', icon: Zap, color: '#10a37f', tag: '强力' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', icon: Brain, color: '#4f46e5', tag: '深度思考' },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', icon: Zap, color: '#f59e0b', tag: '快速' },
  { id: 'claude-3-5', name: 'Claude 3.5', icon: Bot, color: '#7c3aed', tag: '高智商' },
];

function SidePanel() {
  // --- 状态管理 ---
  const [view, setView] = useState('clipper'); // 'clipper' | 'chat'
  const [content, setContent] = useState('');
  const [structuredData, setStructuredData] = useState<any>(null);// 🟢 1. 新增状态:用于存储 AI 分析出来的原始结构化数据，以便发给飞书
  const [isSaving, setIsSaving] = useState(false);// 🟢 2. 新增状态：控制导出按钮的 Loading 状态
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  const [userInfo, setUserInfo] = useState<{name: string, avatar: string, token: string} | null>(null);  // 🟢 [新增] 用于存储登录成功后的用户信息（名字、头像、Token）
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(false); // 初始化 Loading // 🟢 [新增] 存储用户填写的飞书多维表格链接
  
  
  // 🟢 [新增] 控制是否显示“设置面板”
  const [showSettings, setShowSettings] = useState(false);

  // 模板数据
  const [templates, setTemplates] = useState<templateType[]>([]); 
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true); // 修改加载状态

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [status, setStatus] = useState('ready');

  // 模型选择
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]); 
  const [showModelList, setShowModelList] = useState(false); 

  // 聊天与打分
  const [rating, setRating] = useState(0); 
  const [userNote, setUserNote] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  // 对话管理
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // =================================================================================
  //  接收剪藏数据
  // =================================================================================
  useEffect(() => {
    const handleMessage = (request:requestType, _:senderType, sendResponse:sendResponseType) => {
      if (request.type === 'CLIP_CONTENT') {
        setContent(request.payload.text || request.payload.html || '');
        sendResponse({ status: 'success' });
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // =================================================================================
  // 组件挂载时加载初始数据
  // =================================================================================
  useEffect(() => {
    const loadInitialData = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        setCurrentUrl(tab.url);
        // 加载所有对话
        const convos = ChatStorage.getConversationList(tab.url);
        setConversations(convos);
        
        // 如果有对话，选择第一个
        if (convos.length > 0) {
          setCurrentConversationId(convos[0].id);
          setChatHistory(convos[0].messages);
        } else {
          // 创建新对话
          const newConvo = ChatStorage.createConversation(tab.url);
          setConversations([newConvo]);
          setCurrentConversationId(newConvo.id);
          setChatHistory([]);
        }
      }
    };
    loadInitialData();
  }, []);

  // =================================================================================
  // 聊天记录更新时自动保存
  // =================================================================================
  useEffect(() => {
    if (currentUrl && currentConversationId) {
      ChatStorage.updateConversationMessages(currentUrl, currentConversationId, chatHistory);
      // 更新对话列表
      setConversations(ChatStorage.getConversationList(currentUrl));
    }
  }, [chatHistory, currentUrl, currentConversationId]);

  // =================================================================================
  // 监听标签页切换事件，当切换标签页时，获取当前页面内容和聊天记录
  // =================================================================================
  useEffect(() => {
    // 标签页切换时触发
    const handleTabChange = async () => {
      try {
        // 先保存当前页面的聊天记录
        if (currentUrl && currentConversationId) {
          ChatStorage.updateConversationMessages(currentUrl, currentConversationId, chatHistory);
        }
        
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          // 更新当前URL
          const newUrl = tab.url || '';
          setCurrentUrl(newUrl);
          
          // 加载新页面的对话列表
          const newConversations = ChatStorage.getConversationList(newUrl);
          setConversations(newConversations);
          
          // 如果有对话，选择第一个
          if (newConversations.length > 0) {
            setCurrentConversationId(newConversations[0].id);
            setChatHistory(newConversations[0].messages);
          } else {
            // 创建新对话
            const newConvo = ChatStorage.createConversation(newUrl);
            setConversations([newConvo]);
            setCurrentConversationId(newConvo.id);
            setChatHistory([]);
          }
          
          // 向当前标签页的内容脚本发送消息，请求内容
          if (tab.id) {
            const pageData = await chrome.tabs.sendMessage(tab.id, {
              type: 'REQUEST_CONTENT'
            }).catch(() => {
              // 如果侧边栏先于内容脚本加载，可能会失败，忽略错误
              return null;
            });
            
            // 如果成功获取到内容，更新状态
            if (pageData) {
              setContent(pageData.text || pageData.html || '');
            }
          }
        }
      } catch (error) {
        console.error('标签页切换监听错误:', error);
      }
    };

    // 监听标签页激活事件
    chrome.tabs.onActivated.addListener(handleTabChange);
    // 监听标签页更新事件（如页面加载完成）
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'complete') {
        // 检查更新的标签页是否是当前活动标签页
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id === tabId) {
            handleTabChange();
          }
        });
      }
    });

    // 组件加载时，也获取一次当前页面内容
    handleTabChange();

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabChange);
    };
  }, []);

  // =================================================================================
  //  组件加载时，向后端请求模版列表
  // =================================================================================
  useEffect(() => {
    const fetchTemplates = async () => {
      console.log("🚀 前端正在尝试连接后端...");
      try {
        // 请求后端接口，设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const res = await fetch('http://localhost:3000/api/templates', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const json = await res.json();
        
        if (json.code === 200 && Array.isArray(json.data)) {
          setTemplates(json.data); // 将后端返回的数组存入状态
          console.log("✅ 模板列表加载成功:", json.data.length, "个模板");
        } else {
          throw new Error(json.message || '获取模板列表失败');
        }
      } catch (error: any) {
        // 后端服务未启动或网络错误时，使用默认模板
        console.warn("⚠️ 后端服务不可用，使用默认模板:", error.message);
        // 兜底策略：如果后端没开，显示默认模板
        setTemplates([
          { id: 'summary', name: '智能摘要', iconType: 'text' },
          { id: 'table', name: '表格提取', iconType: 'table' },
          { id: 'checklist', name: '清单整理', iconType: 'check' },
          { id: 'video-summary', name: '视频摘要', iconType: 'Video' }
        ]);
      } finally {
        setIsLoadingTemplates(false); // 无论成功失败，都结束加载状态
      }
    };

    fetchTemplates();
  }, []); // 空数组代表只在组件挂载时执行一次

  // 🌟【修改点 3】图标映射增强
  const getIconComponent = (type:templateType['iconType']) => {
    switch(type) {
      case 'text': return FileText;
      case 'table': return Table;
      case 'check': return CheckSquare;
      case 'globe': return Globe; // 适配翻译图标
      case 'Video': return Video;
      default: return FileText;
    }
  };

  // 自动滚动,新增
  useEffect(() => {
    if (view === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, view]);


  useEffect(() => {
    if (view === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, view]);

// =================================================================================
  //  接口区域 3：提交任务 (已修改：只展示 标题、摘要、情感、标签)
  // =================================================================================
  const handleStructure = async () => {
    if (!content) return alert('请先剪藏内容');
    if (!selectedTemplateId) return alert('请选择模板');
    
    setStatus('processing');
    setSaveStatus('idle'); 
    
    try {
      console.log('🚀 发起 AI 请求...');
      
      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content,
          template: selectedTemplateId, 
          model: selectedModel.id       
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '服务器返回错误');
      }

      console.log('✅ AI 响应成功:', data);

      // 1. 存下数据 (给飞书用)
      setStructuredData(data); 

      // 🟢 [新增] 同时通知 Background，让它也保存一份（用于多标签页同步）
    chrome.runtime.sendMessage({
      type: 'UPDATE_STRUCTURED_DATA',
      payload: data
    }).catch(err => {
      console.warn('⚠️ 通知 Background 失败（不影响使用）:', err);
    });

      setStatus('ready');
      setView('chat'); 
      
      // 使用Markdown格式优化AI响应消息
      let displayText = '';

      // 使用Markdown卡片和分隔线创建清晰的视觉层次
      displayText += `# AI内容分析结果`;

      // (1) 标题 - 使用一级标题强调
      displayText += `## 标题
      **${data.title || '未提取到标题'}**\n\n`;
      
      // (2) 摘要 - 使用代码块样式美化
      displayText += `## 摘要
> ${data.summary || '未提取到摘要'}\n\n`;
      
      // (3) 情感 - 更好的情感展示
      const sentimentMap: Record<string, string> = {
        'positive': '正面 👍',
        'negative': '负面 👎',
        'neutral': '中性 😐'
      };
      const sentimentShow = sentimentMap[data.sentiment] || data.sentiment || '未知';
      displayText += `## 情感分析
${sentimentShow}\n\n`;
      
      // (4) 标签 - 使用Markdown列表格式
      displayText += `## 关键词标签\n`;
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        // 使用Markdown列表语法
        displayText += data.tags.map((tag:string) => `- ${tag}`).join('\n');
      } else {
        displayText += '无';
      }
      
      // 添加分隔线和来源信息（使用meta-info类）
      displayText += `\n\n---\n<div class="meta-info">生成于: ${new Date().toLocaleString()}<br>模型: ${selectedModel.name}</div>`;

      // 3. 更新聊天记录
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        text: displayText 
      }]);

    } catch (error) {
      console.error("❌ 请求失败:", error);
      setStatus('ready');
      alert(`请求失败: ${error}\n请检查后端是否开启`);
    }
  };
  
/*   // =================================================================================
  //  接口区域 4：对话交互
  // =================================================================================
  const handleSend = () => {
    if (!userNote.trim()) return;
    const newHistory = [...chatHistory, { role: 'user', text: userNote }];
    setChatHistory(newHistory);
    setUserNote('');
    console.log('💬 [发送消息]', { prompt: userNote, modelId: selectedModel.id });

    setTimeout(() => {
      setChatHistory([...newHistory, { 
        role: 'ai', 
        text: `(来自 ${selectedModel.name}): 收到反馈！` 
      }]);
    }, 800);
  }; */

// =================================================================================
  //  接口区域 4：完整的对话交互模块 
  // =================================================================================
// =================================================================================
  //  修改接口区域 4：对话交互 (带上下文版)
  // =================================================================================
  const handleSend = async () => {
    if (!userNote.trim()) return;
    
    // 1. UI 更新
    const currentMsg = userNote;
    const newHistory = [...chatHistory, { role: 'user', text: currentMsg }];
    setChatHistory(newHistory);
    setUserNote('');
    
    // 2. Loading
    const loadingMsg = { role: 'ai', text: 'Thinking...', isLoading: true };
    setChatHistory([...newHistory, loadingMsg]);

    try {
      // 修改：准备上下文数据
      // 如果有结构化结果就用结构化的，没有就用原始文本
      const contextData = structuredData || content; 

      console.log('💬 发送对话请求:', { message: currentMsg, hasContext: !!contextData });

      // 3. 发起请求 (带上 context)
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMsg,
          model: selectedModel.id,
          context: contextData //  把这个发给后端
        })
      });

      const data = await response.json();

      // 4. 更新回复
      setChatHistory((prev: ChatMessage[]) => {
        const historyWithoutLoading = prev.filter(msg => !msg.isLoading);
        return [...historyWithoutLoading, { 
          role: 'ai', 
          text: data.reply || "AI 没有返回内容" 
        }];
      });

    } catch (error: any) {
      console.error("对话失败:", error);
      setChatHistory((prev: ChatMessage[]) => {
        const historyWithoutLoading = prev.filter(msg => !msg.isLoading);
        return [...historyWithoutLoading, { 
          role: 'ai', 
          text: `❌ 发送失败: ${error.message}` 
        }];
      });
    }
  };
// =================================================================================
  //   登录飞书
  // =================================================================================
  // 🟢 [新增] 处理飞书登录的核心函数
  const handleLogin = () => {
    // 1. 定义你的飞书 App ID (请去飞书开发者后台复制)
    const CLIENT_ID = "cli_a9a8533b64789cd6"; // ⚠️ 请替换为你自己的 App ID

    // 2. 获取 Chrome 插件专属的重定向地址
    // 格式通常是: https://<插件ID>.chromiumapp.org/
    // ⚠️ 记得把这个地址填到飞书后台的“安全设置 -> 重定向URL”里！
    const REDIRECT_URI = chrome.identity.getRedirectURL(); 
    
    // 3. 拼接飞书的授权页面 URL
    // 我们使用 window.encodeURIComponent 对回调地址进行编码，防止特殊字符出错
    const authUrl = `https://open.feishu.cn/open-apis/authen/v1/index?` + 
      `app_id=${CLIENT_ID}` + 
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` + 
      `&state=RANDOM_STATE`; // state 用于防伪造，这里简单写一个随机字符串即可

    console.log("正在发起授权，回调地址:", REDIRECT_URI);

    // 4. 调用 Chrome 原生 API 弹出登录窗口
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,      // 飞书登录页地址
        interactive: true  // 必须为 true，表示允许弹出窗口让用户交互
      },
      async (redirectUrl) => {
        // 5. 回调处理：如果用户关闭窗口或出错
        if (chrome.runtime.lastError || !redirectUrl) {
          console.error("登录取消或失败:", chrome.runtime.lastError);
          return alert("登录已取消");
        }

        // 6. 从返回的 URL 中提取 code 参数
        // 返回的 url 类似: https://<id>.chromiumapp.org/?code=xxxxxx&state=...
        const urlObj = new URL(redirectUrl);
        const code = urlObj.searchParams.get("code");

        if (code) {
          // 7. 拿到 code 了！发送给后端去换 Token
          try {
            const res = await fetch('http://localhost:3000/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }) // 把 code 发给后端
            });
            
            const json = await res.json();
            
            // 8. 后端验证成功，保存用户信息
            if(json.code === 200) {
              setUserInfo({
                name: json.data.user.name,       // 用户名
                avatar: json.data.user.avatar_url,// 头像地址
                token: json.data.token           // 用户 Token (存飞书要用)
              });
              alert(`登录成功！你好，${json.data.user.name}`);
              checkAndInitConfig(json.data.token);// 🟢 登录成功后，立即触发初始化流程
            } else {
              alert("后端登录失败: " + json.error);
            }
          } catch (e) {
            console.error(e);
            alert("连接后端失败，请确保 npm run dev 已启动后端服务");
          }
        }
      }
    );
  };

// =================================================================================
  //新建飞书多维表格
  // =================================================================================
  // 🟢 [新增] 检查并初始化配置
  const checkAndInitConfig = async (token: string) => {
    setIsInitializing(true);
    try {
      // 1. 先看 Chrome 本地有没有存过
      const storage = await chrome.storage.sync.get(['clipper_conf']);

      if (storage.clipper_conf) {
        console.log("读取到本地配置:", storage.clipper_conf);

        // 🟢 [修改] 增加 "as UserConfig" 进行类型断言
        // 告诉 TS：把 storage.clipper_conf 强制当做 UserConfig 类型处理
        setUserConfig(storage.clipper_conf as UserConfig);

        setIsInitializing(false);
        return;
      }

      // 2. 如果没存过，请求后端自动创建
      console.log("未找到配置，开始自动初始化...");
      const res = await fetch('http://localhost:3000/api/init-feishu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAccessToken: token })
      });
      
      const json = await res.json();
      if (json.code === 200) {
        const newConfig = json.data;
        // 3. 存入 Chrome 同步存储 (永久保存)
        await chrome.storage.sync.set({ 'clipper_conf': newConfig });
        setUserConfig(newConfig);
        alert("🎉 已为你自动创建好【AI 剪藏知识库】！");
      } else {
        throw new Error(json.error);
      }

    } catch (e: any) {
      console.error(e);
      alert(`初始化失败: ${e.message}\n请确保你已开通“多维表格”相关权限`);
    } finally {
      setIsInitializing(false);
    }
  };

// =================================================================================
  //  配置飞书多维表格，辅助工具：从飞书 URL 中提取 AppToken 和 TableId，，，，
  // 链接示例：https://xxx.feishu.cn/base/bascnABCDEF123?table=tblXYZ789
  //废弃
  // =================================================================================
  
  const parseFeishuUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      // 1. 提取 base token (通常在路径里，以 bas 开头)
      const pathParts = urlObj.pathname.split('/');
      const appToken = pathParts.find(p => p.startsWith('bas'));
      
      // 2. 提取 table id (在参数里，以 tbl 开头)
      const tableId = urlObj.searchParams.get('table');

      if (appToken && tableId) {
        return { appToken, tableId };
      }
      return null;
    } catch (e) {
      return null;
    }
  };

// =================================================================================
  //   处理导出到飞书
  // =================================================================================
  const handleExportToFeishu = async () => {
    if (!structuredData) return;

    // 1. 检查是否登录
    if (!userInfo || !userInfo.token) {
      alert("请先点击右下角头像登录飞书账号！");
      return;
    }

   // 🟢 改用 userConfig 判断
    if (!userConfig) {
      // 如果已登录但没配置，尝试重新初始化
      await checkAndInitConfig(userInfo.token);
      return;
    }

    setIsSaving(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 🟢 [关键逻辑] 根据当前选中的模版 ID，去配置里找对应的 Table ID
      // selectedTemplateId 可能是 'summary' 或 'bilibili'
      // 如果找不到，就用 'default' 或 'summary' 兜底
      const currentTemplate = selectedTemplateId || 'summary';
      const targetTableId = userConfig.tables[currentTemplate || 'summary'] || userConfig.tables['default'];
      console.log(`正在导出... 模板: ${currentTemplate}, 表格ID: ${targetTableId}`);
      if (!targetTableId) throw new Error("未找到该模版对应的飞书数据表，请尝试重置配置。");
      const payload = {
        ...structuredData,
        url: tab.url || '',
        userAccessToken: userInfo.token,
        appToken: userConfig.appToken, // 🟢 直接从自动配置里拿
        tableId: targetTableId
      };
      // 3. 发送给后端
      const res = await fetch('http://localhost:3000/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '保存失败');

      // 4. 成功反馈
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);// 3秒后重置状态，允许再次保存
      // alert("✅ 成功导出到你的飞书表格！");
      alert(`✅ 成功存入【${currentTemplate === 'bilibili' ? '视频剪藏' : '智能摘要'}】表！`);

    } catch (error) {
      console.error('导出失败:', error);
      alert('导出飞书失败，请检查后端日志');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 视图 1: 剪藏界面 (Gemini 悬浮胶囊版) ---
  const renderClipperView = () => (
    <div className="container">
      <div className="section-title">原始内容预览</div>
      <div className="preview-card">
        <textarea 
          className="preview-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="请在网页上划选文字，或等待自动抓取..."
        />
      </div>

      <div className="section-title">选择 AI 模板</div>
      <div className="template-grid">

        

        {/* {templates.length === 0 ? (
          <div style={{color:'#999', fontSize:'12px', padding:'10px'}}>正在加载模板...</div> */}

        {/* 🌟【修改点 4】根据加载状态显示内容 */}
        {isLoadingTemplates ? (
          <div style={{color:'#94a3b8', fontSize:'13px', padding:'20px', textAlign:'center', width:'100%'}}>
            <Sparkles className="spin" size={16} style={{marginBottom:'5px'}}/>
            <br/>正在加载模版配置...
          </div>
        ) : (
          templates.map((tpl) => {
            const Icon = getIconComponent(tpl.iconType); 
            return (
              <div
                key={tpl.id}
                className={`template-card ${selectedTemplateId === tpl.id ? 'active' : ''}`}
                onClick={() => setSelectedTemplateId(tpl.id)}
              >
                <div className="template-icon"><Icon size={18} /></div>
                <span className="template-name">{tpl.name}</span>
                {/* 如果是自定义模版，可以加个小标记 */}
                {tpl.isCustom && <span style={{fontSize:'10px', color:'#ef4444', marginLeft:'auto'}}>New</span>}
              </div>
            );
          })
        )}
      </div>

      {/* 底部：Gemini 风格悬浮胶囊 */}
      <div className="bottom-floating-bar">
        
        {/* 弹出菜单 */}
        {showModelList && (
          <div className="gemini-popup-menu">
            {AI_MODELS.map(model => (
              <div 
                key={model.id} 
                className={`model-item ${selectedModel.id === model.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedModel(model);
                  setShowModelList(false); 
                }}
              >
                <div className="model-info">
                  <model.icon size={16} color={model.color} />
                  <span style={{fontWeight:600}}>{model.name}</span>
                </div>
                {selectedModel.id === model.id ? <Check size={16} color="#2563eb"/> : null}
              </div>
            ))}
          </div>
        )}

        {/* 核心胶囊 */}
        <div className="gemini-capsule">
          
          {/* 左侧：模型选择 (模仿工具栏) */}
          <div 
            className="gemini-model-trigger"
            onClick={() => setShowModelList(!showModelList)}
            title="切换 AI 模型"
          >
            <selectedModel.icon size={18} color={selectedModel.color} />
            <span>{selectedModel.name}</span>
            <ChevronDown size={14} style={{opacity:0.4}} />
          </div>

          {/* 中间：装饰性文本 */}
          <div className="gemini-status-text">
            {status === 'processing' ? 'AI 正在深度思考...' : '已准备就绪'}
          </div>

          {/* 右侧：开始按钮 */}
          <button 
            className="gemini-send-btn"
            onClick={handleStructure}
            disabled={status === 'processing'}
          >
            {status === 'processing' ? (
              <Sparkles className="spin" size={18} />
            ) : (
              <>
                <Sparkles size={16} />
                <span>开始</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // --- 视图 2: 对话列表 ---
  const renderConversationsView = () => (
    <div className="conversations-container">
      <div className="conversations-header">
        <h3>聊天记录</h3>
        <button 
          className="new-conversation-btn"
          onClick={() => handleNewConversation()}
        >
          <PlusCircle size={18} />
        </button>
      </div>
      <div className="conversations-list">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`conversation-item ${currentConversationId === conversation.id ? 'active' : ''}`}
            onClick={() => handleSwitchConversation(conversation.id)}
          >
            <div className="conversation-title">
              {conversation.title || '新对话'}
            </div>
            <div className="conversation-preview">
              {conversation && conversation.messages && conversation.messages.length > 0 ? 
                (conversation.messages[conversation.messages.length - 1].text.substring(0, 50) + '...') : 
                '暂无消息'}
            </div>
            <div className="conversation-time">
              {new Date(conversation.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

 // 🟢 [修改] 结果卡片组件
  const ResultCard = ({ data }: { data: any }) => {
    // 情感判断
    const sKey = (data.sentiment || '').includes('pos') ? 'positive' : 
                 (data.sentiment || '').includes('neg') ? 'negative' : 'neutral';
    const icons: any = { positive: Smile, negative: Frown, neutral: Meh };
    const colors: any = { positive: '#10b981', negative: '#ef4444', neutral: '#64748b' };
    const SIcon = icons[sKey] || Meh;

    return (
      <div className="result-card">
        {/* 1. 头部：标题 + UP主 */}
        <div className="rc-header">
          <div style={{flex: 1}}>
            <div className="rc-title">{data.title}</div>
            {/* 🟢 如果有 UP主，显示出来 */}
            {data.up_name && (
               <div style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'12px', color:'#64748b', marginTop:'4px'}}>
                  <UserIcon size={12}/> <span>{data.up_name}</span>
               </div>
            )}
          </div>
          {/* 情感图标 */}
          <div className="rc-sentiment" style={{ color: colors[sKey], marginLeft:'8px' }}>
            <SIcon size={16} />
          </div>
        </div>

        {/* 🟢 2. 视频数据栏 (核心修复：只要有播放量就显示) */}
        {data.play_count && (
          <div style={{
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr 1fr', 
            gap: '4px', 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0',
            padding: '8px 4px', 
            borderRadius: '8px', 
            marginTop: '12px',
            marginBottom: '4px'
          }}>
             <div className="video-stat-item" title="播放">
               <PlayCircle size={14} color="#3b82f6"/> 
               <span style={{fontSize:'11px', fontWeight:'600', color:'#334155'}}>{data.play_count}</span>
             </div>
             <div className="video-stat-item" title="点赞">
               <ThumbsUp size={14} color="#ef4444"/> 
               <span style={{fontSize:'11px', fontWeight:'600', color:'#334155'}}>{data.like_count}</span>
             </div>
             <div className="video-stat-item" title="投币">
               <Coins size={14} color="#eab308"/> 
               <span style={{fontSize:'11px', fontWeight:'600', color:'#334155'}}>{data.coin_count}</span>
             </div>
             <div className="video-stat-item" title="收藏">
               <Bookmark size={14} color="#10b981"/> 
               <span style={{fontSize:'11px', fontWeight:'600', color:'#334155'}}>{data.collect_count}</span>
             </div>
          </div>
        )}

        {/* 3. 摘要 */}
        <div className="rc-summary" style={{marginTop: '8px'}}>
          <Quote size={14} style={{marginRight:6, opacity:0.5}}/>
          {data.summary}
        </div>

        {/* 4. 标签 */}
        <div className="rc-tags" style={{marginTop: '12px'}}>
          {(data.tags || []).map((t:string, i:number) => (
            <div key={i} className="rc-tag"># {t}</div>
          ))}
        </div>

        {/* 5. 底部按钮 */}
        <div className="rc-footer" style={{marginTop:'12px', paddingTop:'12px', borderTop:'1px dashed #e2e8f0'}}>
            <button 
              className={`nav-button feishu-export-btn ${saveStatus === 'success' ? 'success' : ''}`}
              onClick={handleExportToFeishu}
              disabled={isSaving || saveStatus === 'success'}
              style={{width: '100%', justifyContent: 'center', height: '36px', borderRadius:'8px'}} 
            >
              {isSaving ? <Loader2 size={16} className="spin"/> : saveStatus==='success'?<CheckCircle size={16}/>:<CloudUpload size={16}/>}
              <span style={{marginLeft:6}}>{saveStatus==='success'?'已同步':'存入飞书'}</span>
            </button>
        </div>
      </div>
    );
  };

  // --- 视图 3: 聊天界面 ---
  const renderChatView = () => (
    <div className="container" style={{ background: '#f8fafc' }}>
      <div className="rating-section">
        <div style={{fontSize:'13px', fontWeight:'600', marginBottom:'8px'}}>内容评分</div>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} size={24} className="star-icon" fill={star <= rating ? "#fbbf24" : "none"} color={star <= rating ? "#fbbf24" : "#cbd5e1"} onClick={() => setRating(star)} />
          ))}
        </div>
      </div>

      <div className="section-title" style={{marginTop:'20px'}}>对话与感想</div>
      <div className="chat-container">
        {chatHistory && chatHistory.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            
            {msg.role === 'ai' ? (
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {msg.text}
              </ReactMarkdown>
            ) : (
              msg.text
            )}

            {/* 🟢 [核心修改] 在这里进行判断 */}
            {/* {msg.data ? (
              // 情况 A: 如果是 AI 分析结果，显示卡片
              <ResultCard data={msg.data} />
            ) : (
              // 情况 B: 普通聊天消息，显示气泡
              <div className={`message ${msg.role}`}>
                {msg.text}
              </div>
            )} */}

          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input 
          className="chat-input"
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`给 ${selectedModel.name} 发送消息...`} 
        />
        <button className="btn-primary send-btn" onClick={handleSend} style={{width:'38px', padding:0}}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );

  // ---新增 视图 3: 设置界面 ---
  const renderSettings = () => (
    <div className="container">
      <div className="section-title">设置目标表格</div>
      
      <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
          飞书多维表格链接
        </div>
       
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
          ℹ️ 请打开你的飞书多维表格，直接复制浏览器顶部的完整地址栏链接粘贴到这里。
        </div>
      </div>

      <button
        onClick={() => setShowSettings(false)} // 点击保存并返回
        style={{
          marginTop: '20px',
          width: '100%',
          padding: '10px',
          background: '#3370ff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600'
        }}
      >
        保存并返回
      </button>


      {/* 🟢 [新增] 红色重置按钮 */}
      <button
        onClick={async () => {
          if (confirm("确定要重置吗？这将清除当前的表格绑定。\n下次同步时，系统将为你创建一个全新的飞书表格。")) {
            // 1. 清除 Chrome 本地存储
            await chrome.storage.sync.remove(['clipper_conf']);
            // 2. 清除 React 状态
            setUserConfig(null);
            //setBitableUrl('');
            // 3. 关闭设置页
            setShowSettings(false);
            alert("✅ 重置成功！\n请重新点击【存入飞书】或【个人用户】头像，系统会自动为你创建新表格。");
          }
        }}
        style={{
          marginTop: '12px',
          width: '100%',
          padding: '10px',
          background: 'transparent',
          color: '#ef4444', // 警示红
          border: '1px solid #ef4444',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '13px'
        }}
      >
        重置/重新创建表格
      </button>



    </div>
  );



  // 新建对话
  const handleNewConversation = () => {
    if (!currentUrl) return;
    const newConvo = ChatStorage.createConversation(currentUrl);
    setConversations(ChatStorage.getConversationList(currentUrl));
    setCurrentConversationId(newConvo.id);
    setChatHistory([]);
    setRating(0);
    setShowConversations(false);
    setView('chat'); // 确保显示聊天视图
    setShowSettings(false); // 确保关闭设置页面
  };

  // 切换对话
  const handleSwitchConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    const conversation = ChatStorage.getConversation(currentUrl, conversationId);
    if (conversation) {
      setChatHistory(conversation.messages);
    }
    setShowConversations(false);
    setView('chat'); // 确保显示聊天视图
    setShowSettings(false); // 确保关闭设置页面
  };

  // 右侧导航按钮组件
  const renderRightNavigation = () => (
    <div className="right-navigation">

      {/* 顶部按钮组*/}
      <div className="nav-group-top">

        {/* 剪藏页面按钮 */}
        <button 
          className={`nav-button ${view === 'clipper' && !showConversations && !showSettings ? 'active' : ''}`}
          onClick={() => {
            setView('clipper');
            setShowConversations(false);
            setShowSettings(false);
          }}
          title="剪藏页面"
        >
          <FileText size={20} />
        </button>
        
        {/* AI对话界面按钮 */}
        <button 
          className={`nav-button ${view === 'chat' && !showConversations && !showSettings ? 'active' : ''}`}
          onClick={() => {
            setView('chat');
            setShowConversations(false);
            setShowSettings(false);
          }}
          title="AI对话界面"
        >
          <MessageSquare size={20} />
        </button>
        
        {/* 对话列表按钮 */}
        <button 
          className={`nav-button ${showConversations ? 'active' : ''}`}
          onClick={() => {
            setShowConversations(!showConversations);
            setShowSettings(false);
          }}
          title="聊天记录"
        >
          <History size={20} />
        </button>
      </div>
      
      {/* 底部按钮组 */}
      <div className="nav-group-bottom">
        {/* 导出到飞书按钮 */}
        <button 
          className={`nav-button feishu-export-btn ${saveStatus === 'success' ? 'success' : ''}`}
          onClick={handleExportToFeishu}
          disabled={isSaving || saveStatus === 'success' || !structuredData}
          title="导出到飞书"
        >
          {isSaving ? (
            <Loader2 size={16} className="spin" />
          ) : saveStatus === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <CloudUpload size={16} />
          )}
        </button>

       {/* 设置按钮 */}
        <button 
          className={`nav-button ${showSettings ? 'active' : ''}`} // 🟢 [修改] 如果正在设置页，按钮高亮
          onClick={() => {
            setShowSettings(!showSettings);
            setShowConversations(false);
          }} // 🟢 [修改] 点击后，将状态改为 true，显示设置页
          title="设置"
        >
          <Settings size={20} />
        </button>

        {/* 🟢 [修改] 个人用户按钮 */}
        {userInfo ? (
          // --- 状态 A: 已登录 (显示圆形头像) ---
          <div 
            className="nav-button" 
            title={`当前用户: ${userInfo.name}`} // 鼠标悬停显示名字
            style={{ padding: 0, overflow: 'hidden' }} // 样式微调以适应图片
          >
            <img 
              src={userInfo.avatar} 
              alt={userInfo.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
        ) : (
          // --- 状态 B: 未登录 (显示点击登录按钮) ---
          <button 
            className={`nav-button`}
            title="点击登录飞书账号"  // 提示用户可以点击
            onClick={handleLogin}    // 🟢 绑定刚才写的登录函数
          >
            <User size={20} />
          </button>
        )}

      </div>
    </div>
  );

  // return (
  //   <div className="sidepanel-container">
  //     <div className="main-content">
  //       <div className="header">
  //         <div className="brand">
  //           {view === 'chat' ? <MessageSquare size={20} color="#2563eb"/> : <Bot size={20} color="#2563eb" />}
  //           <span>{view === 'chat' ? 'AI 助手' : 'AI Clipper'}</span>
  //         </div>
  //       </div>

  //       {view === 'clipper' ? renderClipperView() : renderChatView()}
       

  //     </div>

  //     {renderRightNavigation()}
  //   </div>
  // );

  return (
    <div className="sidepanel-container">
      <div className="main-content">
        
        {/* 🟢 [修改] 页面路由逻辑：设置页优先 */}
        {showSettings ? (
          renderSettings()  // --- 场景 A: 显示设置页 ---
        ) : showConversations ? (
          renderConversationsView() // --- 场景 C: 显示对话列表 ---
        ) : (
          // --- 场景 B: 显示正常功能页 (Header + 内容) ---
          <>
            <div className="header">
              <div className="brand">
                {view === 'chat' ? <MessageSquare size={20} color="#2563eb"/> : <Bot size={20} color="#2563eb" />}
                <span>{view === 'chat' ? 'AI 助手' : 'AI Clipper'}</span>
              </div>
              {view === 'chat' && (
                <div className="chat-actions">
                  <button 
                    className="new-conversation-btn"
                    onClick={handleNewConversation}
                    title="新建对话"
                  >
                    <PlusCircle size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* 原有的视图判断逻辑 */}
            {view === 'clipper' ? renderClipperView() : renderChatView()}
          </>
        )}

      </div>

      {/* 右侧导航栏保持不变 */}
      {renderRightNavigation()}
    </div>
  );
}

export default SidePanel;