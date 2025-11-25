// src/services/feishuService.ts
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// 定义接收的数据结构 (和 aiService 保持一致)
interface FeishuData {
  title: string;
  summary: string;
  tags: string[];
  sentiment: string;
  url: string; // 新增：原文链接
}

/**
 * 内部方法：获取 tenant_access_token
 * 注意：Token 有效期 2 小时，生产环境通常需要缓存 Token。
 * 这里为了 MVP 简单清晰，我们每次请求都获取一次。
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
export const addRecord = async (data: FeishuData) => {
  const appToken = process.env.FEISHU_APP_TOKEN;
  const tableId = process.env.FEISHU_TABLE_ID;

  if (!appToken || !tableId) {
    throw new Error("缺少飞书表格 Token 或 Table ID 配置");
  }

  try {
    // 1. 拿钥匙
    const token = await getTenantAccessToken();

    // 2. 组装数据
    // ⚠️ 请确保这里的 Key ("标题", "摘要"...) 和你飞书表格里的列名完全一致
    const fields = {
      "标题": data.title,
      "摘要": data.summary,
      "情感": data.sentiment,
      "标签": data.tags.join(", "), 
      "原文链接": { text: "点击访问", link: data.url }
    };

    // 3. 写入数据
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
    
    const response = await axios.post(
      url,
      { fields },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`写入飞书失败: ${response.data.msg}`);
    }

    console.log("✅ 飞书写入成功！record_id:", response.data.data.record.record_id);
    return response.data.data;

  } catch (error: any) {
    console.error("飞书 Service 错误:", error.response?.data || error.message);
    throw new Error("同步飞书失败");
  }
};