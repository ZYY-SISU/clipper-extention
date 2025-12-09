import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  FileText, Table, CheckSquare, Sparkles, Bot,
  Send, MessageSquare, ChevronDown, Check, Zap,
  Brain ,Globe, PlusCircle, Menu, X,
  CloudUpload, CheckCircle, Loader2, User, Settings,
  Video, Trash2, Edit2, Sun, Moon, Music, StickyNote
} from 'lucide-react'; 
import type{ requestType, senderType, sendResponseType, templateType, UserConfig, SummaryType, VideoType, TechDocType, McpToolDefinition, ClipContentPayload } from '../types/index';
import { ChatStorage } from '../utils/chatStorage';
import type { ChatMessage, Conversation } from '../utils/chatStorage';
import { TRANSLATIONS } from '../utils/translations';
import './SidePanel.css';

const AI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', icon: Zap, color: '#10a37f', tag: 'strong' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', icon: Brain, color: '#4f46e5', tag: 'deep' },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', icon: Zap, color: '#f59e0b', tag: 'fast' },
  { id: 'claude-3-5', name: 'Claude 3.5', icon: Bot, color: '#7c3aed', tag: 'smart' },
];


function SidePanel() {
  // --- 状态管理 ---
  // ✨ 控制面板显示/隐藏 (默认显示)
  const [isVisible, setIsVisible] = useState(true);

  const [view, setView] = useState<'clipper' | 'chat'>('clipper');
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // 🎨 主题 & 🌐 语言
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState('zh-CN'); // 默认中文

  // 翻译钩子
  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['zh-CN'][key] || key;

  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [content, setContent] = useState('');
  const [structuredData, setStructuredData] = useState<SummaryType | VideoType | TechDocType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  const [singleExportStatus, setSingleExportStatus] = useState<{messageId: number | null, status: 'idle' | 'success', tableUrl?: string}>({messageId: null, status: 'idle'});
  const [userInfo, setUserInfo] = useState<{name: string, avatar: string, token: string,open_id: string;} | null>(null);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [, setIsInitializing] = useState(false);
  
  const [templates, setTemplates] = useState<templateType[]>([]); 
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [status, setStatus] = useState('ready');

  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]); 
  const [showModelList, setShowModelList] = useState(false); 

  const [userNote, setUserNote] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  
  // 用户感想相关状态
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null); // 当前正在编辑感想的消息索引
  const [noteInput, setNoteInput] = useState(''); // 感想输入内容
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set()); // 展开的感想列表
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversationUrl, setCurrentConversationUrl] = useState<string | null>(null);
  const [availableTools, setAvailableTools] = useState<McpToolDefinition[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ currentUrl, currentConversationId, chatHistory });

  // ✨ 1. 本地键盘监听 (当焦点在 SidePanel 内部时生效)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveNote = () => {
    if (editingNoteIndex === null) return;
    
    // 更新聊天历史中的感想
    const updatedChatHistory = [...chatHistory];
    updatedChatHistory[editingNoteIndex] = {
      ...updatedChatHistory[editingNoteIndex],
      notes: noteInput
    };
    
    // 保存到状态和本地存储
    setChatHistory(updatedChatHistory);
    if (currentConversationId && currentUrl) {
      ChatStorage.updateConversationMessages(currentUrl, currentConversationId, updatedChatHistory);
    }
    
    // 同时更新 globalState.structuredData 中的感想数据
    const updatedStructuredData = {
      ...structuredData,
      notes: noteInput
    };
    setStructuredData(updatedStructuredData);
    chrome.runtime.sendMessage({ type: 'UPDATE_STRUCTURED_DATA', payload: updatedStructuredData }).catch(() => {});
    
    // 关闭输入框
    setEditingNoteIndex(null);
    setNoteInput('');
  };

  // --- 核心逻辑 ---
  useEffect(() => {
    const handleMessage = (request: requestType, _: senderType, sendResponse: sendResponseType) => {
      if (request.type === 'TOGGLE_PANEL') {
        // 收到信号，切换状态 (显示 -> 隐藏，隐藏 -> 显示)
        setIsVisible(prev => !prev);
        sendResponse({ status: 'success' });
      }
    };
    
    // 注册监听
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // 清理监听 (防止重复绑定)
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);
  useEffect(() => {
    stateRef.current = { currentUrl, currentConversationId, chatHistory };
  }, [currentUrl, currentConversationId, chatHistory]);

  // --- 主题生效 ---
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // ✨ [AI 识图] 监听识图结果通知
  useEffect(() => {
    const handleVisionResult = (request: requestType, _: senderType, sendResponse: sendResponseType) => {
      if (request.type === 'VISION_RESULT_READY') {
        // 更新内容显示
        const payload = request.payload;
        if (payload?.text || payload?.html) {
          setContent(payload.text || payload.html || '');
        }
        if (payload && 'structuredData' in payload) {
          const data = (payload as any).structuredData;
          setStructuredData(data ?? null);
        }
        sendResponse({ status: 'success' });
        return true;
      }
      return false;
    };

    chrome.runtime.onMessage.addListener(handleVisionResult);
    return () => chrome.runtime.onMessage.removeListener(handleVisionResult);
  }, []);

  useEffect(() => {
    const handleClipContentUpdate = (request: requestType) => {
      if (request.type === 'CLIP_CONTENT_UPDATED') {
        const payload = request.payload as ClipContentPayload;
        if (payload) {
          const nextContent = payload.text || payload.html || '';
          if (nextContent) {
            setContent(nextContent);
            setStructuredData(null);
            setView('clipper');
          }
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleClipContentUpdate);
    return () => chrome.runtime.onMessage.removeListener(handleClipContentUpdate);
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_LAST_CLIP' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('获取最近一次剪藏失败:', chrome.runtime.lastError.message);
        return;
      }

      if (response?.status === 'success' && response.data) {
        const payload = response.data as ClipContentPayload;
        const nextContent = payload.text || payload.html || '';
        if (nextContent) {
          setContent(nextContent);
          setStructuredData(null);
          setView('clipper');
        }
      }
    });
  }, []);

  useEffect(() => {
    const handleTabChange = async () => {
      try {
        const { currentUrl: oldUrl, currentConversationId: oldId, chatHistory: oldHistory } = stateRef.current;
        if (oldUrl && oldId) {
          ChatStorage.updateConversationMessages(oldUrl, oldId, oldHistory);
        }
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          const newUrl = tab.url || '';
          setCurrentUrl(newUrl);
          const newConversations = ChatStorage.getConversationList(newUrl);
          setConversations(newConversations);
          
          if (newConversations.length > 0) {
            setCurrentConversationId(newConversations[0].id);
            setChatHistory(newConversations[0].messages);
          } else {
            const newConvo = ChatStorage.createConversation(newUrl);
            setConversations([newConvo]);
            setCurrentConversationId(newConvo.id);
            setChatHistory([]);
          }
          
          if (tab.id) {
              const pageData = await chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_CONTENT' }).catch(() => null);
              if (pageData) setContent(pageData.text || pageData.html || '');
          }
        }
      } catch (error: unknown) { console.error('Tab update error:', error); }
    };

    chrome.tabs.onActivated.addListener(handleTabChange);
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'complete') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id === tabId) handleTabChange();
        });
      }
    });

    handleTabChange();
    return () => chrome.tabs.onActivated.removeListener(handleTabChange);
  }, []);

  useEffect(() => {
    if (currentConversationId && chatHistory.length > 0) {
      // 使用当前对话所属的URL来保存聊天记录，如果没有则使用当前网页的URL
      const saveUrl = currentConversationUrl || currentUrl;
      if (saveUrl) {
        ChatStorage.updateConversationMessages(saveUrl, currentConversationId, chatHistory);
        // 更新当前网页的对话列表
        setConversations(ChatStorage.getConversationList(currentUrl));
      }
    }
  }, [chatHistory, currentUrl, currentConversationId, currentConversationUrl]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 3000);
        const res = await fetch('http://localhost:3000/api/templates', { signal: controller.signal });
        const json = await res.json();
        if (json.code === 200 && Array.isArray(json.data)) setTemplates(json.data);
        else throw new Error();
      } catch (e: unknown) {
        setTemplates([
          { id: 'summary', name: '智能摘要', iconType: 'text' },
          { id: 'table', name: '表格提取', iconType: 'table' },
          { id: 'checklist', name: '清单整理', iconType: 'check' },
          { id: 'video-summary', name: '视频摘要', iconType: 'Video' },
          { id: 'tech-doc', name: '技术文档', iconType: 'globe' },
        ]);
        console.error('Failed to fetch templates:', e);
      } finally { setIsLoadingTemplates(false); }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    setIsLoadingTools(true);

    fetch('http://localhost:3000/api/tools', { signal: controller.signal })
      .then(res => res.json())
      .then(json => {
        if (!isMounted) return;
        if (json.code === 200 && Array.isArray(json.data)) {
          setAvailableTools(json.data);
          setToolError(null);
        } else {
          setToolError('无法加载工具');
        }
      })
      .catch(error => {
        if (!isMounted) return;
        console.error('Failed to fetch MCP tools:', error);
        setToolError('无法加载工具');
      })
      .finally(() => {
        if (isMounted) setIsLoadingTools(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setSelectedToolIds((prev) => prev.filter((id) => availableTools.some((tool) => tool.id === id)));
  }, [availableTools]);

  const getIconComponent = (type:templateType['iconType']) => {
    switch(type) {
      case 'text': return FileText;
      case 'table': return Table;
      case 'check': return CheckSquare;
      case 'globe': return Globe;
      case 'Video': return Video;
      case 'music': return Music;
      default: return FileText;
    }
  };

  useEffect(() => {
    if (view === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, view]);

  // --- 动作逻辑 ---
  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (confirm(t('confirmDelete'))) {
      // 查找对话所属的URL
      const conversationUrl = ChatStorage.findConversationUrl(id);
      if (conversationUrl) {
        ChatStorage.deleteConversation(conversationUrl, id);
      }
      
      // 更新当前页面的对话列表
      const updatedList = ChatStorage.getConversationList(currentUrl);
      setConversations(updatedList);
      
      // 如果删除的是当前对话，需要切换到其他对话或创建新对话
      if (currentConversationId === id) {
        if (updatedList.length > 0) {
          setCurrentConversationId(updatedList[0].id);
          setChatHistory(updatedList[0].messages);
        } else handleNewConversation();
      }
    }
  };

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingConvId(id);
    setEditingTitle(currentTitle);
  };

  const handleSubmitRename = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!editingConvId || !editingTitle.trim()) return;
    
    // 查找对话所属的URL
    const conversationUrl = ChatStorage.findConversationUrl(editingConvId);
    if (conversationUrl) {
      // 获取当前对话信息
      const conv = ChatStorage.getConversation(conversationUrl, editingConvId);
      if (conv) {
        const updated = { ...conv, title: editingTitle.trim() };
        ChatStorage.updateConversation(conversationUrl, updated);
        
        // 更新当前页面的对话列表
        setConversations(ChatStorage.getConversationList(currentUrl));
      }
    }
    
    setEditingConvId(null);
  };

  const toggleToolSelection = (toolId: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  ///////////////////////////////////////【美化音乐卡片】（zyy）//////////////////////////////////
  const MusicCard = (data: any) => {
    const coverUrl = (data.cover && data.cover !== 'N/A') ? data.cover : 'https://via.placeholder.com/150?text=No+Cover';
    
    // ⚠️ 注意：下面的 HTML 字符串必须【顶格写】，不要有缩进！
    // 否则 Markdown 会把它们识别为“代码块”而直接显示源码。
    let musicHtml = `
<div class="music-card-container">
<div class="music-header">
  <img src="${coverUrl}" class="music-cover" onerror="this.src='https://via.placeholder.com/80'" />
  <div class="music-info">
    <h3 class="music-title">${data.title || '未命名歌单'}</h3>
    <div class="music-desc">${data.summary || '暂无简介'}</div>
  </div>
</div>
<div class="music-list">`;

    // 遍历歌曲生成列表项
    if (data.tracks && Array.isArray(data.tracks)) {
      data.tracks.forEach((t: any, i: number) => {
        const href = (t.url && t.url !== 'N/A') ? `href="${t.url}" target="_blank"` : '';
        const cursorStyle = href ? 'cursor: pointer;' : 'cursor: default;';
        
        // 这里的缩进没关系，因为在 HTML 标签内部
        musicHtml += `
<a ${href} class="track-item" style="${cursorStyle}">
  <span class="track-index">${i + 1}</span>
  <div class="track-main">
    <span class="track-name">${t.name}</span>
    <span class="track-artist">${t.artist} ${t.album && t.album !== 'N/A' ? `· ${t.album}` : ''}</span>
  </div>
  <div class="track-meta">
    ${t.duration && t.duration !== 'N/A' ? t.duration : ''}
  </div>
</a>`;
      });
    }

    musicHtml += `</div>`; // 闭合 music-list

    // 标签区
    if (data.tags && data.tags.length > 0) {
      musicHtml += `<div class="music-tags">`;
      data.tags.forEach((tag: string) => {
        musicHtml += `<span class="music-tag">#${tag}</span>`;
      });
      musicHtml += `</div>`;
    }

    musicHtml += `</div>`; // 闭合 container

    // 补充模型信息
    musicHtml += `\n<div class="meta-info" style="margin-top:8px; text-align:right; opacity:0.6; font-size:11px;">Generated by ${selectedModel.name}</div>`;
    
    return musicHtml;
  }
  //////////////////////////////////////////////////////////////////////////////////////////////

  //提交内容给后端返回结构化文本
  const handleStructure = async () => {
    if (!content) return alert(t('alertNoContent'));
    if (!selectedTemplateId) return alert(t('alertNoTemplate'));
    
    setStatus('processing'); setSaveStatus('idle'); 
    try {
      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, template: selectedTemplateId, model: selectedModel.id })
      });
      const data = await response.json();
      console.log("返回的结构化数据：",data)
      if (!response.ok) throw new Error(data.error);
      

      setStructuredData(data); 
      

      // // [核心修改] 给数据打上“模板烙印”
      // // 这样数据自己就知道它是属于哪个模板的 (summary 还是 viedo-summary)
      // const dataWithTemplate = {
      //   ...data, 
      //   _templateId: selectedTemplateId // 记录当前的模板 ID
      // };

      // setStructuredData(dataWithTemplate); // 存入带模板 ID 的数据
      

      chrome.runtime.sendMessage({ type: 'UPDATE_STRUCTURED_DATA', payload: data }).catch(() => {});
   
      setStatus('ready');
      setView('chat'); 
    
      if(data.templateId === 'summary') {
        // 渲染SummaryCard
        const storageData = SummaryCard(data)
        setChatHistory(prev => [...prev, { role: 'ai', text: storageData, templateId: selectedTemplateId, structuredData: data }]);

      }else if(data.templateId === 'video-summary') {
        // 渲染VideoCard
        const storageData = VideoCard(data)
        setChatHistory(prev => [...prev, { role: 'ai', text: storageData, templateId: selectedTemplateId, structuredData: data }]);
      }else if (data.templateId === 'music-collection') {
        // 音乐合辑的渲染逻辑（zyy）
        const  musicHtml = MusicCard(data);
        setChatHistory(prev => [...prev, { role: 'ai', text: musicHtml, templateId: selectedTemplateId, structuredData: data }]);
      }else if(selectedTemplateId === 'tech-doc') {
        // 渲染TechDocCard
        const storageData = TechDocCard(data)
        setChatHistory(prev => [...prev, { role: 'ai', text: storageData, templateId: selectedTemplateId, structuredData: data }]);
      }

    } catch (error: unknown) {
      setStatus('ready');
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`${t('alertReqFailed')}: ${errorMessage}`);
    }
  };

  const handleSend = async () => {
    if (!userNote.trim()) return;
    const currentMsg = userNote;
    setUserNote('');
    setChatHistory(prev => [...prev, { role: 'user', text: currentMsg }]);
    
    setChatHistory(prev => [...prev, { role: 'ai', text: t('thinking'), isLoading: true }]);

    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMsg,
          model: selectedModel.id,
          context: structuredData || content,
          tools: selectedToolIds,
        })
      });
      const data = await res.json();
      setChatHistory(prev => prev.filter(m => !m.isLoading).concat({ 
        role: 'ai', 
        text: data.reply || t('noResponse'), 
        templateId: structuredData?.templateId,
        structuredData: structuredData // 存储完整的结构化信息
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setChatHistory(prev => prev.filter(m => !m.isLoading).concat({ role: 'ai', text: `${t('error')}: ${errorMessage}` }));
    }
  };

//登录
  const handleLogin = () => {
    const CLIENT_ID = "cli_a9a8533b64789cd6"; 
    const REDIRECT_URI = chrome.identity.getRedirectURL(); 
    const authUrl = `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=RANDOM_STATE`;
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) return alert(t('alertLoginCancel'));
      const code = new URL(redirectUrl).searchParams.get("code");
      if (code) {
        try {
          const res = await fetch('http://localhost:3000/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
          const json = await res.json();
          if(json.code === 200) {

            // setUserInfo({ name: json.data.user.name, avatar: json.data.user.avatar_url, token: json.data.token });
            // checkAndInitConfig(json.data.token);
            const feishuUser = json.data.user;

            const userData = {
              name: feishuUser.name,
              avatar: feishuUser.avatar_url,
              token: json.data.token,
              open_id: feishuUser.open_id //  必须拿到这个 ID
            }; // 构造前端用的 User 对象
           
            setUserInfo(userData);
           
            // 🟢 传入完整的 userData 进行检查
            checkAndInitConfig(userData);
          } else alert(`${t('alertLoginFail')}: ${json.error}`);
        } catch (e: unknown) {
          console.error('Connection error:', e);
          alert(t('alertConnectFail'));
        }
      }
    });
  };
//   传入完整的 userInfo 对象，而不仅仅是 token
  const checkAndInitConfig = async (user: { name: string; avatar: string; token: string; open_id: string }) => {
    setIsInitializing(true);
    try {
      const storage = await chrome.storage.sync.get(['clipper_conf']);//检查本地存储
      const localConfig = storage.clipper_conf as UserConfig | undefined;

      //  账号冲突检查
      // 如果本地有配置，但配置的主人(userId)不是当前登录的人(open_id)
      if (localConfig && localConfig.userId !== user.open_id) {
        console.warn("⚠️ 检测到账号切换，旧配置失效，准备重新初始化...");
         alert(`⚠️ 检测到账号切换，旧配置失效，准备重新初始化..."`);
      } 
      // 如果配置存在且属于当前用户，直接使用
      else if (localConfig) {
        console.log("✅ 读取到当前用户的配置:", localConfig);
        setUserConfig(localConfig);
        setIsInitializing(false);
        return;
      }

      // 2. 需要初始化 (没配置，或者账号变了)
      console.log("正在为新用户初始化知识库...");
      const res = await fetch('http://localhost:3000/api/init-feishu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAccessToken: user.token })
      });
      
      const json = await res.json();
      if (json.code === 200) {
        //  3. 组装带有身份信息的配置
        const newConfig: UserConfig = {
          userId: user.open_id, // 绑定 ID
          name: user.name,      // 绑定名字
          // avatar: user.avatar,  // 绑定头像
          appToken: json.data.appToken,
          tables: json.data.tables
        };

        // 存入云端
        await chrome.storage.sync.set({ 'clipper_conf': newConfig });
        setUserConfig(newConfig);
        alert(`🎉 已为【${user.name}】自动关联飞书知识库！`);
      } else {
        throw new Error(json.error);
      }

    } catch (e: unknown) {
      console.error(e);
      alert(`初始化失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsInitializing(false);
    }
  };


  //导出到飞书
  const handleExportToFeishu = async () => {
    if (!structuredData) return;
    if (!userInfo || !userInfo.token) return alert(t('notConnected'));

    if (userConfig && userConfig.userId !== userInfo.open_id) {
      alert(`配置冲突！\n当前配置属于：${userConfig.name}\n当前登录用户：${userInfo.name}\n\n系统将自动重新初始化...`);
      await checkAndInitConfig(userInfo); // 强制重新初始化
      return;
    }

    if (!userConfig) {
       await checkAndInitConfig(userInfo);
       return;
    }

    setIsSaving(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });//获取当前tab
      

      // // 🟢 [核心修改] 旧版逻辑，已废弃

      // const currentTemplate = selectedTemplateId || 'summary';
      // const tableId = userConfig.tables[currentTemplate] || userConfig.tables['default'];
      // const tableId = userConfig.tables[currentTemplate] ;
      // console.log("导出到飞书，tableId:",tableId)

      // if (!tableId) {
      //   alert(t('没有找到对应的飞书表格ID，请前往设置页面初始化'));
      //   setIsSaving(false);
      //   return;
      // }

           // 🟢 [核心修改] 优先使用数据自带的模板 ID
      // 逻辑顺序：数据里的烙印 > 当前UI选中的 > 默认summary
      const templateIdToUse = structuredData.templateId || selectedTemplateId || 'summary';

      // 根据 ID 去配置里查表
      const tableId = userConfig.tables[templateIdToUse] || userConfig.tables['default'];

      console.log(`🚀 导出调试: 模板[${templateIdToUse}] -> 表格[${tableId}]`);

      const response = await fetch('http://localhost:3000/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...structuredData, url: tab.url || '', userAccessToken: userInfo.token, appToken: userConfig.appToken, tableId  })
      });
      const result = await response.json();
      
      if (result.tableUrl) {
        console.log('飞书表格链接:', result.tableUrl);
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: unknown) {
        console.error('Export error:', error);
        alert(t('alertExportFail'));
      } 
    finally { setIsSaving(false); }
  };

  // 导出单条AI消息到飞书
  const handleExportSingleMessage = async (message: ChatMessage, messageIndex: number) => {
    if (!message.templateId) return alert('此消息没有关联的模板信息');
    if (!userInfo || !userInfo.token) return alert(t('notConnected'));

    if (userConfig && userConfig.userId !== userInfo.open_id) {
      alert(`配置冲突！\n当前配置属于：${userConfig.name}\n当前登录用户：${userInfo.name}\n\n系统将自动重新初始化...`);
      await checkAndInitConfig(userInfo); // 强制重新初始化
      return;
    }

    if (!userConfig) {
       await checkAndInitConfig(userInfo);
       return;
    }

    setIsSaving(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 使用消息中存储的模板ID
      const templateIdToUse = message.templateId;

      // 根据 ID 去配置里查表
      const tableId = userConfig.tables[templateIdToUse] || userConfig.tables['default'];

      console.log(`🚀 单条消息导出调试: 模板[${templateIdToUse}] -> 表格[${tableId}]`);

      // 直接使用消息中存储的完整结构化信息
      const exportData = {
        ...message.structuredData,
        templateId: templateIdToUse,
        url: tab.url || '',
        notes: message.notes,
      };

      const response = await fetch('http://localhost:3000/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...exportData, userAccessToken: userInfo.token, appToken: userConfig.appToken, tableId  })
      });
      const result = await response.json();
      
      // 设置单条消息导出成功状态
      setSingleExportStatus({messageId: messageIndex, status: 'success', tableUrl: result.tableUrl});
      
      // 3秒后重置状态
      setTimeout(() => {
        setSingleExportStatus({messageId: null, status: 'idle'});
      }, 3000);
    } catch (error: unknown) {
        console.error('Single message export error:', error);
        alert(t('alertExportFail'));
      } 
    finally { setIsSaving(false); }
  };

  const handleNewConversation = () => {
    if (!currentUrl) return;
    const newConvo = ChatStorage.createConversation(currentUrl);
    setConversations(ChatStorage.getConversationList(currentUrl));
    setCurrentConversationId(newConvo.id);
    // 新对话属于当前网页的URL
    setCurrentConversationUrl(currentUrl);
    setChatHistory([]);
    setView('chat');
    setShowHistory(false);
  };

  const handleSwitchConversation = (id: string) => {
    setCurrentConversationId(id);
    // 从所有对话中查找
    const allConversations = ChatStorage.getAllConversations();
    const c = allConversations.find(conv => conv.id === id);
    if (c) {
      setChatHistory(c.messages);
      // 查找对话所属的URL并保存
      const conversationUrl = ChatStorage.findConversationUrl(id);
      setCurrentConversationUrl(conversationUrl);
    }
    setView('chat');
    setShowHistory(false);
  };

  const getTemplateName = (tpl: templateType) => {
    const key = `template_${tpl.id.replace(/-/g, '_')}`;
    const translated = t(key);
    if (translated === key) return tpl.name;
    return translated;
  };

  // --- 视图渲染 ---

  const renderHistoryDrawer = () => (
    <>
      <div className={`drawer-overlay ${showHistory ? 'open' : ''}`} onClick={() => setShowHistory(false)} />
      <div className={`history-drawer ${showHistory ? 'open' : ''}`}>
        <div className="drawer-header">
          <div style={{display:'flex', alignItems:'center'}}>
             <Menu size={20} color={theme === 'dark' ? '#c4c7c5' : '#5f6368'} style={{marginRight:12}}/>
             <span className="drawer-title">{t('history')}</span>
          </div>
          <button className="icon-btn" onClick={() => setShowHistory(false)}><X size={20}/></button>
        </div>

        <button className="new-chat-btn-drawer" onClick={handleNewConversation}>
          <PlusCircle size={18}/> <span>{t('newChat')}</span>
        </button>

        <div className="history-list">
          {ChatStorage.getAllConversations().map(c => (
            <div key={c.id} className={`history-item ${currentConversationId === c.id ? 'active' : ''}`} onClick={() => handleSwitchConversation(c.id)}>
              {editingConvId === c.id ? (
                <div style={{display:'flex', alignItems:'center', flex:1, width:'100%'}} onClick={e=>e.stopPropagation()}>
                  <input autoFocus className="rename-input" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmitRename(e)} />
                  <button className="action-icon-btn" onClick={handleSubmitRename}><Check size={16}/></button>
                </div>
              ) : (
                <>
                  <div className="history-title-container">
                    <span className="history-title-text" title={c.title}>{c.title || t('defaultChatTitle')}</span>
                  </div>
                  <div className="history-actions">
                     <button 
                       className="action-icon-btn" 
                       onClick={(e)=>{
                         e.stopPropagation();
                         // 确保URL是完整的
                         const fullUrl = c.url.startsWith('http://') || c.url.startsWith('https://') ? c.url : `https://${c.url}`;
                         window.open(fullUrl, '_blank'); // 打开新窗口跳转到对应网站
                       }}
                       title={t('openWebsite') || 'Open Website'}
                     >
                       <Globe size={14}/>
                     </button>
                     <button className="action-icon-btn" onClick={(e)=>handleStartRename(e, c.id, c.title)} title={t('rename')}><Edit2 size={14}/></button>
                     <button className="action-icon-btn delete" onClick={(e)=>handleDeleteConversation(e, c.id)} title={t('delete')}><Trash2 size={14}/></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderSettingsModal = () => (
    <div className="settings-modal">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h3 style={{margin:0, fontSize:18, color: 'var(--text-primary)'}}>{t('settings')}</h3>
        <button className="icon-btn" onClick={() => setShowSettings(false)}><X size={24}/></button>
      </div>
      
      {/* 飞书状态 */}
      <div style={{background:'var(--gemini-surface)', padding:20, borderRadius:16}}>
        <div style={{fontSize:14, fontWeight:600, marginBottom:8, color: 'var(--text-primary)'}}>{t('feishuStatus')}</div>
        {userConfig ? (
          <div style={{color:'#10a37f', display:'flex', alignItems:'center', gap:8, fontSize:14}}>
            <CheckCircle size={18}/> {t('connected')}
          </div>
        ) : (
          <div style={{color:'var(--text-secondary)', fontSize:14}}>{t('notConnected')}</div>
        )}
      </div>

      {/* 主题设置 */}
      <div style={{background:'var(--gemini-surface)', padding:20, borderRadius:16}}>
         <div style={{fontSize:14, fontWeight:600, marginBottom:12, color: 'var(--text-primary)'}}>{t('appearance')}</div>
         <div style={{display:'flex', gap:10}}>
           <button onClick={() => setTheme('light')} style={{ flex:1, padding: '10px', borderRadius:10, border: theme === 'light' ? '2px solid var(--gemini-blue)' : '1px solid var(--border-color)', background: theme === 'light' ? 'var(--gemini-blue-soft)' : 'transparent', color: theme === 'light' ? 'var(--gemini-blue)' : 'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', fontWeight:600 }}>
             <Sun size={18}/> {t('light')}
           </button>
           <button onClick={() => setTheme('dark')} style={{ flex:1, padding: '10px', borderRadius:10, border: theme === 'dark' ? '2px solid var(--gemini-blue)' : '1px solid var(--border-color)', background: theme === 'dark' ? 'var(--gemini-blue-soft)' : 'transparent', color: theme === 'dark' ? 'var(--gemini-blue)' : 'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', fontWeight:600 }}>
             <Moon size={18}/> {t('dark')}
           </button>
         </div>
      </div>

      {/* 语言设置 (中/英) */}
      <div style={{background:'var(--gemini-surface)', padding:20, borderRadius:16}}>
         <div style={{fontSize:14, fontWeight:600, marginBottom:12, color: 'var(--text-primary)'}}>{t('language')}</div>
         <div style={{display:'flex', gap:10}}>
           <button 
             onClick={() => setLang('zh-CN')}
             style={{
               flex: 1, padding: '10px', borderRadius:10, 
               border: lang === 'zh-CN' ? '2px solid var(--gemini-blue)' : '1px solid var(--border-color)',
               background: lang === 'zh-CN' ? 'var(--gemini-blue-soft)' : 'transparent',
               color: lang === 'zh-CN' ? 'var(--gemini-blue)' : 'var(--text-secondary)',
               cursor:'pointer', fontWeight:600, fontSize:'13px'
             }}
           >
             简体中文
           </button>
           <button 
             onClick={() => setLang('en')}
             style={{
               flex: 1, padding: '10px', borderRadius:10, 
               border: lang === 'en' ? '2px solid var(--gemini-blue)' : '1px solid var(--border-color)',
               background: lang === 'en' ? 'var(--gemini-blue-soft)' : 'transparent',
               color: lang === 'en' ? 'var(--gemini-blue)' : 'var(--text-secondary)',
               cursor:'pointer', fontWeight:600, fontSize:'13px'
             }}
           >
             English
           </button>
         </div>
      </div>

      <button onClick={async () => {
        if(confirm(t('resetConfirm'))) {
          await chrome.storage.sync.remove(['clipper_conf']);
          setUserConfig(null);
          alert(t('resetSuccess'));
        }
      }} style={{ marginTop:'auto', padding:14, border:'1px solid var(--danger-color)', color:'var(--danger-color)', background:'transparent', borderRadius:12, cursor:'pointer', fontWeight:600, fontSize:14 }}>
        {t('resetConfig')}
      </button>
    </div>
  );

  const renderClipperView = () => (
    <div className="clipper-container">
      <div className="section-title">{t('previewTitle')}</div>
      <div className="preview-card">
        <textarea className="preview-textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('previewPlaceholder')} />
      </div>

      <div className="section-title">{t('selectTemplate')}</div>
      <div className="template-grid">
        {isLoadingTemplates ? (
           <div style={{gridColumn:'span 2', textAlign:'center', padding:20, color:'var(--text-secondary)'}}><Loader2 className="spin" size={18}/></div>
        ) : (
           templates.map(tpl => {
             const Icon = getIconComponent(tpl.iconType);
             // 为音乐合辑模板添加悬停提示
             const tooltip = tpl.id === 'music-collection' ? '支持qq音乐、网易云音乐' : '';
             return (
               <div 
                 key={tpl.id} 
                 className={`template-card ${selectedTemplateId===tpl.id ? 'active' : ''}`} 
                 onClick={() => setSelectedTemplateId(tpl.id)}
                 title={tooltip}
               >
                 <Icon size={20} /> 
                 <span>{getTemplateName(tpl)}</span>
               </div>
             );
           })
        )}
      </div>

      <div className="floating-capsule-container">
        <div className="gemini-capsule">
           {showModelList && (
             <div style={{position:'absolute', bottom:'110%', left:0, background:'var(--card-bg)', borderRadius:16, border:'1px solid var(--border-color)', padding:6, boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}>
               {AI_MODELS.map(m => (
                 <div key={m.id} onClick={()=>{setSelectedModel(m); setShowModelList(false)}} style={{padding:'10px', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:8, borderRadius:8, transition:'0.2s', color:'var(--text-primary)'}}>
                    <m.icon size={16} color={m.color}/> {m.name}
                 </div>
               ))}
             </div>
           )}
           <div className="model-trigger" onClick={() => setShowModelList(!showModelList)}>
             <selectedModel.icon size={16} color={selectedModel.color}/> {selectedModel.name} <ChevronDown size={14}/>
           </div>
           <button className="run-btn" onClick={handleStructure} disabled={status === 'processing'}>
             {status === 'processing' ? <Loader2 className="spin" size={16}/> : <Sparkles size={16}/>}
             <span>{t('startAnalyze')}</span>
           </button>
        </div>
      </div>
    </div>
  );

  const renderChatView = () => (
    <div className="chat-view">
      {chatHistory.length === 0 && (
        <div style={{textAlign:'center', marginTop:100, color:'var(--text-secondary)', userSelect:'none'}}>
           <Bot size={64} strokeWidth={1} style={{opacity:0.2, marginBottom:20}}/>
           <p style={{fontSize:16, fontWeight:500, opacity:0.6}}>{t('chatPlaceholderText')}</p>
        </div>
      )}
      {chatHistory.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          {msg.role === 'ai' ? (
            <div className="ai-message-container">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>{msg.text}</ReactMarkdown>
              <div style={{display: 'flex', gap: 8, marginTop: 8}}>
                <button className="export-single-btn" title={t('saveToFeishu')} onClick={() => handleExportSingleMessage(msg, i)}>
                  <CloudUpload size={16} />
                  <span>{t('export')}</span>
                </button>
                <button className="export-single-btn" title="添加感想" onClick={() => {
                  setEditingNoteIndex(i);
                  setNoteInput(msg.notes || '');
                }}>
                  <StickyNote size={16} />
                  <span>感想</span>
                </button>
              </div>
              {/* 感想显示区域 */}
              {msg.notes && (
                <div style={{marginTop: 12, padding: 12, background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)'}}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)'}}>
                      <StickyNote size={14} />
                      <span>我的感想</span>
                    </div>
                    {msg.notes.length > 100 && (
                      <button onClick={() => setExpandedNotes(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(i)) {
                          newSet.delete(i);
                        } else {
                          newSet.add(i);
                        }
                        return newSet;
                      })} style={{padding: '2px 8px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11}}>
                        {expandedNotes.has(i) ? '收起' : '展开'}
                      </button>
                    )}
                  </div>
                  <div style={{fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5}}>
                    {msg.notes.length > 100 && !expandedNotes.has(i) ? msg.notes.substring(0, 100) + '...' : msg.notes}
                  </div>
                </div>
              )}
              
              {/* 感想输入框 */}
              {editingNoteIndex === i && (
                <div style={{marginTop: 12, padding: 12, background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)'}}>
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="写下你的感想..."
                    style={{width: '100%', minHeight: 80, padding: 10, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', resize: 'vertical', fontSize: 13}}
                  />
                  <div style={{display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end'}}>
                    <button onClick={() => setEditingNoteIndex(null)} style={{padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13}}>取消</button>
                    <button onClick={handleSaveNote} style={{padding: '6px 12px', borderRadius: 6, border: '1px solid var(--gemini-blue)', background: 'var(--gemini-blue)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600}}>保存</button>
                  </div>
                </div>
              )}
            </div>
          ) : msg.text}
        </div>
      ))}
      
      {/* 导出成功弹窗 */}
      {singleExportStatus.status === 'success' && singleExportStatus.tableUrl && (
        <div className="export-success-popup">
          <div className="popup-content">
            <CheckCircle size={48} className="success-icon" />
            <h3>{t('exportSuccess')}</h3>
            <p>{t('exportSuccessDesc')}</p>
            {singleExportStatus.tableUrl && (
              <a 
                href={singleExportStatus.tableUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="table-link"
              >
                {t('viewTable')}
              </a>
            )}
          </div>
        </div>
      )}
      <div ref={chatEndRef} style={{height:'1px'}}/>

      <div className="input-floating-area">
        <div className="chat-input-stack">
          <div className="mcp-tool-toggle">
            <button
              type="button"
              className="mcp-tool-button"
              onClick={() => setShowToolPicker((prev) => !prev)}
            >
              <Sparkles size={16} />
              <span>MCP 工具</span>
              {selectedToolIds.length > 0 && <span className="mcp-tool-badge">{selectedToolIds.length}</span>}
              {isLoadingTools && <Loader2 className="spin" size={14} />}
              <ChevronDown size={16} className={showToolPicker ? 'open' : ''} />
            </button>
            {showToolPicker && (
              <div className="mcp-tool-panel">
                {isLoadingTools ? (
                  <div className="mcp-tool-panel-empty">加载中...</div>
                ) : availableTools.length === 0 ? (
                  <div className="mcp-tool-panel-empty">暂无可用工具</div>
                ) : (
                  availableTools.map((tool) => (
                    <label
                      key={tool.id}
                      className={`mcp-tool-item ${selectedToolIds.includes(tool.id) ? 'active' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedToolIds.includes(tool.id)}
                        onChange={() => toggleToolSelection(tool.id)}
                      />
                      <div className="mcp-tool-item-body">
                        <div className="mcp-tool-item-title">{tool.name}</div>
                        <div className="mcp-tool-item-desc">{tool.description}</div>
                      </div>
                    </label>
                  ))
                )}
                {toolError && <div className="mcp-tool-panel-error">{toolError}</div>}
              </div>
            )}
          </div>
          <div className="chat-input-wrapper">
            <input
              className="chat-input"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('inputPlaceholder')}
              autoFocus
            />
            <button className="send-btn-round" onClick={handleSend}><Send size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );

  const SummaryCard = (data: SummaryType) => {
    const { 
      title = '', 
      summary = '', 
      tags = [], 
      sentiment = '' 
    } = data;
    
    let displayText = `### ${title || t('analysisResult')}\n\n ` + `> ${summary || t('noSummary')}\n\n`
    if(sentiment) displayText += `**${t('sentiment')}**: ${sentiment}\n\n`
    if(tags.length > 0) displayText += `**${t('tags')}**: ${tags.join(', ')}\n\n`
    displayText += `\n---\n<div class="meta-info">${t('model')}: ${selectedModel.name}</div>`
    return displayText
  }

  const VideoCard = (data: VideoType) => { 
    const { 
      title = '', 
      summary = '', 
      tags = [], 
      sentiment = '', 
      up_name = '', 
      play_count = '', 
      like_count = '', 
      coin_count = '', 
      collect_count = '' 
    } = data;
    
    let displayText = `### ${title || t('analysisResult')}\n\n`
        displayText += `> ${summary || t('noSummary')}\n\n`
       if(sentiment) displayText += `**${t('sentiment')}**: ${sentiment}\n\n`
       if(up_name) displayText += `**${t('up_name')}**: ${up_name}\n\n`
       if(play_count) displayText += `**${t('play_count')}**: ${play_count}\n\n`
       if(like_count) displayText += `**${t('like_count')}**: ${like_count}\n\n`
       if(collect_count) displayText += `**${t('collect_count')}**: ${collect_count}\n\n`
       if(coin_count) displayText += `**${t('coin_count')}**: ${coin_count}\n\n`
       if(tags.length > 0) displayText += `**${t('tags')}**: ${tags.join(', ')}\n\n`
    displayText += `\n---\n<div class="meta-info">${t('model')}: ${selectedModel.name}</div>`

    return displayText
  }

  const TechDocCard = (data: TechDocType) => {
    const { 
      title = '',
      description = '',
      category = '',
      mainSections = [],
      parameters = [],
      returns = '',
      examples = [],
      keyPoints = [],
      relatedLinks = [],
      tags = []
    } = data;
    
    let displayText = `### ${title || t('analysisResult')}\n\n`
    if(description) displayText += `> ${description || t('noDescription')}\n\n`
    if(category) displayText += `**${t('category')}**: ${category}\n\n`
    if(mainSections.length > 0) displayText += `**${t('mainSections')}**: ${mainSections.join('\n')}\n\n`
    if(parameters.length > 0) displayText += `**${t('parameters')}**: ${parameters.map(p => `${p.name} (${p.type})`).join('\n')}\n\n`
    if(returns) displayText += `**${t('returns')}**: ${returns}\n\n`
    if(examples?.length > 0) displayText += `**${t('examples')}**: ${examples.join('\n')}\n\n`
    if(keyPoints?.length > 0) displayText += `**${t('keyPoints')}**: ${keyPoints?.join('\n')}\n\n`
    if(relatedLinks?.length > 0) displayText += `**${t('relatedLinks')}**: ${relatedLinks?.join('\n')}\n\n`
    if(tags?.length > 0) displayText += `**${t('tags')}**: ${tags?.join(', ')}\n\n`
   
    displayText += `\n---\n<div class="meta-info">${t('model')}: ${selectedModel.name}</div>`

    return displayText
  }

  return (
    // ✨ 控制显示/隐藏
   <div className="sidepanel-container" style={{ display: isVisible ? 'flex' : 'none' }}>
      <div className="header">
        <div className="header-left">
          <button className="icon-btn" onClick={() => setShowHistory(true)} title={t('history')}><Menu size={22}/></button>
          <span className="brand-text">Smart Clipper</span>
        </div>
        <div className="header-right">
          {structuredData && (
             <button 
               className={`icon-btn export-btn ${saveStatus==='success'?'success':''}`}
               onClick={handleExportToFeishu}
               disabled={isSaving || saveStatus==='success'}
               title={saveStatus==='success' ? t('saved') : t('saveToFeishu')}
             >
               {isSaving ? <Loader2 className="spin" size={20}/> : saveStatus==='success' ? <CheckCircle size={20}/> : <CloudUpload size={20}/>}
             </button>
          )}
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={t('settings')}><Settings size={22}/></button>
          {userInfo ? (
             <button className="icon-btn user-avatar-btn" onClick={() => alert(`${t('userPrefix')}: ${userInfo.name}`)}><img src={userInfo.avatar} className="user-avatar-img" alt="User" /></button>
          ) : (
             <button className="icon-btn" onClick={handleLogin} title={t('login')}><User size={22}/></button>
          )}
        </div>
      </div>

      {renderHistoryDrawer()}
      {showSettings && renderSettingsModal()}

      <div className="main-content">
        {view === 'clipper' ? renderClipperView() : renderChatView()}
      </div>

      <div className="bottom-nav-simple">
        <button className={`nav-tab ${view === 'clipper' ? 'active' : ''}`} onClick={() => setView('clipper')}>
          <FileText size={24} strokeWidth={view === 'clipper' ? 2.5 : 2} />
          <span style={{fontSize:11, fontWeight:500, marginTop:2}}>{t('tabClipper')}</span>
        </button>
        <button className={`nav-tab ${view === 'chat' ? 'active' : ''}`} onClick={() => setView('chat')}>
          <MessageSquare size={24} strokeWidth={view === 'chat' ? 2.5 : 2} />
          <span style={{fontSize:11, fontWeight:500, marginTop:2}}>{t('tabChat')}</span>
        </button>
      </div>
    </div>
  );
}

export default SidePanel;