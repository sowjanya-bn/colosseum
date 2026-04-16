interface Props {
  title:            string
  relayDepth:       number
  maxRelayDepth:    number
  extensionActive:  boolean
  onOpenSettings:   () => void
  onReset:          () => void
}

export default function Header({
  title,
  relayDepth,
  maxRelayDepth,
  extensionActive,
  onOpenSettings,
  onReset,
}: Props) {
  const depthClass =
    relayDepth === 0
      ? 'badge-ok'
      : relayDepth < maxRelayDepth
      ? 'badge-warn'
      : 'badge-max'

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">⚔</span>
        <h1 className="header-title">Colosseum</h1>
        {title && <span className="header-session-title">{title}</span>}
      </div>

      <div className="header-right">
        <div
          className={`ext-status ${extensionActive ? 'ext-status--on' : 'ext-status--off'}`}
          title={extensionActive ? 'Extension connected — live mode' : 'Extension not detected — mock mode'}
        >
          <span className="ext-dot" />
          {extensionActive ? 'live' : 'mock'}
        </div>

        <div className={`relay-badge ${depthClass}`} title={`${maxRelayDepth - relayDepth} relay${maxRelayDepth - relayDepth === 1 ? '' : 's'} remaining`}>
          <span className="relay-badge-label">relay</span>
          <span className="relay-badge-count">{relayDepth}/{maxRelayDepth}</span>
        </div>

        <button className="header-btn" onClick={onReset} title="Reset session">↺</button>
        <button className="header-btn" onClick={onOpenSettings} title="Settings">⚙</button>
      </div>
    </header>
  )
}
