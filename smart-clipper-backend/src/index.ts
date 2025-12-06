// src/index.ts
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';


// 引入服务
import { analyzeText } from './services/aiService';
import { processContent, processChat } from './services/ai_handler';//胡同学的ai模块
import { addRecord , initUserBase} from './services/feishuService'; 
import { getUserInfo } from './services/authService';
// 引入拆分出来的文件
import { DEFAULT_TEMPLATES } from './defaultTemplates';

// 🟢 引入统一类型
import { TemplateConfig, SaveOptions, FeishuData } from './types';

// 1. 配置加载
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;


// 定义一个空数组，用来暂存用户自定义的模板
let userTemplates: TemplateConfig[] = [];


// 2. 中间件，允许跨域：这对于浏览器插件至关重要
app.use(cors()); 
// 解析 JSON 请求体
app.use(express.json());



//////////////////////////////////////////3. 路由定义/////////////////////////////////////////


// 👇健康检查接口 (Ping)
app.get('/', (req: Request, res: Response) => {
  res.send('Smart Clipper Backend is Running! 🚀');
});

// 👇 获取所有模板 (固定 + 用户自定义)
app.get('/api/templates', (req: Request, res: Response) => {
  const allTemplates = [...DEFAULT_TEMPLATES, ...userTemplates];
  res.json({
    code: 200,
    data: allTemplates
  });
});

// 🟢 登录接口 (对接 Auth Service)
app.post('/api/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: '缺少 code' });
      return;
    }
    const result = await getUserInfo(code);
    res.json({ code: 200, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// 👇AI 分析接口
//  POST 接口，前端会把 { text: "..." } 发过
app.post('/api/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
   const { content, template, model } = req.body; 
   console.log("正在使用模型:",model);
   console.log("正在使用模板:",template);

   console.log("内容:", content);
    
    // 👇👇👇 校验逻辑也要改 👇👇👇
    if (!content) {
      res.status(400).json({ error: '请提供 content 内容' });
      return;
    }

    //  查找对应的模板配置 (关键步骤！)
    // 先找固定的，再找用户自定义的
    const allTemplates = [...DEFAULT_TEMPLATES, ...userTemplates];
    const targetTemplate = allTemplates.find(t => t.id === template);

    if (!targetTemplate) {
      res.status(404).json({ error: `未找到 ID 为 ${template} 的模板配置` });
      return;
    }

    console.log(`收到请求: 正在使用 ${model || '默认模型'} 执行 ${template || '默认模版'}...`);

    // 调用服务层逻辑,我的测试模块
    // const result = await analyzeText(text,model);
// 1. 获取 AI 原始结果
    const rawResult = await processContent(content, targetTemplate.systemPrompt, model);
    
   // 不手动一个个写字段，改为“合并模式”
    // 这样未来不管加什么新字段（比如商品价格、论文作者），都不用改这里代码了
    const cleanResult = {
      ...rawResult, // 🌟 关键：先把 AI 返回的所有字段都拿过来 (包含 play_count 等)
      templateId: targetTemplate.id // 再加上模板 ID 作为烙印
      
      // // 下面是对核心字段的“兜底”处理（如果 AI 没返回，给个默认值）
      // title: rawResult.title || "无标题",
      // summary: rawResult.summary || "暂无摘要",
      // sentiment: rawResult.sentiment || "neutral",
      // tags: Array.isArray(rawResult.tags) ? rawResult.tags : []
    };

    console.log("处理成功，返回清洗后的结果:", cleanResult);
    
    // 3. 返回清洗后的数据
    res.json(cleanResult);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || '服务器内部错误' });
  }
});


//  新增：对话专用接口
//  修改AI 对话接口 (Chat) - 来支持剪藏内容的上下文
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    //  接收 context 参数
    const { message, model, context } = req.body;

    if (!message) {
      res.status(400).json({ error: '消息内容不能为空' });
      return;
    }

    console.log(`💬 收到对话请求: ${message.substring(0, 10)}... (含上下文: ${!!context})`);
    
    // 把 context 传给处理函数
    const reply = await processChat(message, model, context);
    
    res.json({ reply });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// 👇 保存到飞书接口 
app.post('/api/save', async (req: Request, res: Response): Promise<void> => {
  try {
    // 🟢 从前端接收所有必要信息
    // const { 
    //   // 数据内容
    //   title, summary, tags, sentiment, url,
    //   up_name, play_count, like_count, coin_count, collect_count,
    //   userAccessToken, appToken, tableId    
    // } = req.body;

    const payload = req.body;
    const { userAccessToken, appToken, tableId } = payload;
    console.log('当前tableId:', tableId);

    // 简单的校验
    if (!userAccessToken) {
      res.status(401).json({ error: '未登录飞书' });
      return;
    }
    if (!appToken || !tableId) {
      res.status(400).json({ error: '未配置目标表格' });
      return;
    }
    console.log(`📥 收到保存请求，包含字段: ${Object.keys(payload).join(', ')}`);
    
    if (payload.tracks) {
      console.log(`🎵 检测到音乐列表，共 ${payload.tracks.length} 首`);
    }

    // 3. 调用服务 (直接把 payload 传进去，Service 层会自己判断怎么处理)
    await addRecord(payload, { userAccessToken, appToken, tableId });

    res.json({ success: true, message: '已同步到您的飞书' });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || '保存失败' });
  }
});

// 🟢 [新增] 初始化接口
app.post('/api/init-feishu', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userAccessToken } = req.body;
    if (!userAccessToken) {
      res.status(401).json({ error: '缺少 User Token' });
      return;
    }

    // 调用 Service 创建表格
    const config = await initUserBase(userAccessToken);
    
    // 把创建好的 ID 返回给前端保存
    res.json({ code: 200, data: config });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. 启动服务
app.listen(PORT, () => {
  console.log(`\n⚡️ 服务器正在运行: http://localhost:${PORT}`);
  console.log(`🔓 跨域 CORS 已开启`);
});