import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  FileText, Table, CheckSquare, Sparkles, Bot,
  Send, MessageSquare, ChevronDown, Check, Zap,
  Brain ,Globe, PlusCircle, Menu, X,
  CloudUpload, CheckCircle, Loader2, User, Settings,
  Video, Trash2, Edit2, Sun, Moon
} from 'lucide-react'; 
<<<<<<< HEAD
import type{ requestType, senderType, sendResponseType, templateType, UserConfig, StructuredDataType } from '../types/index';
=======
import type{ requestType, senderType, sendResponseType, templateType, UserConfig, SummaryType, VideoType } from '../types/index';
>>>>>>> e25bb8a2ceaf99846d9623681adcac0eda9a0648
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
<<<<<<< HEAD
  const [structuredData, setStructuredData] = useState<StructuredDataType | null>(null);
=======
  const [structuredData, setStructuredData] = useState<SummaryType | VideoType | null>(null);
>>>>>>> e25bb8a2ceaf99846d9623681adcac0eda9a0648
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  const [userInfo, setUserInfo] = useState<{name: string, avatar: string, token: string} | null>(null);
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
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
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
          { id: 'video-summary', name: '视频摘要', iconType: 'Video' }
        ]);
        console.error('Failed to fetch templates:', e);
      } finally { setIsLoadingTemplates(false); }
    };
    fetchTemplates();
  }, []);

  const getIconComponent = (type:templateType['iconType']) => {
    switch(type) {
      case 'text': return FileText;
      case 'table': return Table;
      case 'check': return CheckSquare;
      case 'globe': return Globe;
      case 'Video': return Video;
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
      chrome.runtime.sendMessage({ type: 'UPDATE_STRUCTURED_DATA', payload: data }).catch(() => {});

      setStatus('ready');
      setView('chat'); 

<<<<<<< HEAD
      setChatHistory(prev => [...prev, { role: 'ai', text: displayText }]);
=======
      if(selectedTemplateId === 'summary') {
        // 渲染SummaryCard
        const storageData = SummaryCard(data)
        setChatHistory(prev => [...prev, { role: 'ai', text: storageData }]);

      }else if(selectedTemplateId === 'video-summary') {
        // 渲染VideoCard
        const storageData = VideoCard(data)
        setChatHistory(prev => [...prev, { role: 'ai', text: storageData }]);
      }
>>>>>>> e25bb8a2ceaf99846d9623681adcac0eda9a0648
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
        body: JSON.stringify({ message: currentMsg, model: selectedModel.id, context: structuredData || content })
      });
      const data = await res.json();
      setChatHistory(prev => prev.filter(m => !m.isLoading).concat({ role: 'ai', text: data.reply || t('noResponse') }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setChatHistory(prev => prev.filter(m => !m.isLoading).concat({ role: 'ai', text: `${t('error')}: ${errorMessage}` }));
    }
  };

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
            setUserInfo({ name: json.data.user.name, avatar: json.data.user.avatar_url, token: json.data.token });
            checkAndInitConfig(json.data.token);
          } else alert(`${t('alertLoginFail')}: ${json.error}`);
        } catch (e: unknown) {
          console.error('Connection error:', e);
          alert(t('alertConnectFail'));
        }
      }
    });
  };

  const checkAndInitConfig = async (token: string) => {
    setIsInitializing(true);
    try {
      const storage = await chrome.storage.sync.get(['clipper_conf']);
      if (storage.clipper_conf) {
        setUserConfig(storage.clipper_conf as UserConfig);
      } else {
        const res = await fetch('http://localhost:3000/api/init-feishu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userAccessToken: token }) });
        const json = await res.json();
        if (json.code === 200) {
          await chrome.storage.sync.set({ 'clipper_conf': json.data });
          setUserConfig(json.data);
          alert(t('alertInitSuccess'));
        }
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`${t('alertInitFail')}: ${errorMessage}`);
    }
    finally { setIsInitializing(false); }
  };

  const handleExportToFeishu = async () => {
    if (!structuredData) return;
    if (!userInfo || !userInfo.token) return alert(t('notConnected'));
    if (!userConfig) { await checkAndInitConfig(userInfo.token); return; }

    setIsSaving(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTemplate = selectedTemplateId || 'summary';
      const tableId = userConfig.tables[currentTemplate] || userConfig.tables['default'];

      await fetch('http://localhost:3000/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...structuredData, url: tab.url || '', userAccessToken: userInfo.token, appToken: userConfig.appToken, tableId })
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: unknown) {
        console.error('Export error:', error);
        alert(t('alertExportFail'));
      } 
    finally { setIsSaving(false); }
  };

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

      <div className="section-title">{t('selectTemplate')}</div>
      <div className="template-grid">
        {isLoadingTemplates ? (
           <div style={{gridColumn:'span 2', textAlign:'center', padding:20, color:'var(--text-secondary)'}}><Loader2 className="spin" size={18}/></div>
        ) : (
           templates.map(tpl => {
             const Icon = getIconComponent(tpl.iconType);
             return (
               <div key={tpl.id} className={`template-card ${selectedTemplateId===tpl.id ? 'active' : ''}`} onClick={() => setSelectedTemplateId(tpl.id)}>
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
          {msg.role === 'ai' ? <ReactMarkdown rehypePlugins={[rehypeRaw]}>{msg.text}</ReactMarkdown> : msg.text}
        </div>
      ))}
      <div ref={chatEndRef} style={{height:'1px'}}/>

      <div className="input-floating-area">
         <div className="chat-input-wrapper">
            <input className="chat-input" value={userNote} onChange={(e) => setUserNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={t('inputPlaceholder')} autoFocus />
            <button className="send-btn-round" onClick={handleSend}><Send size={20} /></button>
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