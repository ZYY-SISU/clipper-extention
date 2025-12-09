import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  FileText, Table, CheckSquare, Sparkles, Bot,
  Star, Send, MessageSquare, ChevronDown, Check, Zap,
  Brain ,Globe, PlusCircle, History, Menu, X,
  CloudUpload, CheckCircle, Loader2, User, Settings,
  Video, Trash2, Edit2, Sun, Moon, Music, StickyNote,
  Download, ChevronUp, FileSpreadsheet
} from 'lucide-react'; 
import type{ requestType, senderType, sendResponseType, templateType, UserConfig, SummaryType, VideoType, TechDocType, McpToolDefinition, ClipContentPayload, ImageData, LinkData, HighlightInfo } from '../types/index';
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
  
  // 调试：确保组件正确挂载
  useEffect(() => {
    console.log('[SidePanel] 组件已挂载，isVisible:', isVisible);
  }, []);

  const [view, setView] = useState<'clipper' | 'chat'>('clipper');
  const [showHistory, setShowHistory] = useState(false);
  const [content, setContent] = useState('');
  const [clipImages, setClipImages] = useState<Array<ImageData>>([]); // 新增：剪藏的图片
  const [clipLinks, setClipLinks] = useState<Array<LinkData>>([]); // 新增：剪藏的链接
  const [clipHighlights, setClipHighlights] = useState<Array<HighlightInfo>>([]); // 新增：高亮信息
  const [linksExpanded, setLinksExpanded] = useState(false); // 链接展开状态
  const [imagesExpanded, setImagesExpanded] = useState(false); // 图片展开状态
  const [structuredData, setStructuredData] = useState<SummaryType | VideoType | TechDocType | null>(null);// 🟢 1. 新增状态:用于存储 AI 分析出来的原始结构化数据，以便发给飞书
  const [isSaving, setIsSaving] = useState(false);// 🟢 2. 新增状态：控制导出按钮的 Loading 状态
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  const [userInfo, setUserInfo] = useState<{name: string, avatar: string, token: string, open_id?: string} | null>(null);  // 🟢 [新增] 用于存储登录成功后的用户信息（名字、头像、Token）
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  // const [isInitializing, setIsInitializing] = useState(false); // 初始化 Loading（未使用） // 🟢 [新增] 存储用户填写的飞书多维表格链接
  const [showSettings, setShowSettings] = useState(false);
  
  // 🎨 主题 & 🌐 语言
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState('zh-CN'); // 默认中文

  // 翻译钩子
  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['zh-CN'][key] || key;

  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [singleExportStatus, setSingleExportStatus] = useState<{messageId: number | null, status: 'idle' | 'success', tableUrl?: string}>({messageId: null, status: 'idle'});
  
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
        const newVisible = !isVisible;
        setIsVisible(newVisible);
        
        // 如果隐藏侧边栏，清除所有高亮和选区高亮
        if (!newVisible) {
          chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
            if (tab?.id) {
              chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_ALL_HIGHLIGHTS' }).catch(() => {});
            }
          });
        }
        
        sendResponse({ status: 'success' });
      } else if (request.type === 'CLIP_CONTENT') {
        setContent(request.payload.text || request.payload.html || '');
        // 保存图片和链接信息
        if (request.payload.images) {
          setClipImages(request.payload.images);
        }
        if (request.payload.links) {
          setClipLinks(request.payload.links);
        }
        // 保存高亮信息
        if (request.payload.highlights) {
          setClipHighlights(request.payload.highlights);
        }
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
    const handleClipContentUpdate = (request: requestType, _: senderType, sendResponse: sendResponseType) => {
      if (request.type === 'CLIP_CONTENT_UPDATED') {
        try {
          const payload = request.payload as ClipContentPayload;
          if (payload) {
            const nextContent = payload.text || payload.html || '';
            if (nextContent) {
              setContent(nextContent);
              setStructuredData(null);
              setView('clipper');
            }
            // 修复：同时更新图片和链接信息
            if (payload.images) {
              setClipImages(payload.images);
            }
            if (payload.links) {
              setClipLinks(payload.links);
            }
            if (payload.highlights) {
              setClipHighlights(payload.highlights);
            }
          }
          sendResponse({ status: 'success' });
        } catch (error) {
          console.error('处理剪藏内容更新失败:', error);
          sendResponse({ status: 'error', message: error instanceof Error ? error.message : '未知错误' });
        }
      }
      return true; // 保持消息通道开启
    };

    chrome.runtime.onMessage.addListener(handleClipContentUpdate);
    return () => {
      try {
        chrome.runtime.onMessage.removeListener(handleClipContentUpdate);
      } catch (error) {
        // 忽略扩展上下文失效的错误（开发环境常见）
        if (error instanceof Error && !error.message.includes('Extension context invalidated')) {
          console.error('移除消息监听器失败:', error);
        }
      }
    };
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_LAST_CLIP' }, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;
        // 忽略扩展上下文失效的错误（开发环境常见）
        if (errorMsg && !errorMsg.includes('Extension context invalidated')) {
          console.warn('获取最近一次剪藏失败:', errorMsg);
        }
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
        // 修复：同时加载图片和链接信息
        if (payload.images) {
          setClipImages(payload.images);
        }
        if (payload.links) {
          setClipLinks(payload.links);
        }
        if (payload.highlights) {
          setClipHighlights(payload.highlights);
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
    if (currentUrl && currentConversationId) {
      ChatStorage.updateConversationMessages(currentUrl, currentConversationId, chatHistory);
      if (!editingConvId) setConversations(ChatStorage.getConversationList(currentUrl));
    }
  }, [chatHistory, currentUrl, currentConversationId]);

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
      ChatStorage.deleteConversation(currentUrl, id);
      const updatedList = ChatStorage.getConversationList(currentUrl);
      setConversations(updatedList);
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
    const conv = conversations.find(c => c.id === editingConvId);
    if (conv) {
      const updated = { ...conv, title: editingTitle.trim() };
      ChatStorage.updateConversation(currentUrl, updated);
      setConversations(ChatStorage.getConversationList(currentUrl));
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

      // 🟢 确保高亮格式被保留：如果原始内容中有高亮标记（==文本==），应用到结构化数据中
      let finalStructuredData = { ...structuredData };
      
      // 检查原始内容中是否有高亮格式
      if (content && content.includes('==')) {
        // 如果 summary 字段存在且是字符串，检查是否需要应用高亮格式
        // AI 分析可能会移除高亮格式，我们需要从原始内容中恢复
        if (finalStructuredData && 'summary' in finalStructuredData && typeof finalStructuredData.summary === 'string') {
          // 从原始内容中提取高亮文本，并尝试应用到 summary 中
          // 使用正则表达式查找所有高亮文本
          const highlightMatches = content.match(/==([^=]+)==/g);
          if (highlightMatches && highlightMatches.length > 0) {
            // 如果 summary 中包含高亮文本（去掉 == 标记后），就应用高亮格式
            highlightMatches.forEach(highlight => {
              const textWithoutMarkers = highlight.replace(/==/g, '');
              if (finalStructuredData && 'summary' in finalStructuredData && typeof finalStructuredData.summary === 'string') {
                // 如果 summary 中包含这个文本但没有高亮标记，就添加高亮标记
                if (finalStructuredData.summary.includes(textWithoutMarkers) && !finalStructuredData.summary.includes(highlight)) {
                  finalStructuredData.summary = finalStructuredData.summary.replace(
                    new RegExp(textWithoutMarkers.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    highlight
                  );
                }
              }
            });
          }
        }
      }

      const response = await fetch('http://localhost:3000/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...finalStructuredData, url: tab.url || '', userAccessToken: userInfo.token, appToken: userConfig.appToken, tableId  })
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

    if (userConfig && userInfo.open_id && userConfig.userId !== userInfo.open_id) {
      alert(`配置冲突！\n当前配置属于：${userConfig.name}\n当前登录用户：${userInfo.name}\n\n系统将自动重新初始化...`);
      if (userInfo.open_id) {
        await checkAndInitConfig({ ...userInfo, open_id: userInfo.open_id }); // 强制重新初始化
      }
      return;
    }

    if (!userConfig && userInfo.open_id) {
       await checkAndInitConfig({ ...userInfo, open_id: userInfo.open_id });
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
        // 新增：图片、链接、高亮信息
        images: clipImages.length > 0 ? clipImages : undefined,
        links: clipLinks.length > 0 ? clipLinks : undefined,
        highlights: clipHighlights.length > 0 ? clipHighlights : undefined,
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


  // --- 视图 2: 对话列表（已废弃，使用 renderHistoryDrawer） ---
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _renderConversationsView = () => (
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

  // ---新增 视图 3: 设置界面（已废弃，使用 renderSettingsModal） ---
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _renderSettings = () => (
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
    setView('chat');
    setShowHistory(false);
  };

  const handleSwitchConversation = (id: string) => {
    setCurrentConversationId(id);
    const c = ChatStorage.getConversation(currentUrl, id);
    if (c) setChatHistory(c.messages);
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
          {conversations.map(c => (
            <div key={c.id} className={`history-item ${currentConversationId === c.id ? 'active' : ''}`} onClick={() => handleSwitchConversation(c.id)}>
              {editingConvId === c.id ? (
                <div style={{display:'flex', alignItems:'center', flex:1, width:'100%'}} onClick={e=>e.stopPropagation()}>
                  <input autoFocus className="rename-input" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmitRename(e)} />
                  <button className="action-icon-btn" onClick={handleSubmitRename}><Check size={16}/></button>
                </div>
              ) : (
                <>
                  <span className="history-title-text" title={c.title}>{c.title || t('defaultChatTitle')}</span>
                  <div className="history-actions">
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

      {/* 新增：链接展示框 */}
      {clipLinks.length > 0 && (
        <>
          <div className="section-title">
            <span>🔗 链接 ({clipLinks.length}个)</span>
            <button 
              className="export-excel-btn"
              onClick={() => {
                // 导出链接为Excel
                const csvContent = [
                  ['链接文本', '链接地址', '域名'],
                  ...clipLinks.map(link => {
                    try {
                      const domain = new URL(link.href).hostname;
                      return [link.text || link.href, link.href, domain];
                    } catch {
                      return [link.text || link.href, link.href, ''];
                    }
                  })
                ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                
                // 添加BOM以支持Excel正确识别UTF-8
                const BOM = '\uFEFF';
                const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `链接列表_${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                // 显示成功提示
                const toast = document.createElement('div');
                toast.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.8); color: white; padding: 12px 20px; border-radius: 8px; z-index: 2147483650; font-size: 14px;';
                toast.textContent = `✅ 已导出 ${clipLinks.length} 个链接到Excel`;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
              }}
              title="导出链接为Excel"
            >
              <FileSpreadsheet size={14} />
              导出Excel
            </button>
          </div>
          <div className="links-container">
            {(linksExpanded ? clipLinks : clipLinks.slice(0, 5)).map((link, idx) => {
              try {
                const domain = new URL(link.href).hostname;
                return (
                  <div key={idx} className="link-item">
                    <a 
                      href={link.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="link-content"
                    >
                      <div className="link-text">{link.text || link.href}</div>
                      <div className="link-domain">{domain}</div>
                    </a>
                  </div>
                );
              } catch {
                return (
                  <div key={idx} className="link-item">
                    <a 
                      href={link.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="link-content"
                    >
                      <div className="link-text">{link.text || link.href}</div>
                    </a>
                  </div>
                );
              }
            })}
            {clipLinks.length > 5 && (
              <button 
                className="expand-toggle"
                onClick={() => setLinksExpanded(!linksExpanded)}
              >
                {linksExpanded ? (
                  <>
                    <ChevronUp size={14} />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    展开更多 ({clipLinks.length - 5}个)
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}

      {/* 新增：图片展示框 */}
      {clipImages.length > 0 && (
        <>
          <div className="section-title">
            <span>📷 图片 ({clipImages.length}张)</span>
            <button 
              className="download-all-btn"
              onClick={async () => {
                for (let i = 0; i < clipImages.length; i++) {
                  const img = clipImages[i];
                  try {
                    if (chrome.downloads) {
                      const extension = img.src.split('.').pop()?.split('?')[0] || 'jpg';
                      const filename = img.alt 
                        ? `${img.alt.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`
                        : `image-${i + 1}.${extension}`;
                      await chrome.downloads.download({
                        url: img.src,
                        filename: filename,
                        saveAs: false
                      });
                    } else {
                      const response = await fetch(img.src);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = img.alt || `image-${i + 1}.jpg`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }
                    await new Promise(resolve => setTimeout(resolve, 200));
                  } catch (error) {
                    console.error(`下载图片失败: ${img.src}`, error);
                  }
                }
              }}
              title="一键下载所有图片"
            >
              <Download size={14} />
              下载全部
            </button>
          </div>
          <div className="images-container">
            {(imagesExpanded ? clipImages : clipImages.slice(0, 4)).map((img, idx) => (
              <div key={idx} className="image-item">
                <div className="image-wrapper">
                  <img 
                    src={img.src} 
                    alt={img.alt || `图片 ${idx + 1}`}
                    className="clip-image"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    onClick={async () => {
                      try {
                        if (chrome.downloads) {
                          const extension = img.src.split('.').pop()?.split('?')[0] || 'jpg';
                          const filename = img.alt 
                            ? `${img.alt.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`
                            : `image-${idx + 1}.${extension}`;
                          await chrome.downloads.download({
                            url: img.src,
                            filename: filename,
                            saveAs: false
                          });
                        } else {
                          const response = await fetch(img.src);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          const extension = img.src.split('.').pop()?.split('?')[0] || 'jpg';
                          a.download = img.alt || `image-${idx + 1}.${extension}`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        }
                      } catch (error) {
                        console.error(`下载图片失败: ${img.src}`, error);
                        alert('下载失败，请检查图片链接是否有效');
                      }
                    }}
                  />
                  <div className="image-download-overlay" title="点击下载">
                    <Download size={16} />
                  </div>
                </div>
                {img.alt && (
                  <div className="image-caption">{img.alt}</div>
                )}
              </div>
            ))}
            {clipImages.length > 4 && (
              <button 
                className="expand-toggle image-expand-toggle"
                onClick={() => setImagesExpanded(!imagesExpanded)}
              >
                {imagesExpanded ? (
                  <>
                    <ChevronUp size={14} />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    展开更多 ({clipImages.length - 4}张)
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}

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
   <div className={`sidepanel-container ${isVisible ? '' : 'hidden'}`}>
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