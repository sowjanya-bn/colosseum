export type PanelId = 'claude' | 'gpt' | 'gemini'

interface Props {
  title:            string
  relayDepth:       number
  extensionActive:  boolean
  visiblePanels:    Record<PanelId, boolean>
  onTogglePanel:    (panel: PanelId) => void
  onOpenSettings:   () => void
  onReset:          () => void
}

const PANEL_LABELS: Record<PanelId, string> = {
  claude: 'Claude',
  gpt:    'GPT',
  gemini: 'Gemini',
}

export default function Header({
  title,
  relayDepth,
  extensionActive,
  visiblePanels,
  onTogglePanel,
  onOpenSettings,
  onReset,
}: Props) {
  const depthClass = relayDepth === 0 ? 'badge-ok' : 'badge-warn'
  const activeCount = Object.values(visiblePanels).filter(Boolean).length

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">⚔</span>
        <h1 className="header-title">Colosseum</h1>
        {title && <span className="header-session-title">{title}</span>}
      </div>

      <div className="header-panel-toggles">
        {(Object.keys(PANEL_LABELS) as PanelId[]).map(panel => (
          <button
            key={panel}
            className={`panel-toggle panel-toggle--${panel} ${visiblePanels[panel] ? 'panel-toggle--on' : ''}`}
            onClick={() => {
              // prevent hiding the last visible panel
              if (visiblePanels[panel] && activeCount === 1) return
              onTogglePanel(panel)
            }}
            title={`${visiblePanels[panel] ? 'Hide' : 'Show'} ${PANEL_LABELS[panel]}`}
          >
            {PANEL_LABELS[panel]}
          </button>
        ))}
      </div>

      <div className="header-right">
        <div
          className={`ext-status ${extensionActive ? 'ext-status--on' : 'ext-status--off'}`}
          title={extensionActive ? 'Extension connected — live mode' : 'Extension not detected — mock mode'}
        >
          <span className="ext-dot" />
          {extensionActive ? 'live' : 'mock'}
        </div>

        <div className={`relay-badge ${depthClass}`} title={`relay depth: ${relayDepth}`}>
          <span className="relay-badge-label">relay</span>
          <span className="relay-badge-count">{relayDepth}</span>
        </div>

        <button className="header-btn" onClick={onReset} title="Reset session">↺</button>
        <button className="header-btn" onClick={onOpenSettings} title="Settings">⚙</button>
      </div>
    </header>
  )
}
