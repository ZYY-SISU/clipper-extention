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
 * 核心方法：写入多维表格
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