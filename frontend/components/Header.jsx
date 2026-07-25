import React from 'react';
import styles from '../styles/components.module.css';

export default function Header({ layout, setLayout, wordCount, lineCount }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoRing}></div>
          <div className={styles.logoDot}></div>
        </div>

        {/* Series Title */}
        <h1 className={styles.seriesTitle}>Nightjar Signal</h1>

        {/* Meta Pill */}
        <span className={styles.metaPill}>S2 · AUDIO DRAMA</span>
      </div>

      {/* Center: Layout Switch */}
      <div className={styles.headerCenter}>
        <div className={styles.layoutSwitch}>
          <button
            className={`${styles.layoutButton} ${layout === 'studio' ? styles.active : ''}`}
            onClick={() => setLayout('studio')}
          >
            Studio
          </button>
          <button
            className={`${styles.layoutButton} ${layout === 'focus' ? styles.active : ''}`}
            onClick={() => setLayout('focus')}
          >
            Focus
          </button>
          <button
            className={`${styles.layoutButton} ${layout === 'table-read' ? styles.active : ''}`}
            onClick={() => setLayout('table-read')}
          >
            Table Read
          </button>
        </div>
      </div>

      {/* Right: Stats & Share */}
      <div className={styles.headerRight}>
        <div className={styles.wordCount}>
          {wordCount || 0} words · {lineCount || 0} lines
        </div>

        <div className={styles.avatarStack}>
          <div className={styles.avatar}>S</div>
          <div className={styles.avatar} style={{ backgroundColor: '#4f6b52' }}>
            J
          </div>
        </div>

        <button className={styles.shareButton}>Share</button>
      </div>
    </header>
  );
}
