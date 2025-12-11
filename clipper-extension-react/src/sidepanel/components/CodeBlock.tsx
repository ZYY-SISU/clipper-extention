import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// 🎨 引入两套主题
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
  theme?: 'light' | 'dark'; // 🟢 新增：接收主题参数
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value, theme = 'light' }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  // 🟢 根据 theme 选择高亮样式对象
  const highlightStyle = theme === 'dark' ? vscDarkPlus : oneLight;

  return (
    // 外层容器：添加 theme 类名，方便 CSS 控制边框颜色
    <div className={`code-block-wrapper ${theme}`}>
      
      {/* 顶部栏：显示语言 + 复制按钮 */}
      <div className="code-block-header">
        <div className="code-lang-tag">
          {/* 这里可以加个小圆点装饰，像 Mac 窗口 */}
          <span className="mac-dot red"></span>
          <span className="mac-dot yellow"></span>
          <span className="mac-dot green"></span>
          <span className="lang-name">{language || 'text'}</span>
        </div>
        
        {/* 🟢 修改 1: 添加动态类名 ${isCopied ? 'copied' : ''} */}
        <button 
          className={`code-copy-btn ${isCopied ? 'copied' : ''}`} 
          onClick={handleCopy}
        >
          {isCopied ? (
            <>
              {/* 🟢 修改 2: size 改为 11 (更精致) */}
              <Check size={11} className="text-green-400" />
              <span></span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span></span>
            </>
          )}
        </button>
      </div>

      {/* 代码高亮区域 */}
      <div className="code-block-content">
        <SyntaxHighlighter
          language={language}
          style={highlightStyle}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '16px',
            background: 'transparent', // 背景透明，由 CSS 控制容器背景
            fontSize: '13px',
            lineHeight: '1.6',
            fontFamily: '"JetBrains Mono", Consolas, Menlo, monospace',
          }}
          codeTagProps={{
            style: { fontFamily: 'inherit' }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;