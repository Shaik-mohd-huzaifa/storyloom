import React, { useState } from 'react';
import styles from '../styles/components.module.css';

function ContinuityHoverCard({ annotation, onClose }) {
  return (
    <div className={styles.continuityHoverCard}>
      <div className={styles.continuityLabel}>{annotation.label}</div>
      <div className={styles.continuityMessage}>{annotation.message}</div>
      <div className={styles.continuityActions}>
        {annotation.actions.map((action, idx) => (
          <button
            key={idx}
            className={`${styles.continuityAction} ${styles[action.type === 'dismiss' ? 'outlined' : 'filled']}`}
            onClick={() => onClose()}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ManuscriptContent({ text, annotations, annotationsVisible, hoverAnnotation, onHoverAnnotation }) {
  // Simple paragraph splitting
  const paragraphs = text.split('\n\n').filter((p) => p.trim());

  // Create a map of annotations by position for quick lookup
  const annotationMap = {};
  if (annotationsVisible) {
    annotations.forEach((ann) => {
      annotationMap[ann.offset] = ann;
    });
  }

  // Process text to inject inline elements
  const renderParagraph = (para, parIndex) => {
    // Split by lines (for scene slugs, dialogue, etc.)
    const lines = para.split('\n');

    return (
      <div key={parIndex} className={styles.manuscriptParagraph}>
        {lines.map((line, lineIndex) => {
          // Detect scene slugs (all caps, short)
          if (line.match(/^[A-Z\s\-]+$/) && line.length < 50 && line.length > 5) {
            return (
              <div key={lineIndex} className={styles.sceneSlug}>
                {line}
              </div>
            );
          }

          // Detect dialogue (name in all caps followed by text)
          if (line.match(/^[A-Z\s]+\n/) || line.match(/^[A-Z\s]+$/)) {
            return (
              <div key={lineIndex}>
                <span className={styles.characterCue}>{line}</span>
              </div>
            );
          }

          // Detect stage directions [SFX: ...] or [...]
          const sfxRegex = /\[SFX:.*?\]/g;
          const parts = line.split(sfxRegex);
          const sfxMatches = line.match(sfxRegex) || [];

          const elements = [];
          let sfxIndex = 0;

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            if (part) {
              elements.push(part);
            }

            if (i < sfxMatches.length) {
              elements.push(<span key={`sfx-${i}`} className={styles.sfxChip}>{sfxMatches[i]}</span>);
            }
          }

          return (
            <div key={lineIndex} className={styles.manuscriptBody}>
              {elements.map((elem, idx) =>
                typeof elem === 'string' ? (
                  <span key={idx}>{elem}</span>
                ) : (
                  elem
                )
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.manuscript}>
      <div className={styles.manuscriptEyebrow}>S2 · AUDIO DRAMA</div>

      <h1 className={styles.manuscriptH1}>Episode 07: Point of No Return</h1>

      <div className={styles.manuscriptByline}>A Nightjar Signal Production</div>

      {paragraphs.map((para, idx) => renderParagraph(para, idx))}

      {/* Continue prompt */}
      <div className={styles.continuePrompt}>
        Continue writing…
        <span className={styles.caret}></span>
      </div>
    </div>
  );
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Canvas({
  activeEp,
  manuscriptText,
  onManuscriptChange,
  lastSaved,
  annotations,
  annotationsVisible,
  onAnnotationsToggle,
  hoverAnnotation,
  onHoverAnnotation,
}) {
  return (
    <main className={styles.canvas}>
      {/* Subheader */}
      <div className={styles.canvasSubheader}>
        <div className={styles.subheaderEpisode}>
          EP {activeEp?.num.toString().padStart(2, '0')} · DRAFT 3
        </div>

        <span className={styles.subheaderDot}>·</span>

        <span style={{ color: 'var(--color-text-muted)' }}>
          saved {formatTimeAgo(lastSaved)}
        </span>

        <div className={styles.subheaderStatus}>
          <button
            className={`${styles.annotationsToggle} ${annotationsVisible ? styles.active : ''}`}
            onClick={onAnnotationsToggle}
          >
            Annotations
          </button>

          <span className={styles.continuityCount}>
            {annotations.length > 0 && `${annotations.length} flag${annotations.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className={styles.scrollContainer}>
        <div className={styles.paper}>
          <ManuscriptContent
            text={manuscriptText}
            annotations={annotations}
            annotationsVisible={annotationsVisible}
            hoverAnnotation={hoverAnnotation}
            onHoverAnnotation={onHoverAnnotation}
          />
        </div>
      </div>
    </main>
  );
}
