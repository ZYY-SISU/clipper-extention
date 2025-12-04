//登录授权服务

import axios from 'axios';
import dotenv from 'dotenv';
import { AuthResult } from '../types'; // 🟢 引入类型

dotenv.config();

// 返回的不再只是用户信息，而是包含 token 的大礼包
export const getUserInfo = async (code: string): Promise<AuthResult> => {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  try {
    // 1. 获取 app_access_token (为了去换用户的 token)
    const appTokenRes = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
      { app_id: appId, app_secret: appSecret }
    );
    const appAccessToken = appTokenRes.data.app_access_token;

    // 2. 用前端传来的 code 换取 user_access_token
    const userTokenRes = await axios.post(
      'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token',
      { grant_type: 'authorization_code', code: code },
      { headers: { Authorization: `Bearer ${appAccessToken}` } }
    );

    if (userTokenRes.data.code !== 0) {
      throw new Error(`Auth Failed: ${userTokenRes.data.msg}`);
    }
    
    // 🟢 拿到关键钥匙！
    const { access_token, refresh_token, expires_in } = userTokenRes.data.data;

    // 3. 顺便拿一下用户信息（头像、名字）用于展示
    const userInfoRes = await axios.get(
      'https://open.feishu.cn/open-apis/authen/v1/user_info',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    // 4. 返回组合数据
    return {
      user: userInfoRes.data.data, // 用于前端展示头像
      token: access_token,         // 🟢 用于后续写入表格 (最重要的!)
      // refresh_token,            // 生产环境需要这个来刷新 token，MVP 先忽略
      expiresIn: expires_in
    };

  } catch (error: any) {
    console.error("Login Error:", error.response?.data || error.message);
    throw new Error("飞书登录失败");
  }
};