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
  { field_name: "个人感想", type: 1 },
  { field_name: "原文链接", type: 15 },
  { field_name: "图片", type: 1 },       // 🟢 新增：图片列表
  { field_name: "链接", type: 1 },       // 🟢 新增：链接列表
  { field_name: "高亮内容", type: 1 }    // 🟢 新增：高亮文本
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
  { field_name: "个人感想", type: 1 },
  { field_name: "原文链接", type: 15 },
  { field_name: "图片", type: 1 },       // 🟢 新增：图片列表
  { field_name: "链接", type: 1 },       // 🟢 新增：链接列表
  { field_name: "高亮内容", type: 1 }    // 🟢 新增：高亮文本
];

// 音乐表 (新增)
const FIELDS_MUSIC = [
  { field_name: "歌名", type: 1 },
  { field_name: "歌手", type: 1 },
  { field_name: "专辑", type: 1 },
  { field_name: "时长", type: 1 },
  { field_name: "歌曲链接", type: 15 },
  { field_name: "所属歌单", type: 1 }, // 记录这首歌属于哪个歌单
  { field_name: "歌单链接", type: 15 },
  { field_name: "个人感想", type: 1 }
];

// 映射关系
const TABLES_CONFIG = [
  { key: 'summary', name: 'AI剪藏-摘要', fields: FIELDS_SUMMARY },
  { key: 'video-summary', name: 'AI剪藏-视频', fields: FIELDS_VIDEO },
  { key: 'music-collection', name: 'AI剪藏-音乐', fields: FIELDS_MUSIC } // 👈 新增
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

    // 4. 初始化 Table 3 (音乐合辑) 👈 新增
    console.log(`🛠️ 正在创建表3 [音乐合辑]...`);
    const createTable3Res = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`,
        { table: { name: "音乐合辑" } },
        { headers: { Authorization: `Bearer ${userAccessToken}` } }
    );
    const table3Id = createTable3Res.data.data.table_id;
    // 加列
    await addFieldsToTable(userAccessToken, appToken, table3Id, FIELDS_MUSIC);

    console.log("✅ 初始化完成！");
    console.log("摘要表格ID:", table1Id);
    console.log("视频表格ID:", table2Id);
    console.log("音乐表格ID:", table3Id);

    // 🟢 返回映射表：告诉前端哪个模版用哪个ID
    return {
      appToken: appToken,
      tables: {
        "summary": table1Id,  // 摘要模版 -> 表1
        "video-summary": table2Id, // 视频模版 -> 表2
        "music-collection": table3Id, // 音乐模版 -> 表3
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

////////////////////////新修改结构实现单条导入和批量导入//////////////////////////
export const addRecord = async (data: any, options: SaveOptions) => {
  const { userAccessToken, appToken, tableId } = options;
  
  // 🎵 分支逻辑：如果是音乐合集 (有 tracks 数组)，走批量导入
  if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
    return await addBatchMusicRecords(data, options);
  }

  // 📝 默认逻辑：单条导入 (摘要/视频)
  return await addSingleRecord(data, options);
};

// --- 内部辅助函数: 批量导入音乐 ---
async function addBatchMusicRecords(data: any, options: SaveOptions) {
  const { userAccessToken, appToken, tableId } = options;
  console.log(`🚀 [批量] 正在导入 ${data.tracks.length} 首歌曲...`);

  // 1. 获取表头 (为了匹配字段名)
  const fieldsRes = await axios.get(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
    { headers: { Authorization: `Bearer ${userAccessToken}` } }
  );
  const validFields = fieldsRes.data.data.items.map((f: any) => f.field_name);

  // 2. 构建 Records 数组
  const records = data.tracks.map((track: any) => {
    const fields: any = {};
    
    if (validFields.includes("歌名")) fields["歌名"] = track.name;
    if (validFields.includes("歌手")) fields["歌手"] = track.artist;
    if (validFields.includes("专辑")) fields["专辑"] = track.album;
    if (validFields.includes("时长")) fields["时长"] = track.duration;
    if (validFields.includes("个人感想")) fields["个人感想"] = track.notes || data.notes;
    
    if (validFields.includes("歌曲链接")) {
       fields["歌曲链接"] = { text: "播放", link: (track.url && track.url !== 'N/A') ? track.url : data.url };
    }

    // 加上歌单的公共信息
    if (validFields.includes("所属歌单")) fields["所属歌单"] = data.title;
    if (validFields.includes("歌单链接")) fields["歌单链接"] = { text: "歌单页", link: data.url };

    return { fields };
  });

  // 3. 调用飞书批量新增接口 (batch_create)
  // 注意：一次最多 500 条，我们这里一般也就几十条，直接发
  const response = await axios.post(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
    { records: records },
    { headers: { Authorization: `Bearer ${userAccessToken}` } }
  );

  console.log(`✅ 成功导入 ${records.length} 条记录`);
  return response.data;
}

// --- 内部辅助函数: 单条导入 (保持原有逻辑) ---
async function addSingleRecord(data: any, options: SaveOptions) {
  const { userAccessToken, appToken, tableId } = options;

  // 1. 获取当前表的字段列表
  const fieldsRes = await axios.get(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
    { headers: { Authorization: `Bearer ${userAccessToken}` } }
  );
  const validFields = fieldsRes.data.data.items.map((f: any) => f.field_name);

  // 2. 构建数据对象
  const candidateFields: any = {};
  if (data.title) candidateFields["标题"] = data.title;
  if (data.summary) candidateFields["摘要"] = data.summary;
  if (data.sentiment) candidateFields["情感"] = data.sentiment;
  if (data.tags) candidateFields["标签"] = Array.isArray(data.tags) ? data.tags.join(", ") : data.tags;
  if (data.notes) candidateFields["个人感想"] = data.notes;
  candidateFields["原文链接"] = { text: "点击访问", link: data.url || "" };

  // 视频字段
  if (data.up_name) candidateFields["UP主"] = data.up_name;
  if (data.play_count) candidateFields["播放量"] = data.play_count;
  if (data.like_count) candidateFields["点赞"] = data.like_count;
  if (data.coin_count) candidateFields["投币"] = data.coin_count;
  if (data.collect_count) candidateFields["收藏"] = data.collect_count;

  // 🟢 新增字段：图片、链接、高亮内容
  if (data.images && Array.isArray(data.images) && data.images.length > 0) {
    console.log(`📸 检测到 ${data.images.length} 张图片`);
    // 格式化为 URL 列表 (每行一个)
    candidateFields["图片"] = data.images.map((img: any) => img.src).join('\n');
  }
  
  if (data.links && Array.isArray(data.links) && data.links.length > 0) {
    console.log(`🔗 检测到 ${data.links.length} 个链接`);
    // 格式化为 "文本 | URL" 格式 (每行一个)
    candidateFields["链接"] = data.links.map((link: any) => `${link.text} | ${link.href}`).join('\n');
  }
  
  if (data.highlights && Array.isArray(data.highlights) && data.highlights.length > 0) {
    console.log(`✨ 检测到 ${data.highlights.length} 处高亮`);
    // 使用 ||| 分隔符连接所有高亮文本
    candidateFields["高亮内容"] = data.highlights.map((h: any) => h.text).join('|||');
  }

  // 3. 过滤字段
  const fields = Object.fromEntries(
    Object.entries(candidateFields).filter(([key]) => validFields.includes(key))
  );

  // 4. 写入
  const response = await axios.post(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    { fields },
    { headers: { Authorization: `Bearer ${userAccessToken}` } }
  );

  return response.data;
}























// // 写入记录 (智能判断字段)(支持单条和批量)
// export const addRecord = async (data: FeishuData, options: SaveOptions) => {
//   const { userAccessToken, appToken, tableId } = options; 
//   if (!userAccessToken || !appToken || !tableId) throw new Error("配置缺失");
//   try {

//     //  1. 获取飞书表实际允许的字段名
//     const validFields = await getTableFields(appToken, tableId, userAccessToken);

//     //  2. 根据数据组装候选字段（可能包含飞书表没有的列）
//     const candidateFields: any = {};

    
//     if (data.title) candidateFields["标题"] = data.title;
//     if (data.summary) candidateFields["摘要"] = data.summary;
//     if (data.sentiment) candidateFields["情感"] = data.sentiment;

//     candidateFields["标签"] = Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "");
//     candidateFields["原文链接"] = { text: "点击访问", link: data.url || "" };

//     // 视频字段
//     if (data.up_name) candidateFields["UP主"] = data.up_name;
//     if (data.play_count) candidateFields["播放量"] = data.play_count;
//     if (data.like_count) candidateFields["点赞"] = data.like_count;
//     if (data.coin_count) candidateFields["投币"] = data.coin_count;
//     if (data.collect_count) candidateFields["收藏"] = data.collect_count;

//     console.log(`🚀 候选字段 [${tableId}]... Keys: ${Object.keys(candidateFields)}`);

//      // 🟢 3. 只保留飞书表中真正存在的字段
//     const fields = Object.fromEntries(
//       Object.entries(candidateFields).filter(([key]) => validFields.includes(key))
//     );

//     console.log(`🚀 写入数据到表 [${tableId}]... 发送字段: ${Object.keys(fields)}`);

//     // 🟢 4. 写入飞书表
//     const response = await axios.post(
//       `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
//       { fields },
//       { headers: { Authorization: `Bearer ${userAccessToken}` } }
//     );

//     if (response.data.code !== 0) throw new Error(`飞书报错: ${response.data.msg}`);
//     return response.data.data;

//   } catch (error: any) {
//     const msg = error.response?.data?.msg || error.message;
//     console.error("❌ 写入失败:", msg);
//     throw new Error(msg);
//   }
// };