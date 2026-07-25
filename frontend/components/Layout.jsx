import React from 'react';
import styles from '../styles/components.module.css';
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import Canvas from './Canvas';
import RightPanel from './RightPanel';
import EntityDrawer from './EntityDrawer';

export default function Layout({ state }) {
  const layoutClass =
    state.layout === 'studio'
      ? styles.layoutStudio
      : state.layout === 'focus'
      ? styles.layoutFocus
      : styles.layoutTableRead;

  return (
    <div className={`${styles.container} ${layoutClass}`}>
      <Header
        layout={state.layout}
        setLayout={state.setLayout}
        wordCount={state.wordCount}
        lineCount={state.lineCount}
      />

      <div className={styles.body}>
        {/* Studio & Focus: Show left sidebar */}
        {(state.layout === 'studio' || state.layout === 'focus') && (
          <LeftSidebar
            episodes={state.episodes}
            activeEp={state.activeEp}
            onEpisodeSelect={state.setActiveEp}
            split={state.split}
            onSplitChange={state.setSplit}
            entities={state.entities}
            selectedEntity={state.selectedEntity}
            onEntitySelect={state.setSelectedEntity}
            query={state.query}
            onQueryChange={state.setQuery}
            openGroups={state.openGroups}
            onToggleGroup={state.toggleGroup}
            vw={state.vw}
          />
        )}

        {/* All layouts show canvas */}
        <Canvas
          activeEp={state.activeEp}
          manuscriptText={state.manuscriptText}
          onManuscriptChange={state.setManuscriptText}
          lastSaved={state.lastSaved}
          annotations={state.annotations}
          annotationsVisible={state.annotationsVisible}
          onAnnotationsToggle={() => state.setAnnotationsVisible(!state.annotationsVisible)}
          hoverAnnotation={state.hoverAnnotation}
          onHoverAnnotation={state.setHoverAnnotation}
        />

        {/* Studio: Show right panel normally */}
        {state.layout === 'studio' && (
          <RightPanel
            messages={state.messages}
            generating={state.generating}
            input={state.input}
            onInputChange={state.handleInputChange}
            contextChips={state.contextChips}
            onRemoveChip={state.removeContextChip}
            mentionOpen={state.mentionOpen}
            mentionQuery={state.mentionQuery}
            mentionMatches={state.mentionMatches}
            onSelectMention={state.selectEntityFromMention}
            onSendMessage={state.sendMessage}
            entities={state.entities}
          />
        )}

        {/* Focus: Show right panel as floating overlay */}
        {state.layout === 'focus' && (
          <div className={styles.floatingPanel}>
            <RightPanel
              messages={state.messages}
              generating={state.generating}
              input={state.input}
              onInputChange={state.handleInputChange}
              contextChips={state.contextChips}
              onRemoveChip={state.removeContextChip}
              mentionOpen={state.mentionOpen}
              mentionQuery={state.mentionQuery}
              mentionMatches={state.mentionMatches}
              onSelectMention={state.selectEntityFromMention}
              onSendMessage={state.sendMessage}
              entities={state.entities}
            />
          </div>
        )}

        {/* Table Read: Show right panel as bottom drawer */}
        {state.layout === 'table-read' && (
          <div className={styles.bottomDrawer}>
            <RightPanel
              messages={state.messages}
              generating={state.generating}
              input={state.input}
              onInputChange={state.handleInputChange}
              contextChips={state.contextChips}
              onRemoveChip={state.removeContextChip}
              mentionOpen={state.mentionOpen}
              mentionQuery={state.mentionQuery}
              mentionMatches={state.mentionMatches}
              onSelectMention={state.selectEntityFromMention}
              onSendMessage={state.sendMessage}
              entities={state.entities}
            />
          </div>
        )}

        {/* Entity Drawer - appears on right when entity selected */}
        {state.selectedEntity && (
          <EntityDrawer
            entity={state.selectedEntity}
            onClose={() => state.setSelectedEntity(null)}
            onAddToChat={(entityId) => {
              state.setContextChips([...state.contextChips, entityId]);
            }}
          />
        )}
      </div>
    </div>
  );
}
