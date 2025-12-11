import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import type { TechDocType } from '../../types/index';
import { StickyNote } from 'lucide-react';

// 定义技术文档结果的数据类型
interface TechDocResultProps {
  data: TechDocType;
  notes?: string;
  expandedNotes?: Set<number>;
  editingNoteIndex?: number | null;
  noteInput?: string;
  onNoteChange?: (value: string) => void;
  onSaveNote?: () => void;
  onCancelNote?: () => void;
  messageIndex?: number;
}

const TechDocResult: React.FC<TechDocResultProps> = ({
  data,
  notes,
  expandedNotes,
  editingNoteIndex,
  noteInput,
  onNoteChange,
  onSaveNote,
  onCancelNote,
  messageIndex = 0
}) => {
  // 提供默认值
  const docData = {
    title: data.title || '技术文档',
    description: data.description || '',
    category: data.category || '',
    mainSections: data.mainSections || [],
    parameters: data.parameters || [],
    returns: data.returns || '',
    examples: data.examples || [],
    keyPoints: data.keyPoints || [],
    relatedLinks: data.relatedLinks || [],
    tags: data.tags || []
  };

  return (
    <div className="tech-doc-result-container">
      {/* 文档标题和描述 */}
      <div className="tech-doc-header">
        <h1 className="tech-doc-title">{String(docData.title)}</h1>
        <p className="tech-doc-description">{String(docData.description)}</p>
        <div className="tech-doc-meta">
          <span className="tech-doc-category">{String(docData.category)}</span>
          <div className="tech-doc-tags">
            {docData.tags.map((tag, index) => (
              <span key={index} className="tech-doc-tag">{String(tag)}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 主要章节 */}
      {docData.mainSections.length > 0 && (
        <div className="tech-doc-section">
          <h2 className="tech-doc-section-title">主要章节</h2>
          <div className="tech-doc-section-list">
            {docData.mainSections.map((section, index) => {
              const sectionText = typeof section === 'string' ? section : String(section);
              return (
                <span key={index} className="tech-doc-section-item">{sectionText}</span>
              );
            })}
          </div>
        </div>
      )}

      {/* 参数列表 */}
      {docData.parameters.length > 0 && (
        <div className="tech-doc-section">
          <h2 className="tech-doc-section-title">参数</h2>
          <div className="tech-doc-table-container">
            <table className="tech-doc-table">
              <thead>
                <tr>
                  <th>参数名</th>
                  <th>类型</th>
                  <th>描述</th>
                  <th>必填</th>
                  <th>默认值</th>
                </tr>
              </thead>
              <tbody>
                {docData.parameters.map((param, index) => (
                  <tr key={index}>
                    <td className="tech-doc-param-name">{String(param.name)}</td>
                    <td className="tech-doc-param-type">{String(param.type)}</td>
                    <td className="tech-doc-param-desc">{String(param.description)}</td>
                    <td className="tech-doc-param-required">
                      {param.required ? (
                        <span className="tech-doc-required">必填</span>
                      ) : (
                        <span className="tech-doc-optional">可选</span>
                      )}
                    </td>
                    <td className="tech-doc-param-default">{String(param.default || '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 返回值 */}
      {docData.returns && (
        <div className="tech-doc-section">
          <h2 className="tech-doc-section-title">返回值</h2>
          <div className="tech-doc-returns">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{String(docData.returns)}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* 关键点 */}
      {docData.keyPoints.length > 0 && (
        <div className="tech-doc-section">
          <h2 className="tech-doc-section-title">关键点</h2>
          <ul className="tech-doc-key-points">
            {docData.keyPoints.map((point, index) => (
              <li key={index} className="tech-doc-key-point">{String(point)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 示例代码 */}
      {docData.examples.length > 0 && (
        <div className="tech-doc-section">
          <h2 className="tech-doc-section-title">示例代码</h2>
          {docData.examples.map((example, index) => {
            const code = typeof example === 'object' && example !== null && 'code' in example ? example.code : example;
            const lang = typeof example === 'object' && example !== null && 'lang' in example ? example.lang : 'javascript';
            return (
              <div key={index} className="tech-doc-example">
                <pre className="tech-doc-code-block">
                  <code className={`language-${lang}`}>{code}</code>
                </pre>
              </div>
            );
          })}
        </div>
      )}

      {/* 相关链接 */}
      {docData.relatedLinks.length > 0 && (
        <div className="tech-doc-section">
          <h2 className="tech-doc-section-title">相关链接</h2>
          <ul className="tech-doc-related-links">
            {docData.relatedLinks.map((link, index) => {
              const href = typeof link === 'object' && link !== null && 'url' in link ? link.url : link;
              const linkText = typeof link === 'object' && link !== null && 'title' in link ? link.title : href;
              return (
                <li key={index} className="tech-doc-related-link-item">
                  <a href={href} target="_blank" rel="noopener noreferrer">{linkText}</a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 感想显示区域 */}
      {notes && (
        <div className="tech-doc-notes">
          <div className="tech-doc-notes-header">
            <div className="tech-doc-notes-title">
              <StickyNote size={14} />
              <span>我的感想</span>
            </div>
            {notes.length > 100 && expandedNotes && (
              <button className="tech-doc-notes-expand">
                {expandedNotes.has(messageIndex) ? '收起' : '展开'}
              </button>
            )}
          </div>
          <div className="tech-doc-notes-content">
            {notes.length > 100 && expandedNotes && !expandedNotes.has(messageIndex)
              ? notes.substring(0, 100) + '...'
              : notes}
          </div>
        </div>
      )}

      {/* 感想编辑框 */}
      {editingNoteIndex === messageIndex && (
        <div className="tech-doc-notes-edit">
          <textarea
            value={noteInput || ''}
            onChange={(e) => onNoteChange?.(e.target.value)}
            placeholder="写下你的感想..."
            className="tech-doc-notes-textarea"
          />
          <div className="tech-doc-notes-edit-actions">
            <button onClick={onCancelNote} className="tech-doc-notes-cancel">取消</button>
            <button onClick={onSaveNote} className="tech-doc-notes-save">保存</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechDocResult;
