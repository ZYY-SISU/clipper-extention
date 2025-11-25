// public/background.js

// 监听图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 打开侧边栏
  chrome.sidePanel.open({ tabId: tab.id });
});