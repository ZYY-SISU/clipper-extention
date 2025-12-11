# 自动推荐模板功能说明

## 功能概述
根据网页类型和内容特征,自动推荐最适合的剪藏模板,并在模板上显示"推荐"标签。

## 实现细节

### 1. 检测逻辑 (detectTemplateRecommendation)
位置: `clipper-extension-react/src/sidepanel/SidePanel.tsx` 行 18-76

#### 视频类型检测
- **域名匹配**: bilibili.com, youtube.com, youku.com, iqiyi.com, v.qq.com
- **文本关键词**: 播放量, 弹幕, up主, 订阅, 频道, video, b站
- **推荐模板**: `video-summary`

#### 音乐类型检测
- **域名匹配**: y.qq.com, music.163.com, kugou.com, kuwo.cn, spotify.com, music.apple.com
- **文本关键词**: 歌单, 曲目, 播放列表, tracklist, album, music
- **推荐模板**: `music-collection`

#### 技术文档检测
- **域名匹配**: developer.*, docs.*, dev.*, api.*, learn.microsoft.com, developer.mozilla.org, cloud.tencent.com
- **文本关键词**: api, 请求参数, response, 返回值, 示例代码, 技术文档, endpoint, sdk
- **推荐模板**: `tech-doc`

#### 默认模板
- **兜底方案**: 如果不匹配以上任何类型,推荐 `summary` 模板

### 2. 状态管理
位置: `clipper-extension-react/src/sidepanel/SidePanel.tsx` 行 122-126

```typescript
const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
const [recommendedTemplateId, setRecommendedTemplateId] = useState<string | null>(null);
const [isTemplateLockedByUser, setIsTemplateLockedByUser] = useState(false);
const [clipPayload, setClipPayload] = useState<ClipContentPayload | null>(null);
```

- `recommendedTemplateId`: 系统推荐的模板 ID
- `isTemplateLockedByUser`: 用户是否手动选择了模板 (防止自动覆盖用户选择)
- `clipPayload`: 完整的剪藏内容数据 (用于检测网页类型)

### 3. 自动推荐触发 (useEffect)
位置: `clipper-extension-react/src/sidepanel/SidePanel.tsx` 行 237-251

```typescript
useEffect(() => {
  if (!clipPayload || templates.length === 0) {
    setRecommendedTemplateId(null);
    return;
  }

  const nextRecommendation = detectTemplateRecommendation(clipPayload, templates);
  setRecommendedTemplateId(nextRecommendation);

  // 如果用户没有手动选择模板，则自动应用推荐
  if (!isTemplateLockedByUser && nextRecommendation && nextRecommendation !== selectedTemplateId) {
    setSelectedTemplateId(nextRecommendation);
  }
}, [clipPayload, templates, isTemplateLockedByUser, selectedTemplateId]);
```

**触发条件**:
- 剪藏内容更新 (clipPayload 变化)
- 模板列表加载完成 (templates 变化)
- 用户选择锁定状态变化

### 4. 用户交互逻辑
位置: `clipper-extension-react/src/sidepanel/SidePanel.tsx` 行 1422-1428

```typescript
onClick={() => {
  setSelectedTemplateId(tpl.id);
  setIsTemplateLockedByUser(true); // 🔒 锁定用户选择
}}
```

**行为说明**:
- 用户点击模板时,立即锁定选择
- 新的剪藏内容到达时,解锁状态 (允许重新推荐)

### 5. UI 显示
位置: `clipper-extension-react/src/sidepanel/SidePanel.tsx` 行 1420-1433

```typescript
const isRecommended = tpl.id === recommendedTemplateId;
return (
  <div className={`template-card ${selectedTemplateId===tpl.id ? 'active' : ''}`}>
    <Icon size={20} /> 
    <span>{getTemplateName(tpl)}</span>
    {isRecommended && <span className="template-badge">推荐</span>}
  </div>
);
```

**样式**: `.template-badge` 定义在 `SidePanel.css` 行 642

### 6. 数据流
```
用户触发剪藏
    ↓
content script 发送 CLIP_CONTENT_UPDATED 消息
    ↓
handleClipContentUpdate 接收 payload
    ↓
setClipPayload(payload) + setIsTemplateLockedByUser(false)
    ↓
useEffect 监听到 clipPayload 变化
    ↓
detectTemplateRecommendation() 分析网页类型
    ↓
setRecommendedTemplateId() 更新推荐
    ↓
如果未锁定,自动 setSelectedTemplateId()
    ↓
UI 显示"推荐"标签 + 自动选中模板
```

## 测试场景

### 场景 1: B站视频推荐
1. 访问 https://www.bilibili.com/video/BV1xx411c7mD
2. 触发剪藏
3. **预期**: 自动推荐并选中 `video-summary` 模板,显示"推荐"标签

### 场景 2: 网易云音乐推荐
1. 访问 https://music.163.com/#/playlist?id=12345
2. 触发剪藏
3. **预期**: 自动推荐并选中 `music-collection` 模板,显示"推荐"标签

### 场景 3: 技术文档推荐
1. 访问 https://developer.mozilla.org/zh-CN/docs/Web/API
2. 触发剪藏
3. **预期**: 自动推荐并选中 `tech-doc` 模板,显示"推荐"标签

### 场景 4: 用户手动选择
1. 自动推荐显示 `video-summary`
2. 用户点击切换到 `summary` 模板
3. **预期**: 保持用户选择,不自动切换回推荐模板

### 场景 5: 新内容到达
1. 用户在 B站 手动选择了 `summary` (锁定)
2. 剪藏新内容 (比如切换到另一个视频)
3. **预期**: 解锁状态,重新推荐 `video-summary`

## 代码提交信息
- Commit: [待提交]
- 分支: dev
- 相关文件:
  - `clipper-extension-react/src/sidepanel/SidePanel.tsx`
  - `clipper-extension-react/src/sidepanel/SidePanel.css` (已有 .template-badge 样式)

## 历史记录
- 初始实现: commit 4491a1b / 26548aa
- 丢失时间: 合并 dev 分支时使用 `--ours` 解决冲突
- 恢复时间: [当前会话]
- 恢复方法: 参考原始 commit 逻辑,重新实现完整功能
