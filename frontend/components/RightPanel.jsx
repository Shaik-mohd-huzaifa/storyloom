import React, { useRef, useEffect, useState } from 'react';
import styles from '../styles/components.module.css';

const MODES = [
  { id: 'ask', label: 'Ask', description: 'Answer questions about the ingested story' },
  { id: 'ideate', label: 'Ideate', description: 'Suggest grounded options for what happens next' },
];

function ModeSelector({ mode, onModeChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = MODES.find((m) => m.id === mode) || MODES[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={styles.modeSelectorWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.modeButton}
        onClick={() => setOpen((o) => !o)}
        title={current.description}
      >
        {current.label}
        <span className={styles.modeCaret}>▾</span>
      </button>

      {open && (
        <div className={styles.modeMenu}>
          {MODES.map((m) => (
            <div
              key={m.id}
              className={`${styles.modeMenuItem} ${m.id === mode ? styles.modeMenuItemActive : ''}`}
              onClick={() => {
                onModeChange?.(m.id);
                setOpen(false);
              }}
            >
              <div>
                <div>{m.label}</div>
                <div className={styles.modeMenuDescription}>{m.description}</div>
              </div>
              {m.id === mode && <span className={styles.modeMenuCheck}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionCard({ option, onInsert }) {
  return (
    <div className={styles.assistantBubble} style={{ marginTop: 8 }}>
      <div className={styles.assistantContent}>
        <div className={styles.assistantLabel}>{option.label}</div>
        <div className={styles.assistantText}>{option.text}</div>
        {option.rationale && (
          <div className={styles.assistantText} style={{ opacity: 0.7, fontStyle: 'italic' }}>
            {option.rationale}
          </div>
        )}

        {option.cites && option.cites.length > 0 && (
          <div className={styles.citations}>
            {option.cites.map((cite, idx) => (
              <div key={idx} className={styles.citation}>
                {cite.text}
              </div>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={`${styles.action} ${styles.filled}`}
            onClick={() => onInsert?.(option.action?.text ?? option.text)}
          >
            {option.action?.label || 'Insert into scene'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Splits message text on "@KnownEntityName" occurrences and renders those spans as a
// distinct inline tag, so a mention reads differently from surrounding prose in the
// sent message — matching how Cursor/Claude render an attached reference after sending.
function renderWithMentions(text, entities) {
  if (!text || !entities || entities.length === 0) return text;
  const names = entities.map((e) => e.name).filter(Boolean).sort((a, b) => b.length - a.length);
  if (names.length === 0) return text;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`@(${escaped.join('|')})(?![\\w])`, 'gi');

  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <span key={match.index} className={styles.inlineMention}>
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function ChatMessage({ message, onInsert, onRewrite, entities }) {
  if (message.role === 'user') {
    return (
      <div className={styles.message}>
        <div className={styles.userBubble}>{renderWithMentions(message.text, entities)}</div>
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

      {message.options && message.options.length > 0 && (
        <div className={styles.actions} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {message.options.map((option) => (
            <OptionCard key={option.id} option={option} onInsert={onInsert} />
          ))}
        </div>
      )}
    </div>
  );
}

function GeneratingState({ label }) {
  return (
    <div className={styles.message}>
      <div className={styles.assistantBubble}>
        <div className={styles.assistantAvatar}></div>
        <div className={styles.assistantContent}>
          <div className={styles.generatingState}>
            <div className={styles.generatingLabel}>{label || 'THINKING'}</div>
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
    location: '#4f6b52',
    plotThread: '#7a4a6b',
    event: '#8a6a2a',
  };

  const typeLabels = {
    character: 'Character',
    location: 'Location',
    plotThread: 'Plot Thread',
    event: 'Event',
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
  progressLabel,
  mode,
  onModeChange,
  input,
  onInputChange,
  mentionOpen,
  mentionQuery,
  mentionMatches,
  onSelectMention,
  onSendMessage,
  onInsert,
  onRewrite,
  entities,
  activeEp,
}) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generating]);

  return (
    <div className={styles.rightPanel}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div>
          <div className={styles.chatTitle}>STORY ASSISTANT</div>
          <div className={styles.chatContext}>
            {activeEp?.title ? `${activeEp.title} context` : 'No episode selected'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} onInsert={onInsert} onRewrite={onRewrite} entities={entities} />
        ))}
        {generating && <GeneratingState label={progressLabel} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className={styles.composer}>
        <div style={{ position: 'relative' }}>
          <textarea
            className={styles.composerInput}
            placeholder={mode === 'ideate' ? 'Describe what should happen next…' : 'Ask about the story…'}
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
          <ModeSelector mode={mode} onModeChange={onModeChange} />
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
