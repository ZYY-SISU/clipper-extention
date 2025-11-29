import { useState, useEffect, useRef } from 'react';
import { 
  FileText, Table, CheckSquare, Sparkles, Bot, Settings, 
  Star, Send, ArrowLeft, MessageSquare, ChevronDown, Check, Zap,
  Brain ,Globe,

 CloudUpload, // 🟢 新增：用于导出按钮的图标
  CheckCircle, // 🟢 新增：用于成功状态
  Loader2      // 🟢 新增：用于加载状态
} from 'lucide-react'; 
import type{ requestType, senderType, sendResponseType, templateType } from '../types/index';
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
  const [chatHistory, setChatHistory] = useState<any[]>([]);;
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // =================================================================================
  //  接口区域 1：接收数据 [对接成员 A]
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
  //  🌟【修改点 2】新增：组件加载时，向后端请求模版列表
  // =================================================================================
  useEffect(() => {
    const fetchTemplates = async () => {
      console.log("🚀 前端正在尝试连接后端..."); // <--- 加上这一句
      try {
        // 请求后端接口
        const res = await fetch('http://localhost:3000/api/templates');
        const json = await res.json();
        
        if (json.code === 200) {
          setTemplates(json.data); // 将后端返回的数组存入状态
        }
      } catch (error) {
        console.error("获取模版失败:", error);
        // 兜底策略：如果后端没开，显示一个默认的
        setTemplates([{ id: 'summary', name: '智能摘要(离线)', iconType: 'text' }]);
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

      setStatus('ready');
      setView('chat'); 
      
      // 🟢 2. 核心修改：只展示这四个字段，不做任何多余的遍历
      let displayText = '';

      // (1) 标题
      displayText += `📌 **标题**: ${data.title || '未提取到标题'}\n\n`;
      
      // (2) 摘要
      displayText += `📝 **摘要**: ${data.summary || '未提取到摘要'}\n\n`;

      // (3) 情感 (新增展示)
      // 可能会返回 "positive"/"negative" 或中文，做个简单的容错
      const sentimentMap: Record<string, string> = {
        'positive': '正面 👍',
        'negative': '负面 👎',
        'neutral': '中性 😐'
      };
      const sentimentShow = sentimentMap[data.sentiment] || data.sentiment || '未知';
      displayText += `mood **情感**: ${sentimentShow}\n\n`;

      // (4) 标签
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        displayText += `🏷️ **标签**: ${data.tags.join(', ')}`;
      } else {
        displayText += `🏷️ **标签**: 无`;
      }

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
  //  接口区域 4：完整的对话交互模块（胡）
  // =================================================================================
  const handleSend = async () => {
    // 1. 校验输入
    if (!userNote.trim()) return;
    
    // 2. 立即更新 UI：把用户的消息先显示出来
    const currentMsg = userNote;
    const newHistory = [...chatHistory, { role: 'user', text: currentMsg }];
    setChatHistory(newHistory);
    setUserNote(''); // 清空输入框
    
    // 3. 显示一个 "AI 正在输入..." 的临时占位符
    const loadingMsg = { role: 'ai', text: 'Thinking...', isLoading: true };
    setChatHistory([...newHistory, loadingMsg]);

    try {
      console.log('💬 发送对话请求:', { message: currentMsg, model: selectedModel.id });

      // 4. 发起真实请求
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMsg,
          model: selectedModel.id
        })
      });

      const data = await response.json();

      // 5. 请求成功，用真实回复替换掉 "Thinking..."
      setChatHistory(prev => {
        // 移除最后一个 (Loading) 消息
        const historyWithoutLoading = prev.filter(msg => !msg.isLoading);
        return [...historyWithoutLoading, { 
          role: 'ai', 
          text: data.reply || "AI 没有返回内容" 
        }];
      });

    } catch (error:any) {
      console.error("对话失败:", error);
      // 6. 失败处理
      setChatHistory(prev => {
        const historyWithoutLoading = prev.filter(msg => !msg.isLoading);
        return [...historyWithoutLoading, { 
          role: 'ai', 
          text: `❌ 发送失败: ${error.message} (请检查后端是否开启)` 
        }];
      });
    }
  };

// =================================================================================
  //  🟢 5. 处理导出到飞书
  // =================================================================================
  const handleExportToFeishu = async () => {
    if (!structuredData) return;
    setIsSaving(true);

    try {
      // 1. 获取当前浏览器 Tab 的 URL (需要加上 url 字段)
      // 注意：这需要在 manifest.json 中开启 "tabs" 或 "activeTab" 权限
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tab.url || '';

      // 2. 组装数据
      const payload = {
        ...structuredData, // title, summary, tags, sentiment
        url: currentUrl    // 补全后端 feishuService 需要的 url 字段
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
      
      // 3秒后重置状态，允许再次保存
      setTimeout(() => setSaveStatus('idle'), 3000);

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

  // --- 视图 2: 聊天界面 ---
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
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.text}
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

  return (
    <>
      <div className="header">
        <div className="brand">
          {view === 'chat' && (
            <ArrowLeft size={20} style={{cursor:'pointer', marginRight:'8px'}} onClick={() => setView('clipper')} />
          )}
          {view === 'chat' ? <MessageSquare size={20} color="#2563eb"/> : <Bot size={20} color="#2563eb" />}
          <span>{view === 'chat' ? 'AI 助手' : 'AI Clipper'}</span>
        </div>

        {/* 🟢 右上角按钮区域 
            如果是 'chat' 视图且有数据，显示炫酷的“导出飞书”按钮,否则显示默认的设置图标 
        */}
        {view === 'chat' && structuredData ? (
          <button 
            className={`feishu-export-btn ${saveStatus === 'success' ? 'success' : ''}`}
            onClick={handleExportToFeishu}
            disabled={isSaving || saveStatus === 'success'}
          >
            {isSaving ? (
              <Loader2 size={14} className="spin" />
            ) : saveStatus === 'success' ? (
              <>
                <CheckCircle size={14} /> <span>已保存</span>
              </>
            ) : (
              <>
                <CloudUpload size={14} /> <span>存飞书</span>
              </>
            )}
          </button>
        ) : (
          <Settings size={18} color="#94a3b8" />
        )}
      </div>

      {view === 'clipper' ? renderClipperView() : renderChatView()}
    </>
  );
}

export default SidePanel;