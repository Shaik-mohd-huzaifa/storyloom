import { useState, useRef, useEffect } from 'react';
import styles from '../styles/layout.module.css';

export default function Home() {
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const dividerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = containerRect.right - e.clientX;

        if (newWidth > 250 && newWidth < 600) {
          setRightPanelWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isResizing]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Storyloom</h1>
          <div className={styles.headerMeta}>
            Untitled Story
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className={styles.mainLayout} ref={containerRef}>
        {/* Sidebar Left */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <div className={styles.sidebarTitle}>Stories</div>
            <div className={styles.sidebarItem}>New Story</div>
            <div className={styles.sidebarItem}>My Stories</div>
            <div className={styles.sidebarItem}>Saved Drafts</div>
          </div>
          <div className={styles.sidebarSection}>
            <div className={styles.sidebarTitle}>Tools</div>
            <div className={styles.sidebarItem}>Templates</div>
            <div className={styles.sidebarItem}>Settings</div>
          </div>
        </div>

        {/* Divider between left sidebar and content */}
        <div className={styles.dividerVertical}></div>

        {/* Main Content Area */}
        <div className={styles.contentArea}>
          <div className={styles.editor}>
            <div className={styles.editorHeader}>
              <span>editor.md</span>
              <div className={styles.editorTabs}>
                <span className={styles.tab + ' ' + styles.activeTab}>Untitled</span>
              </div>
            </div>

            <textarea
              className={styles.textarea}
              placeholder="Start typing your story here...&#10;&#10;This is where your main content goes.&#10;&#10;Features:&#10;• Write and edit your stories&#10;• Get AI suggestions on the right&#10;• Real-time collaboration&#10;&#10;Begin writing now..."
              defaultValue=""
            />
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          className={styles.divider}
          ref={dividerRef}
          onMouseDown={() => setIsResizing(true)}
        />

        {/* Right Panel - Chat/Assistant */}
        <div className={styles.rightPanel} style={{ width: `${rightPanelWidth}px` }}>
          <div className={styles.rightPanelHeader}>
            <span>Assistant</span>
            <span className={styles.closeBtn}>×</span>
          </div>

          <div className={styles.chatMessages}>
            <div className={styles.messageSystem}>
              <p>Storyloom Assistant is ready to help.</p>
            </div>
            <div className={styles.messageBot}>
              <p>Hello! I'm your writing assistant. I can help you brainstorm, refine, and expand your stories.</p>
            </div>
            <div className={styles.messageBot}>
              <p>Share your ideas and I'll provide suggestions to enhance your writing!</p>
            </div>
          </div>

          <div className={styles.rightPanelFooter}>
            <input
              type="text"
              className={styles.chatInput}
              placeholder="Ask for suggestions..."
            />
            <button className={styles.sendBtn}>Send</button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <span>Lines: 1 | Words: 0 | Characters: 0</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
