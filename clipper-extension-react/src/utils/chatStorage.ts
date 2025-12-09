// 聊天记录本地存储
import type { SummaryType, VideoType, TechDocType } from "../types/index"

// 聊天记录接口
export interface ChatMessage {
  role: string;  // 角色：ai或user
  text: string; // 消息内容
  isLoading?: boolean;
  templateId?: string;  // 模版ID
  structuredData?: SummaryType | VideoType | TechDocType | null; // 完整的结构化信息
  notes?: string; // 用户感想
}

// 对话接口
export interface Conversation {
  id: string;   // 对话唯一ID
  title: string; // 对话标题-->在历史记录中显示
  messages: ChatMessage[];  // 消息列表
  timestamp: number; // 最后更新时间
  isActive?: boolean; // 是否为当前活跃的对话
  url?: string; // 完整的页面URL
}


//  聊天存储服务类
export class ChatStorage {
  private static readonly PREFIX = 'chat_history_'; // 本地存储键的前缀

  //  从URL中提取主机名作为存储键
  private static getStorageKey(url: string): string | null {
    if (!url) return null;
    try {
      // 尝试将url解析为完整的URL，提取主机名
      const parsedUrl = new URL(url);
      return `${this.PREFIX}${parsedUrl.hostname}`;
    } catch (error) {
      // 如果解析失败，假设url已经是主机名
      console.error('无效的URL，假设是主机名:', error);
      return `${this.PREFIX}${url}`;
    }
  }

  // 根据传入的url，获取对话列表--> 获取某个网站的所有对话记录
  public static getConversationList(url: string):Conversation[] {
    const key = this.getStorageKey(url);
    if (!key) return [];

    try {
      const data = localStorage.getItem(key);
      if(data) {
        return JSON.parse(data) as Conversation[];
      }
    } catch (error) {
      console.error('获取对话列表失败:', error);
      return [];
    }
    return [];
  }

  // 获取特定对话 --> 用于重命名对话时，根据对话ID获取对话对象
  public static getConversation(url: string, conversationId: string): Conversation | null { 
    const conversations = this.getConversationList(url);
    return conversations.find(conversation => conversation.id === conversationId) || null;
  }

  // 创建新对话
  public static createConversation(url: string): Conversation { 
    const conversations = this.getConversationList(url);
    const newConversation: Conversation = {
      id: `conversation-${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      title: '未命名对话',
      messages: [],
      timestamp: Date.now(),
      isActive: true,
      url: url, // 存储完整的页面URL-->可以点击跳转到创建该对话的页面
    }

    conversations.unshift(newConversation);
    this.saveConversations(url, conversations)
    return newConversation;
  }

  // 保存对话列表
  private static saveConversations(url: string, conversations: Conversation[]):void {
    const key = this.getStorageKey(url);
    if (!key) return;
    
    try {
      localStorage.setItem(key, JSON.stringify(conversations));
    } catch (error) {
      console.error('保存对话列表失败:', error);
    }
  }

  // 更新对话
  public static updateConversation(url: string, updatedConversation: Conversation): void {
    const conversations = this.getConversationList(url);
    const index = conversations.findIndex(conv => conv.id === updatedConversation.id);
    if (index !== -1) {
      // 更新时间戳
      updatedConversation.timestamp = Date.now();
      conversations[index] = updatedConversation;
      this.saveConversations(url, conversations);
    }
  }

  // 更新对话消息
  public static updateConversationMessages(url: string, conversationId: string, messages: ChatMessage[]): void {
    const conversation = this.getConversation(url, conversationId);
    if (conversation) {
      conversation.messages = messages;
      conversation.timestamp = Date.now();
      // 如果没有标题，使用第一条消息作为标题
      if (conversation.title === '未命名对话' && messages.length > 0) {
        const firstMessage = messages.find(msg => msg.role === 'user') || messages[0];
        conversation.title = firstMessage.text.substring(0, 20) + (firstMessage.text.length > 20 ? '...' : '');
      }
      this.updateConversation(url, conversation);
    }
  }

  // 删除对话
  public static deleteConversation(url: string, conversationId: string): void {
    let conversations = this.getConversationList(url);
    conversations = conversations.filter(conversation => conversation.id !== conversationId);
    this.saveConversations(url, conversations);
  }

  // 保存聊天记录到LocalStorage (兼容旧版，现在使用对话列表)
  public static saveChatHistory(url: string, history: ChatMessage[]): void {
    const conversations = this.getConversationList(url);
    if (conversations.length > 0) {
      // 更新第一个对话的消息
      const firstConversation = conversations[0];
      this.updateConversationMessages(url, firstConversation.id, history);
    } else {
      // 如果没有对话，创建一个新对话
      this.createConversation(url);
      if (history.length > 1) {
        const newConversation = this.getConversationList(url)[0];
        this.updateConversationMessages(url, newConversation.id, history);
      }
    }
  }

  // 从LocalStorage获取聊天记录 (兼容旧版，获取第一个对话的消息)
  public static getChatHistory(url: string): ChatMessage[] {
    const conversations = this.getConversationList(url);
    return conversations.length > 0 ? conversations[0].messages : [];
  }

  // 清除特定网站的聊天记录
  public static clearChatHistory(url: string): void {
    const key = this.getStorageKey(url);
    if (!key) return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('清除聊天记录失败:', error);
    }
  }

  // 清除所有聊天记录
  public static clearAllChatHistory(): void {
    try {
      // 获取所有以chat_history_开头的键
      const keysToRemove = Object.keys(localStorage)
        .filter(key => key.startsWith(this.PREFIX));
      
      // 批量删除
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('清除所有聊天记录失败:', error);
    }
  }

  // 获取所有存储的聊天记录（用于调试或管理）
  public static getAllChatHistory(): Record<string, Conversation[]> {
    const allHistory: Record<string, Conversation[]> = {};
    
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.PREFIX))
        .forEach(key => {
          const history = localStorage.getItem(key);
          if (history) {
            const hostname = key.replace(this.PREFIX, '');
            allHistory[hostname] = JSON.parse(history);
          }
        });
    } catch (error) {
      console.error('获取所有聊天记录失败:', error);
    }
    
    return allHistory;
  }

  // 获取所有对话（不按URL分组）
  public static getAllConversations(): Array<Conversation & { url: string }> {
    const allHistory = this.getAllChatHistory();
    const allConversations: Array<Conversation & { url: string }> = [];
    
    // 将所有URL的对话合并为一个扁平数组，并添加所属网站的URL信息
    Object.entries(allHistory).forEach(([urlKey, conversations]) => {
      conversations.forEach(conv => {
        // 优先使用对话对象中存储的完整URL，如果没有则使用从localStorage键中提取的URL
        const fullUrl = conv.url || urlKey;
        allConversations.push({ ...conv, url: fullUrl });
      });
    });
    
    // 按时间戳排序，最新的对话排在前面
    return allConversations.sort((a, b) => b.timestamp - a.timestamp);
  }

  // 根据对话ID查找对话所属的URL
  public static findConversationUrl(conversationId: string): string | null {
    try {
      // 获取所有存储键
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.PREFIX));
      
      // 遍历所有存储键
      for (const key of keys) {
        const data = localStorage.getItem(key);
        if (data) {
          const conversations = JSON.parse(data) as Conversation[];
          if (conversations.some(conv => conv.id === conversationId)) {
            // 返回主机名
            return key.replace(this.PREFIX, '');
          }
        }
      }
    } catch (error) {
      console.error('查找对话所属的URL失败:', error);
    }
    
    return null;
  }
}
