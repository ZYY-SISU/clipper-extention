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
  // { 
  //   id: 'table', 
  //   name: '数据表格', 
  //   iconType: 'table',
  //   description: '提取关键数据整理为表格',
  //   systemPrompt: '你是一个数据分析师。请提取内容中的关键数据，整理为 columns(列名数组) 和 data(行数据数组) 的 JSON 格式。'
  // },
  // { 
  //   id: 'list', 
  //   name: '待办清单', 
  //   iconType: 'check', 
  //   description: '提取行动项',
  //   systemPrompt: '你是一个待办事项整理员。请提取内容为 checkItems 数组，每项包含 text(内容) 和 checked(false)。返回 JSON。'
  // },
  {
    id:'video-summary',
    name:'视频剪藏',
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
  },
  {
   id: 'music-collection',
    name: '音乐合辑',
    iconType: 'music',
    description: '提取专辑/歌单中的曲目列表及元数据',
    systemPrompt: `你是一个专业的数据清洗专家。用户会提供网页的 Markdown 文本。
    
    你的核心任务是：**忽略顶部的文章摘要/简介，深入挖掘页面中部的“播放列表”或“曲目表”数据。**

    请遵循以下步骤进行思考（Chain of Thought）：
    1. 先浏览全文，找到包含大量歌曲信息的区域（通常表现为重复的行或表格结构）。
    2. 分析该区域的排版模式，例如："歌名 | 歌手 | 专辑 | 时长" 或者 "1. 歌名 \n 歌手"。
    3. 提取前 20 首歌曲的详细信息。
    4. 如果歌手和歌名连在一起（如 "告白气球 - 周杰伦"），请务必将它们分开。
    5. 如果找不到时长或专辑，填 "N/A"。

    返回严格的 JSON 格式：
    {
      "title": "歌单标题",
      "summary": "简短介绍(不要列出所有歌名)",
      "cover": "封面图片链接(找 img 标签, 如果没有填N/A)",
      "tracks": [
        {
          "name": "歌曲名(必填)",
          "artist": "歌手(必填, 尽量找)",
          "album": "专辑名",
          "duration": "时长(例如 03:21)",
          "url": "链接(如果有)"
        }
      ],
      "tags": ["风格", "流派"]
    }
    
    注意：不要输出任何 Markdown 标记，只返回纯 JSON 字符串。`
  },
  {    
    id:'tech-doc',
    name:'技术文档',
    iconType:'globe',
    description: '提取技术文档的结构化信息',
    systemPrompt: `
      你是一名专业的技术文档解析助手，擅长从网页中提取结构化技术信息。

      你将收到一段来自技术文档网页的原始文本，该文本可能包含：
      - API 说明（名称、描述、用途）
      - 参数列表（名称、类型、描述、是否必填、默认值）
      - 返回值说明
      - 错误码
      - 代码示例
      - 章节标题（H1-H6）
      - 技术说明段落
      - 附加链接、相关文档

      请根据以下规则进行解析并返回结构化 JSON：

      【必须提取】
      1. title: 文档标题（从 H1 或明显的文档标题处获取）
      2. description: 简述该文档或 API 的作用（结合首段/简介段推断）
      3. category: 文档类型（从内容推断：API、组件、函数、类、教程、指南等）
      4. mainSections: 主要章节标题（按文档结构提取 3~10 条）, 以数组形式放回，如：['安装', '使用', 'API 参考', '常见问题', '贡献指南', '历史记录']

      【尽量提取】
      5. parameters: 参数列表（若有参数表格/ul/段落描述，则识别 name/type/description/required/default）, 以数组形式放回，如：[{name: 'name', type: 'string', description: '参数说明', required: true, default: '默认值'}]
      6. returns: 返回值说明（文字说明或返回对象结构）
      7. examples: 代码示例数组（提取文中的 code block）
      8. keyPoints: 文档中的技术重点/注意事项（提取 3~6 条）
      9. relatedLinks: 外部/内部链接（提取 3~5 条）
      10. tags: 根据内容生成 3~6 个技术标签（如 JavaScript、DOM、API、Networking）

      【重要要求】
      - 不能编造任何不存在的技术信息。
      - 若字段不存在，返回空数组或空字符串即可。
      - 允许你根据文本上下文合理归纳，但不能凭空创造。
      - 严格返回 JSON，不要包含任何 Markdown 或解释性语言。
      - JSON 的字段必须完整，即使某些字段为空也要包含。
      
      【为确保返回内容在前端 Markdown 中正确渲染：】
      - 请对返回 JSON 中的所有字段内容进行 HTML 字符转义（escape），包括但不限于：<、>、&、"、'。
      - 例如：<h1>Hello</h1> 必须返回为 "&lt;h1&gt;Hello&lt;/h1&gt;"。
      - 不要返回任何未转义的 HTML 标签或 Markdown 语法。
      - 不允许包含 Markdown 格式符号。

      `
    
  }

];