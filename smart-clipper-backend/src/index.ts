// src/index.ts
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { analyzeText } from './services/aiService';
import { processContent } from './services/ai_handler';//胡同学的ai模块
import { addRecord } from './services/feishuService'; // <--- 导入新写的服务
// 引入拆分出来的文件
import { DEFAULT_TEMPLATES } from './defaultTemplates';
import { AnalyzeRequest, TemplateConfig } from './types'; // 引入类型定义

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

// 3. 路由定义


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
// 👇AI 分析接口
//  POST 接口，前端会把 { text: "..." } 发过来
app.post('/api/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
   const { content, template, model } = req.body; 
    
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
    const rawResult = await processContent(content, template, targetTemplate.systemPrompt, model);
    
    // 🟢 2. 核心修改：清洗数据，只保留我们需要的四个金刚
    // 这里的 || 是为了防止 AI 没返回某个字段导致 undefined
    const cleanResult = {
      title: rawResult.title || "无标题",
      summary: rawResult.summary || "无摘要",
      sentiment: rawResult.sentiment || "中性",
      tags: Array.isArray(rawResult.tags) ? rawResult.tags : [] 
    };

    console.log("处理成功，返回清洗后的结果:", cleanResult);
    
    // 3. 返回清洗后的数据
    res.json(cleanResult);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || '服务器内部错误' });
  }
});

// 👇 保存到飞书接口 
app.post('/api/save', async (req: Request, res: Response): Promise<void> => {
  try {
    // 从前端请求体中解构数据
    const { title, summary, tags, sentiment, url } = req.body;

    // 简单的校验
    if (!title || !summary) {
      res.status(400).json({ error: '缺少必要的数据字段' });
      return;
    }

    // 调用飞书服务
    await addRecord({ title, summary, tags, sentiment, url });

    res.json({ success: true, message: '已同步到飞书' });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || '保存失败' });
  }
});



// 4. 启动服务
app.listen(PORT, () => {
  console.log(`\n⚡️ 服务器正在运行: http://localhost:${PORT}`);
  console.log(`🔓 跨域 CORS 已开启`);
});