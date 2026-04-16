import { useState } from 'react'
import { SessionConfig, DEFAULT_CONFIG } from '../state'

interface Props {
  config: SessionConfig
  onUpdate: (patch: Partial<SessionConfig>) => void
  onClose: () => void
}

export default function SettingsDrawer({ config, onUpdate, onClose }: Props) {
  const [local, setLocal] = useState<SessionConfig>({ ...config })

  function save() {
    onUpdate(local)
    onClose()
  }

  function reset() {
    setLocal({ ...DEFAULT_CONFIG, sessionTitle: local.sessionTitle })
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <span className="drawer-title">Settings</span>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          <section className="drawer-section">
            <label className="drawer-label">Session title</label>
            <input
              className="drawer-input"
              placeholder="What are we thinking about today?"
              value={local.sessionTitle}
              onChange={e => setLocal(s => ({ ...s, sessionTitle: e.target.value }))}
            />
            <span className="drawer-hint">Used in the context prefix sent to each model.</span>
          </section>

          <section className="drawer-section">
            <label className="drawer-label">
              <span className="label-dot label-dot--claude" /> Claude's role
            </label>
            <textarea
              className="drawer-textarea"
              rows={4}
              value={local.claudeSystem}
              onChange={e => setLocal(s => ({ ...s, claudeSystem: e.target.value }))}
            />
          </section>

          <section className="drawer-section">
            <label className="drawer-label">
              <span className="label-dot label-dot--gpt" /> GPT's role
            </label>
            <textarea
              className="drawer-textarea"
              rows={4}
              value={local.gptSystem}
              onChange={e => setLocal(s => ({ ...s, gptSystem: e.target.value }))}
            />
          </section>

          <section className="drawer-section">
            <label className="drawer-label">Max relay depth</label>
            <div className="relay-slider-row">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`relay-depth-btn ${local.maxRelayDepth === n ? 'relay-depth-btn--active' : ''}`}
                  onClick={() => setLocal(s => ({ ...s, maxRelayDepth: n }))}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="drawer-hint">How many times a response can be forwarded before the chain locks.</span>
          </section>
        </div>

        <div className="drawer-footer">
          <button className="btn-reset" onClick={reset}>Reset defaults</button>
          <button className="btn-save" onClick={save}>Save</button>
        </div>
      </div>
    </>
  )
}
