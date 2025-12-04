// src/defaultTemplates.ts

import { TemplateConfig } from './types';

export const DEFAULT_TEMPLATES: TemplateConfig[] = [
  { 
    id: 'summary', 
    name: '智能摘要', 
    iconType: 'text', 
    description: '生成简短的摘要和标签',
    systemPrompt: '你是一个专业的摘要助手。请把用户的内容总结为 JSON 格式，包含 title(标题), summary(摘要), tags(标签数组)。不要输出 markdown 标记。'
  },
  { 
    id: 'table', 
    name: '数据表格', 
    iconType: 'table',
    description: '提取关键数据整理为表格',
    systemPrompt: '你是一个数据分析师。请提取内容中的关键数据，整理为 columns(列名数组) 和 data(行数据数组) 的 JSON 格式。'
  },
  { 
    id: 'list', 
    name: '待办清单', 
    iconType: 'check', 
    description: '提取行动项',
    systemPrompt: '你是一个待办事项整理员。请提取内容为 checkItems 数组，每项包含 text(内容) 和 checked(false)。返回 JSON。'
  },
  {
    id:'video-summary',
    name:'视频摘要',
    iconType:'Video',
    description: '提取视频UP主、三连数据及摘要',
    systemPrompt: `你是一个视频数据分析助手。
    请分析用户提供的网页文本（通常来自B站或YouTube），精准提取以下关键指标，并以严格的 JSON 格式返回：

    1. title: 视频标题
    2. summary: 视频简介或内容摘要 (80字以内)
    3. up_name: UP主/创作者名字
    4. play_count: 播放量 (例如 "10万+" 或 "2300")
    5. like_count: 点赞量
    6. coin_count: 投币量 (如果没有则返回 "0")
    7. collect_count: 收藏量 (如果没有则返回 "0")
    8. tags: 视频标签 (数组，提取3-5个)
    9. sentiment: 视频或评论区的整体情感氛围 (positive/neutral/negative)

    注意：
    - 如果找不到某个具体数字，请返回 "0" 或 "N/A"，不要编造。
    - 只返回 JSON 字符串，不要包含 Markdown 标记。`
  }

];