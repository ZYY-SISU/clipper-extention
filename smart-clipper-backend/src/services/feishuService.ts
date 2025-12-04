// src/services/feishuService.ts
// src/services/feishuService.ts
import axios from 'axios';
import { FeishuData, SaveOptions } from '../types';

// 🟢 1. 定义两套不同的表结构 (Schema)
// 摘要表：基础信息
const FIELDS_SUMMARY = [
  { field_name: "标题", type: 1 },
  { field_name: "摘要", type: 1 },
  { field_name: "情感", type: 1 },
  { field_name: "标签", type: 1 },
  { field_name: "原文链接", type: 15 }
];

// 视频表：基础信息 + 视频独有数据
const FIELDS_VIDEO = [
  { field_name: "标题", type: 1 },
  { field_name: "摘要", type: 1 },
  { field_name: "UP主", type: 1 },      // 🟢 独有
  { field_name: "播放量", type: 1 },    // 🟢 独有
  { field_name: "点赞", type: 1 },      // 🟢 独有
  { field_name: "投币", type: 1 },      // 🟢 独有
  { field_name: "收藏", type: 1 },      // 🟢 独有
  { field_name: "标签", type: 1 },
  { field_name: "原文链接", type: 15 }
];

// 辅助：给指定表添加字段
async function addFieldsToTable(userAccessToken: string, appToken: string, tableId: string, fields: any[]) {
  for (const field of fields) {
    try {
      await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
        field,
        { headers: { Authorization: `Bearer ${userAccessToken}` } }
      );
    } catch (e: any) {
      // 忽略字段已存在错误
      if (!e.response?.data?.msg?.includes("existed")) {
         console.warn(`⚠️ 字段 [${field.field_name}] 创建警报:`, e.response?.data?.msg);
      }
    }
  }
}

// 🟢 [核心修改] 初始化用户的飞书多维表格 (一次建两张表)
export const initUserBase = async (userAccessToken: string) => {
  try {
    console.log("🔍 开始初始化知识库...");

    // 1. 创建 Base (知识库)
    const createAppRes = await axios.post(
      'https://open.feishu.cn/open-apis/bitable/v1/apps',
      { name: "AI 剪藏知识库 (Smart Clipper)", folder_token: "" },
      { headers: { Authorization: `Bearer ${userAccessToken}` } }
    );
    if (createAppRes.data.code !== 0) throw new Error(`创建失败: ${createAppRes.data.msg}`);

    const appToken = createAppRes.data.data.app.app_token;
    const table1Id = createAppRes.data.data.app.default_table_id; // 默认那张表

    // 2. 初始化 Table 1 (智能摘要)
    console.log(`🛠️ 正在配置表1 [智能摘要] (${table1Id})...`);
    // 改名
    try {
      await axios.put(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${table1Id}`,
        { name: "智能摘要" },
        { headers: { Authorization: `Bearer ${userAccessToken}` } }
      );
    } catch (e) {}
    // 加列
    await addFieldsToTable(userAccessToken, appToken, table1Id, FIELDS_SUMMARY);

    // 3. 初始化 Table 2 (视频剪藏)
    console.log(`🛠️ 正在创建表2 [视频剪藏]...`);
    const createTable2Res = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`,
        { table: { name: "视频剪藏" } },
        { headers: { Authorization: `Bearer ${userAccessToken}` } }
    );
    const table2Id = createTable2Res.data.data.table_id;
    // 加列
    await addFieldsToTable(userAccessToken, appToken, table2Id, FIELDS_VIDEO);

    console.log("✅ 初始化完成！");

    // 🟢 返回映射表：告诉前端哪个模版用哪个ID
    return {
      appToken: appToken,
      tables: {
        "summary": table1Id,  // 摘要模版 -> 表1
        "bilibili": table2Id, // 视频模版 -> 表2
        "default": table1Id   // 兜底
      }
    };

  } catch (error: any) {
    console.error("❌ 初始化流程中断:", error.message);
    throw new Error("无法自动创建飞书表格");
  }
};


// 🟢 [核心修改] 写入记录 (智能判断字段)
export const addRecord = async (data: FeishuData, options: SaveOptions) => {
  const { userAccessToken, appToken, tableId } = options;
  
  if (!userAccessToken || !appToken || !tableId) throw new Error("配置缺失");

  try {
    // 动态组装字段：只发送那些 "非空" 的字段
    // 这样，如果写入摘要表，就不会发送 "播放量" 这种不存在的字段，从而避免报错
    const fields: any = {};

    // 通用字段
    if (data.title) fields["标题"] = data.title;
    if (data.summary) fields["摘要"] = data.summary;
    if (data.sentiment) fields["情感"] = data.sentiment;
    fields["标签"] = Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "");
    fields["原文链接"] = { text: "点击访问", link: data.url || "https://feishu.cn" };

    // 视频特有字段 (只有当数据里有值时，才往 fields 里塞)
    if (data.up_name) fields["UP主"] = data.up_name;
    if (data.play_count) fields["播放量"] = data.play_count;
    if (data.like_count) fields["点赞"] = data.like_count;
    if (data.coin_count) fields["投币"] = data.coin_count;
    if (data.collect_count) fields["收藏"] = data.collect_count;

    console.log(`🚀 写入数据到表 [${tableId}]... Keys: ${Object.keys(fields)}`);

    const response = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
      { fields },
      { headers: { 'Authorization': `Bearer ${userAccessToken}`, 'Content-Type': 'application/json' } }
    );

    if (response.data.code !== 0) throw new Error(`飞书报错: ${response.data.msg}`);
    return response.data.data;

  } catch (error: any) {
    const msg = error.response?.data?.msg || error.message;
    console.error("❌ 写入失败:", msg);
    throw new Error(msg);
  }
};