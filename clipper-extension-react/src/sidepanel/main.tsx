import React from 'react'
import ReactDOM from 'react-dom/client'
import Popup from './SidePanel'

window.addEventListener('keydown', (event) => {
  if (event.altKey && (event.key === 's' || event.key === 'S')) {
    event.preventDefault();
    chrome.runtime.sendMessage({ type: 'TOGGLE_PANEL' }).catch(() => {});
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[SidePanel] 找不到 root 元素！');
} else {
  console.log('[SidePanel] 开始渲染组件...');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>,
  );
}

