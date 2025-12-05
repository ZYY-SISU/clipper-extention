import React from 'react'
import ReactDOM from 'react-dom/client'
import Popup from './SidePanel'

window.addEventListener('keydown', (event) => {
  if (event.altKey && (event.key === 's' || event.key === 'S')) {
    event.preventDefault();
    chrome.runtime.sendMessage({ type: 'TOGGLE_PANEL' }).catch(() => {});
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)

