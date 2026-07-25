import React from 'react';
import styles from '../styles/components.module.css';

const typeColors = {
  character: '#b4532a',
  place: '#4f6b52',
  faction: '#4a5b7a',
  thread: '#7a4a6b',
  event: '#8a6a2a',
  theme: '#6b4a7a',
  object: '#7a5a4a',
};

const typeLabels = {
  character: 'Character',
  place: 'Place',
  faction: 'Faction',
  thread: 'Thread',
  event: 'Event',
  theme: 'Theme',
  object: 'Object',
};

export default function EntityDrawer({ entity, onClose, onAddToChat }) {
  if (!entity) return null;

  return (
    <div
      className={styles.entityDrawer}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className={styles.drawerHeader}>
        <div
          className={styles.drawerAvatarLarge}
          style={{
            backgroundColor: typeColors[entity.kind],
            color: 'white',
          }}
        >
          {entity.avatar}
        </div>

        <div className={styles.drawerInfo}>
          <div className={styles.drawerName}>{entity.name}</div>
          <div className={styles.drawerMeta}>
            {typeLabels[entity.kind]} · {entity.appearances} episodes
          </div>
        </div>

        <button className={styles.drawerClose} onClick={onClose}>
          ×
        </button>
      </div>

      {/* Content */}
      <div className={styles.drawerContent}>
        {/* Summary */}
        {entity.summary && (
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionTitle}>Summary</div>
            <div className={styles.drawerSummary}>{entity.summary}</div>
          </div>
        )}

        {/* Voice */}
        {entity.voice && entity.voice !== 'N/A' && (
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionTitle}>Voice</div>
            <div className={styles.drawerVoice}>{entity.voice}</div>
          </div>
        )}

        {/* Canon Facts */}
        {entity.facts && entity.facts.length > 0 && (
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionTitle}>Canon Facts</div>
            <div className={styles.factsList}>
              {entity.facts.map((fact, idx) => (
                <div key={idx} className={styles.factRow}>
                  <div className={styles.factEpisode}>EP {fact.ep}</div>
                  <div className={styles.factText}>{fact.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relationships */}
        {entity.relationships && entity.relationships.length > 0 && (
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionTitle}>Relationships</div>
            <div className={styles.relationshipsPills}>
              {entity.relationships.map((relId) => {
                const relEntity = entity.name; // In a real app, look up the entity
                return (
                  <div key={relId} className={styles.relationshipPill}>
                    Related entity
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={styles.drawerFooter}>
        <button
          className={`${styles.drawerAction} ${styles.filled}`}
          onClick={() => {
            onAddToChat(entity.id);
            onClose();
          }}
        >
          Add to chat context
        </button>
        <button className={`${styles.drawerAction} ${styles.outlined}`}>
          Edit
        </button>
      </div>
    </div>
  );
}
