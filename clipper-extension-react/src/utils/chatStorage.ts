// 聊天记录本地存储

// 聊天记录接口
export interface ChatMessage {
  role: string;
  text: string;
  isLoading?: boolean;
}


//  聊天存储服务类
export class ChatStorage {
  private static readonly PREFIX = 'chat_history_';

  //  从URL中提取主机名作为存储键
  private static getStorageKey(url: string): string | null {
    if (!url) return null;
    try {
      const hostname = new URL(url).hostname;
      return `${this.PREFIX}${hostname}`;
    } catch (error) {
      console.error('无效的URL:', error);
      return null;
    }
  }

  // 保存聊天记录到LocalStorage
  public static saveChatHistory(url: string, history: ChatMessage[]): void {
    const key = this.getStorageKey(url);
    if (!key) return;
    
    try {
      localStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.error('保存聊天记录失败:', error);
    }
  }

  // 从LocalStorage获取聊天记录
  public static getChatHistory(url: string): ChatMessage[] {
    const key = this.getStorageKey(url);
    if (!key) return [];
    
    try {
      const history = localStorage.getItem(key);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('获取聊天记录失败:', error);
      return [];
    }
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
  public static getAllChatHistory(): Record<string, ChatMessage[]> {
    const allHistory: Record<string, ChatMessage[]> = {};
    
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
}
