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
    console.log("摘要表格ID:", table1Id);
    console.log("视频表格ID:", table2Id);

    // 🟢 返回映射表：告诉前端哪个模版用哪个ID
    return {
      appToken: appToken,
      tables: {
        "summary": table1Id,  // 摘要模版 -> 表1
        "video-summary": table2Id, // 视频模版 -> 表2
        "default": table1Id   // 兜底
      }
    };

  } catch (error: any) {
    console.error("❌ 初始化流程中断:", error.message);
    throw new Error("无法自动创建飞书表格");
  }
};

// 获取飞书表的字段列表
export const getTableFields = async (appToken: string, tableId: string, accessToken: string) => {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`;

  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (res.data.code !== 0) throw new Error(res.data.msg);

  return res.data.data.items.map((f: any) => f.field_name);
};

// 写入记录 (智能判断字段)
export const addRecord = async (data: FeishuData, options: SaveOptions) => {
  const { userAccessToken, appToken, tableId } = options;
  
  if (!userAccessToken || !appToken || !tableId) throw new Error("配置缺失");

  try {

    //  1. 获取飞书表实际允许的字段名
    const validFields = await getTableFields(appToken, tableId, userAccessToken);

    //  2. 根据数据组装候选字段（可能包含飞书表没有的列）
    const candidateFields: any = {};

    
    if (data.title) candidateFields["标题"] = data.title;
    if (data.summary) candidateFields["摘要"] = data.summary;
    if (data.sentiment) candidateFields["情感"] = data.sentiment;

    candidateFields["标签"] = Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "");
    candidateFields["原文链接"] = { text: "点击访问", link: data.url || "" };

    // 视频字段
    if (data.up_name) candidateFields["UP主"] = data.up_name;
    if (data.play_count) candidateFields["播放量"] = data.play_count;
    if (data.like_count) candidateFields["点赞"] = data.like_count;
    if (data.coin_count) candidateFields["投币"] = data.coin_count;
    if (data.collect_count) candidateFields["收藏"] = data.collect_count;

    console.log(`🚀 候选字段 [${tableId}]... Keys: ${Object.keys(candidateFields)}`);

     // 🟢 3. 只保留飞书表中真正存在的字段
    const fields = Object.fromEntries(
      Object.entries(candidateFields).filter(([key]) => validFields.includes(key))
    );

    console.log(`🚀 写入数据到表 [${tableId}]... 发送字段: ${Object.keys(fields)}`);

    // 🟢 4. 写入飞书表
    const response = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
      { fields },
      { headers: { Authorization: `Bearer ${userAccessToken}` } }
    );

    if (response.data.code !== 0) throw new Error(`飞书报错: ${response.data.msg}`);
    return response.data.data;

  } catch (error: any) {
    const msg = error.response?.data?.msg || error.message;
    console.error("❌ 写入失败:", msg);
    throw new Error(msg);
  }
};