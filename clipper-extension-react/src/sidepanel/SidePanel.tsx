import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  FileText, Table, CheckSquare, Sparkles, Bot, 
  Star, Send, MessageSquare, ChevronDown, Check, Zap,
  Brain ,Globe,

 CloudUpload, // 🟢 新增：用于导出按钮的图标
  CheckCircle, // 🟢 新增：用于成功状态
  Loader2,      // 🟢 新增：用于加载状态
  User,         // 🟢 新增：用于个人用户图标
  Settings      // 🟢 新增：用于设置图标
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
  const [userInfo, setUserInfo] = useState<{name: string, avatar: string, token: string} | null>(null);  // 🟢 [新增] 用于存储登录成功后的用户信息（名字、头像、Token）
  const [bitableUrl, setBitableUrl] = useState(''); // 🟢 [新增] 存储用户填写的飞书多维表格链接
  
  
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
  const [chatHistory, setChatHistory] = useState<any[]>([]);;
  
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
  // 监听标签页切换事件，当切换标签页时，获取当前页面内容
  // =================================================================================
  useEffect(() => {
    // 标签页切换时触发
    const handleTabChange = async () => {
      try {
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          // 向当前标签页的内容脚本发送消息，请求内容
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
          { id: 'checklist', name: '清单整理', iconType: 'check' }
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
      
      // 使用Markdown格式优化AI响应消息
      let displayText = '';

      // 使用Markdown卡片和分隔线创建清晰的视觉层次
      displayText += `# AI内容分析结果

`;

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
  //  配置飞书多维表格，辅助工具：从飞书 URL 中提取 AppToken 和 TableId
  // 链接示例：https://xxx.feishu.cn/base/bascnABCDEF123?table=tblXYZ789
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

    // 2. 检查是否配置了表格链接
    if (!bitableUrl) {
      alert("请先点击侧边栏的⚙️设置按钮，填入你的多维表格链接！");
      setShowSettings(true); // 自动帮用户打开设置页
      return;
    }

    // 3. 解析链接
    const ids = parseFeishuUrl(bitableUrl);
    if (!ids) {
      alert("表格链接格式不对。\n请复制完整的飞书多维表格链接 (包含 /base/bas... 和 ?table=tbl...)");
      return;
    }

    setIsSaving(true); //设置状态

    try {
      // 1. 获取当前浏览器 Tab 的 URL (需要加上 url 字段)
      // 注意：这需要在 manifest.json 中开启 "tabs" 或 "activeTab" 权限
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tab.url || '';

      // 2. 组装数据
      const payload = {
        ...structuredData, // title, summary, tags, sentiment
        url: currentUrl,   // 补全后端 feishuService 需要的 url 字段
        userAccessToken: userInfo.token, // 🟢 用户的 Token
        appToken: ids.appToken, // 🟢 用户的表格 ID
        tableId: ids.tableId    // 🟢 用户的表 ID
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
      alert("✅ 成功导出到你的飞书表格！");

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
            {msg.role === 'ai' ? (
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {msg.text}
              </ReactMarkdown>
            ) : (
              msg.text
            )}
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
        <input
          type="text"
          value={bitableUrl}
          onChange={(e) => setBitableUrl(e.target.value)}
          placeholder="粘贴链接，例如 https://feishu.cn/base/bas..."
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '13px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxSizing: 'border-box',
            outline: 'none'
          }}
        />
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
    </div>
  );



  // 右侧导航按钮组件
  const renderRightNavigation = () => (
    <div className="right-navigation">

      {/* 顶部按钮组*/}
      <div className="nav-group-top">

        {/* 剪藏页面按钮 */}
        <button 
          className={`nav-button ${view === 'clipper' ? 'active' : ''}`}
          onClick={() => setView('clipper')}
          title="剪藏页面"
        >
          <FileText size={20} />
        </button>
        
        {/* AI对话界面按钮 */}
        <button 
          className={`nav-button ${view === 'chat' ? 'active' : ''}`}
          onClick={() => {
            if (structuredData) {
              setView('chat');
            }
          }}
          disabled={!structuredData}
          title={structuredData ? "AI对话界面" : "请先分析内容"}
        >
          <MessageSquare size={20} />
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
          onClick={() => setShowSettings(true)} // 🟢 [修改] 点击后，将状态改为 true，显示设置页
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
        ) : (
          // --- 场景 B: 显示正常功能页 (Header + 内容) ---
          <>
            <div className="header">
              <div className="brand">
                {view === 'chat' ? <MessageSquare size={20} color="#2563eb"/> : <Bot size={20} color="#2563eb" />}
                <span>{view === 'chat' ? 'AI 助手' : 'AI Clipper'}</span>
              </div>
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