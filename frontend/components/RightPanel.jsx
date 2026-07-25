import React, { useRef, useEffect } from 'react';
import styles from '../styles/components.module.css';

function ChatMessage({ message, onInsert, onRewrite }) {
  if (message.role === 'user') {
    return (
      <div className={styles.message}>
        <div className={styles.userBubble}>{message.text}</div>
      </div>
    );
  }

  return (
    <div className={styles.message}>
      <div className={styles.assistantBubble}>
        <div className={styles.assistantAvatar}></div>
        <div className={styles.assistantContent}>
          <div className={styles.assistantLabel}>{message.label}</div>
          <div className={styles.assistantText}>{message.text}</div>

          {message.cites && message.cites.length > 0 && (
            <div className={styles.citations}>
              {message.cites.map((cite, idx) => (
                <div key={idx} className={styles.citation}>
                  {cite.text}
                </div>
              ))}
            </div>
          )}

          {message.actions && message.actions.length > 0 && (
            <div className={styles.actions}>
              {message.actions.map((action, idx) => (
                <button
                  key={idx}
                  className={`${styles.action} ${styles[action.type === 'insert' ? 'filled' : 'outlined']}`}
                  onClick={() =>
                    action.type === 'insert'
                      ? onInsert?.(message.text)
                      : onRewrite?.(message.text)
                  }
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className={styles.message}>
      <div className={styles.assistantBubble}>
        <div className={styles.assistantAvatar}></div>
        <div className={styles.assistantContent}>
          <div className={styles.generatingState}>
            <div className={styles.generatingLabel}>DRAFTING · READING EP 5–7</div>
            <div className={styles.generatingDots}>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
            </div>
            <div className={styles.skeletonBars}>
              <div className={styles.skeletonBar}></div>
              <div className={styles.skeletonBar}></div>
              <div className={styles.skeletonBar}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MentionPopover({ query, matches, onSelect, onClose }) {
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

  if (!matches || matches.length === 0) {
    return null;
  }

  return (
    <div className={styles.mentionPopover}>
      <div className={styles.popoverHeader}>MENTION AN ENTITY · "{query}"</div>
      <div className={styles.popoverContent}>
        {matches.map((entity) => (
          <div
            key={entity.id}
            className={styles.mentionRow}
            onClick={() => {
              onSelect(entity);
              onClose();
            }}
          >
            <div
              className={styles.mentionAvatar}
              style={{
                backgroundColor: typeColors[entity.kind],
                color: 'white',
              }}
            >
              {entity.avatar}
            </div>
            <div className={styles.mentionInfo}>
              <div className={styles.mentionName}>{entity.name}</div>
              <div className={styles.mentionBlurb}>{entity.blurb}</div>
            </div>
            <div className={styles.mentionType}>{typeLabels[entity.kind]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RightPanel({
  messages,
  generating,
  input,
  onInputChange,
  contextChips,
  onRemoveChip,
  mentionOpen,
  mentionQuery,
  mentionMatches,
  onSelectMention,
  onSendMessage,
  entities,
}) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generating]);

  const getEntityName = (entityId) => {
    return entities.find((e) => e.id === entityId)?.name || '';
  };

  return (
    <div className={styles.rightPanel}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div>
          <div className={styles.chatTitle}>STORY ASSISTANT</div>
          <div className={styles.chatContext}>Ep 07 context</div>
        </div>
      </div>

      {/* Context Chips */}
      {contextChips.length > 0 && (
        <div className={styles.contextChips}>
          {contextChips.map((chipId) => (
            <div key={chipId} className={styles.contextChip}>
              {getEntityName(chipId)}
              <span
                className={styles.contextChipRemove}
                onClick={() => onRemoveChip(chipId)}
              >
                ×
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {generating && <GeneratingState />}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className={styles.composer}>
        <div style={{ position: 'relative' }}>
          <textarea
            className={styles.composerInput}
            placeholder="Ask about the story…"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
          />

          {mentionOpen && (
            <MentionPopover
              query={mentionQuery}
              matches={mentionMatches}
              onSelect={onSelectMention}
              onClose={() => {}}
            />
          )}
        </div>

        <div className={styles.composerActions}>
          <button className={styles.quickAction}>Critique pacing</button>
          <button className={styles.quickAction}>Continue scene</button>
          <button
            className={styles.sendButton}
            onClick={onSendMessage}
            disabled={!input.trim() || generating}
            title="Send message (Shift+Enter for newline)"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
