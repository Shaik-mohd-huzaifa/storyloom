import React, { useState, useRef } from 'react';
import styles from '../styles/components.module.css';

function EpisodeRow({ episode, isSelected, onClick }) {
  return (
    <div
      className={`${styles.episodeRow} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <div className={`${styles.statusDot} ${styles[episode.status]}`}></div>
      <div className={styles.episodeNumber}>EP {episode.num.toString().padStart(2, '0')}</div>
      <div className={styles.episodeTitle}>{episode.title}</div>
      <div className={styles.episodeRuntime}>{episode.mins}m</div>
    </div>
  );
}

function DraggableDivider({ onDrag }) {
  const dividerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !dividerRef.current) return;

      const sidebar = dividerRef.current.closest(`.${styles.leftSidebar}`);
      if (!sidebar) return;

      const sidebarRect = sidebar.getBoundingClientRect();
      const dividerRect = dividerRef.current.getBoundingClientRect();
      const contentStart = dividerRect.bottom;
      const sidebarBottom = sidebarRect.bottom;

      const dragPercentage = ((e.clientY - contentStart) / (sidebarBottom - contentStart)) * 100;
      const clampedPercentage = Math.max(18, Math.min(76, dragPercentage));

      onDrag(clampedPercentage);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isDragging, onDrag]);

  return (
    <div
      ref={dividerRef}
      className={styles.divider}
      onMouseDown={handleMouseDown}
    >
      <div className={styles.grip}></div>
    </div>
  );
}

function EntityAvatar({ entity }) {
  const typeColors = {
    character: '#b4532a',
    location: '#4f6b52',
    plotThread: '#7a4a6b',
    event: '#8a6a2a',
  };

  // Generate avatar initials from entity name
  const initials = entity.name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={styles.entityAvatar}
      style={{
        backgroundColor: typeColors[entity.kind] || '#666',
        color: 'white',
      }}
    >
      {initials || '?'}
    </div>
  );
}

function EntityRow({ entity, isSelected, onClick }) {
  return (
    <div
      className={`${styles.entityRow} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <EntityAvatar entity={entity} />
      <div className={styles.entityName}>{entity.name}</div>
      {entity.flagged && <div className={styles.flagDot}></div>}
    </div>
  );
}

function EntityGroup({ type, entities, isOpen, onToggle, selectedEntityId, onEntityClick }) {
  const typeColors = {
    character: '#b4532a',
    location: '#4f6b52',
    plotThread: '#7a4a6b',
    event: '#8a6a2a',
  };

  const typeLabels = {
    character: 'Characters',
    location: 'Locations',
    plotThread: 'Plot Threads',
    event: 'Events',
  };

  return (
    <div className={styles.entityGroup}>
      <div
        className={`${styles.groupHeader} ${isOpen ? styles.expanded : ''}`}
        onClick={onToggle}
      >
        <div className={styles.groupCaret}>›</div>
        <div
          className={styles.typeSwatch}
          style={{ backgroundColor: typeColors[type] }}
        ></div>
        <div className={styles.groupLabel}>{typeLabels[type]}</div>
        <div className={styles.groupCount}>{entities.length}</div>
      </div>
      {isOpen && (
        <div className={`${styles.groupContent} ${isOpen ? styles.expanded : ''}`}>
          <div className={styles.entityRowsList}>
            {entities.map((entity) => (
              <EntityRow
                key={entity.id}
                entity={entity}
                isSelected={selectedEntityId === entity.id}
                onClick={() => onEntityClick(entity)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeftSidebar({
  episodes,
  activeEp,
  onEpisodeSelect,
  split,
  onSplitChange,
  entities,
  selectedEntity,
  onEntitySelect,
  query,
  onQueryChange,
  openGroups,
  onToggleGroup,
  vw,
}) {
  const isCollapsed = vw < 980;
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredEntities = query
    ? entities.filter(
        (e) =>
          e.name.toLowerCase().includes(query.toLowerCase()) ||
          e.blurb.toLowerCase().includes(query.toLowerCase())
      )
    : entities;

  // Group entities by type
  const groupedEntities = {
    character: filteredEntities.filter((e) => e.kind === 'character'),
    location: filteredEntities.filter((e) => e.kind === 'location'),
    plotThread: filteredEntities.filter((e) => e.kind === 'plotThread'),
    event: filteredEntities.filter((e) => e.kind === 'event'),
  };

  const episodesPaneHeight = `${split}%`;

  return (
    <aside className={`${styles.leftSidebar} ${isCollapsed && isExpanded ? styles.expanded : ''}`}>
      {/* Episodes Pane */}
      <div className={styles.episodesPane} style={{ height: isCollapsed ? 'auto' : episodesPaneHeight }}>
        <div className={styles.sidebarHeader}>
          {!isCollapsed && <h2 className={styles.sidebarTitle}>Episodes</h2>}
          {isCollapsed && (
            <button
              className={styles.addButton}
              title="Toggle sidebar"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '‹' : '›'}
            </button>
          )}
          {!isCollapsed && (
            <button className={styles.addButton} title="Add episode">
              +
            </button>
          )}
        </div>
        {!isCollapsed && (
          <div className={styles.episodesList}>
            {episodes.map((episode) => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                isSelected={activeEp?.id === episode.id}
                onClick={() => onEpisodeSelect(episode)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Draggable Divider */}
      {!isCollapsed && <DraggableDivider onDrag={onSplitChange} />}

      {/* Story Bible Pane */}
      {!isCollapsed && (
        <div className={styles.storyBiblePane}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Story Bible</h2>
          </div>

          <div className={styles.entityFilter}>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Search…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
          </div>

          <div className={styles.entityGroupsList}>
            {Object.entries(groupedEntities).map(([type, typeEntities]) => (
              typeEntities.length > 0 && (
                <EntityGroup
                  key={type}
                  type={type}
                  entities={typeEntities}
                  isOpen={openGroups[type]}
                  onToggle={() => onToggleGroup(type)}
                  selectedEntityId={selectedEntity?.id}
                  onEntityClick={onEntitySelect}
                />
              )
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
