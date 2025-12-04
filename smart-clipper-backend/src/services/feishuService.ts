// src/services/feishuService.ts
import axios from 'axios';
import dotenv from 'dotenv';
import { FeishuData, SaveOptions } from '../types';
dotenv.config();

// // 定义接收的数据结构
// interface FeishuData {
//   title: string;
//   summary: string;
//   tags: string[]; // 这里虽然定义为数组，但运行时可能是 undefined
//   sentiment: string;
//   url: string;
//   [key: string]: any; // 允许其他动态字段
// }

/**
 * 内部方法：获取 tenant_access_token
 */
async function getTenantAccessToken(): Promise<string> {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("缺少飞书 AppID 或 Secret 配置");
  }

  try {
    const response = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: appId,
        app_secret: appSecret
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`获取 Token 失败: ${response.data.msg}`);
    }
    return response.data.tenant_access_token;

  } catch (error) {
    console.error("飞书 Auth 错误:", error);
    throw error;
  }
}

/**
 * 核心方法：写入多维表格,添加记录
 */
export const addRecord = async (data: FeishuData, options: SaveOptions) => {
 const { userAccessToken, appToken, tableId } = options;

  if (!userAccessToken || !appToken || !tableId) {
    throw new Error("缺少必要的飞书配置信息 (Token/AppToken/TableId)");
  }

  try {
    // 1. 拿钥匙
    //const token = await getTenantAccessToken();

    // 2. 组装数据 (关键修复：增加安全判断)
    const fields: any = {
      "标题": data.title || "无标题",
      "摘要": data.summary || "无摘要",
      "情感": data.sentiment || "中性",
      // 🟢 修复点：即使 tags 是 undefined，也不会报错
      "标签": Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || ""),
      "原文链接": { 
        text: "点击访问", 
        link: data.url || "https://www.example.com" // 防止 url 为空导致飞书报错
      }
    };

    // 3. 写入数据
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
    
    console.log("🚀 正在写入飞书:", JSON.stringify(fields, null, 2)); // 增加日志，方便看发了什么

    const response = await axios.post(
      url,
      { fields },
      {
        headers: {
          'Authorization': `Bearer ${userAccessToken}`, // 🟢 使用用户身份
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code !== 0) {
      // 飞书返回的详细错误通常在 error.message 或 msg 中
      throw new Error(`写入飞书失败: ${response.data.msg} (LogID: ${response.data.code})`);
    }

    console.log("✅ 飞书写入成功！record_id:", response.data.data.record.record_id);
    return response.data.data;

  } catch (error: any) {
    // 打印更详细的错误信息，如果是 axios 错误，打印 response data
    if (error.response) {
       console.error("飞书 API 响应错误:", JSON.stringify(error.response.data, null, 2));
    } else {
       console.error("飞书 Service 内部错误:", error.message);
    }
    throw new Error("同步飞书失败，请查看后端控制台日志");
  }
};

// 🟢 [新增] 初始化用户的飞书多维表格，创建新表格
export const initUserBase = async (userAccessToken: string) => {
  try {
    // 1. 创建一个新的多维表格应用
    // API 文档: https://open.feishu.cn/document/server-docs/docs/bitable-v1/app/create
    console.log("正在为用户创建多维表格...");
    const createAppRes = await axios.post(
      'https://open.feishu.cn/open-apis/bitable/v1/apps',
      {
        name: "AI 剪藏知识库 (Smart Clipper)", // 表格名字
        folder_token: "" // 空字符串表示创建在根目录
      },
      { headers: { Authorization: `Bearer ${userAccessToken}` } }
    );

    if (createAppRes.data.code !== 0) {
      throw new Error(`创建表格失败: ${createAppRes.data.msg}`);
    }

    const appToken = createAppRes.data.data.app.app_token;
    const defaultTableId = createAppRes.data.data.app.default_table_id;

    console.log(`✅ 表格创建成功: ${appToken}, 默认表: ${defaultTableId}`);

    // 2. 修改默认数据表的名称为 "剪藏历史"
    // 我们复用默认表作为通用剪藏表
   try {
      console.log("🔍 Step 2: 尝试重命名数据表...");
      await axios.put(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${defaultTableId}`,
        { name: "剪藏历史" },
        { headers: { Authorization: `Bearer ${userAccessToken}` } }
      );
      console.log("✅ 重命名成功");
    } catch (e) {
      console.warn("⚠️ 重命名失败 (跳过此步):", e); 
      // 忽略错误，继续执行
    }

    // 3. 为这张表添加字段 (Schema)
    // 注意：飞书新建表默认只有"多行文本"一列，我们需要添加具体的列
    // 这一步比较繁琐，需要依次添加 标题、摘要、标签等
    console.log("🔍 Step 3: 开始初始化字段...");
    const fieldsToAdd = [
      { field_name: "标题", type: 1 }, // 1 = 多行文本
      { field_name: "摘要", type: 1 },
      { field_name: "情感", type: 1 }, 
      { field_name: "标签", type: 1 },
      { field_name: "原文链接", type: 15 } // 15 = 超链接
    ];

    for (const field of fieldsToAdd) {
     try {
        await axios.post(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${defaultTableId}/fields`,
            field,
            { headers: { Authorization: `Bearer ${userAccessToken}` } }
        );
        process.stdout.write("."); // 打印进度点
      } catch (fieldError: any) {
         console.error(`\n❌ 字段 [${field.field_name}] 创建失败:`, fieldError.response?.data || fieldError.message);
         // 如果连字段都创建失败，那这个表可能没法用了，抛出异常
         throw fieldError;
      }
    }
    console.log("\n✅ 所有字段初始化完毕");

    // 返回配置信息
    return {
      appToken: appToken,
      tableId: defaultTableId, // 这里简单起见，所有模版暂时都存这一张表
      // 如果以后每个模版一张表，可以在这里继续 createTable
    };
  
  } catch (error: any) {
    console.error("初始化失败:", error.response?.data || error.message);
    throw new Error("无法自动创建飞书表格，请检查权限");
  }
};