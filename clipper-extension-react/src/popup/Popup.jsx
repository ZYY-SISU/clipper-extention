import React from 'react';

function Popup() {
  const openSidePanel = () => {
    // 提示用户 Side Panel 已经准备就绪
    // 注意：Chrome 扩展限制，Side Panel 通常需要用户在浏览器侧边栏手动打开，
    // 或者通过 chrome.sidePanel.setOptions 设置（需要 Background 支持）
    window.close(); // 关闭 popup
  };

  return (
    <div style={{ width: '200px', padding: '16px', textAlign: 'center' }}>
      <h3>AI 剪藏助手</h3>
      <p>点击浏览器侧边栏图标即可使用</p>
    </div>
  );
}

export default Popup;