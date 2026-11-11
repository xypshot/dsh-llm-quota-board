window.__ModuleLoader__.load({
  id: '@local/llm-quota-board',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'llm-quota'
    const POLL_MS = 60_000

    const CSS = `
.llm-quota-dock{display:flex;flex-direction:column;gap:8px;width:100%;min-width:0;color:var(--dsw-alias-label-secondary);font-size:12px}
.llm-quota-bar{display:flex;align-items:center;justify-content:center;gap:8px;min-height:28px;min-width:0}
.llm-quota-bar>svg{flex:none;color:var(--dsw-alias-brand-primary)}
.llm-quota-label{color:var(--dsw-alias-label-primary);font-weight:500;white-space:nowrap}
.llm-quota-current{display:inline-flex;align-items:baseline;gap:6px;min-width:0;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:42%}
.llm-quota-model{color:var(--dsw-alias-label-secondary);font-size:11px;overflow:hidden;text-overflow:ellipsis}
.llm-quota-summary{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.llm-quota-muted{color:var(--dsw-alias-label-secondary)}
.llm-quota-spacer{flex:1 1 auto;min-width:4px}
.llm-quota-button,.llm-quota-icon-button{appearance:none;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:6px;height:24px;padding:0 8px;font:inherit;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.llm-quota-button:hover,.llm-quota-icon-button:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.llm-quota-button.primary{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.llm-quota-icon-button{width:24px;padding:0;justify-content:center}
.llm-quota-icon-button:disabled,.llm-quota-button:disabled{opacity:.55;cursor:default}
.llm-quota-panel{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:10px;max-height:55vh;overflow:auto;box-sizing:border-box}
.llm-quota-board{display:flex;flex-direction:column;gap:8px;min-width:0}
.llm-quota-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}
.llm-quota-card{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);padding:10px;min-width:0;display:flex;flex-direction:column;gap:8px}
.llm-quota-card[data-current="true"]{border-color:var(--dsw-alias-brand-primary)}
.llm-quota-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.llm-quota-card-title{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0}
.llm-quota-provider{color:var(--dsw-alias-label-primary);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}
.llm-quota-badge{border:1px solid var(--dsw-alias-border-l1);border-radius:999px;color:var(--dsw-alias-label-secondary);padding:0 6px;line-height:16px;font-size:10px;white-space:nowrap}
.llm-quota-badge.current{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.llm-quota-card-primary{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums;font-size:16px;white-space:nowrap}
.llm-quota-card-body{display:flex;flex-direction:column;gap:6px;min-width:0}
.llm-quota-card-body p{margin:0;color:var(--dsw-alias-label-secondary);line-height:18px}
.llm-quota-rows{display:flex;flex-direction:column;gap:4px}
.llm-quota-row{display:grid;grid-template-columns:auto auto;align-items:baseline;gap:2px 8px}
.llm-quota-row>span:first-child{color:var(--dsw-alias-label-secondary)}
.llm-quota-row strong{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums;text-align:right}
.llm-quota-sub{grid-column:1 / -1;color:var(--dsw-alias-label-secondary);font-size:11px}
.llm-quota-windows{display:flex;flex-direction:column;gap:6px}
.llm-quota-window{display:flex;flex-direction:column;gap:4px}
.llm-quota-window-head{display:flex;align-items:baseline;gap:8px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.llm-quota-window-head>span:first-child{color:var(--dsw-alias-label-primary);font-weight:600}
.llm-quota-reset{margin-left:auto;color:var(--dsw-alias-label-secondary);font-size:11px}
.llm-quota-track{height:6px;border-radius:999px;background:var(--dsw-alias-border-l1);overflow:hidden}
.llm-quota-fill{height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary);transition:width .2s ease}
.llm-quota-models{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
.llm-quota-models-label{color:var(--dsw-alias-label-secondary);font-size:11px;margin-right:2px}
.llm-quota-model-chip{border:1px solid var(--dsw-alias-border-l1);border-radius:999px;color:var(--dsw-alias-label-secondary);padding:0 6px;line-height:16px;font-size:10px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.llm-quota-model-chip[data-current="true"]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.llm-quota-stale{color:var(--dsw-alias-state-warn-primary);font-size:11px}
.llm-quota-error{color:var(--dsw-alias-state-error-primary);font-size:11px}
.llm-quota-time,.llm-quota-shared{color:var(--dsw-alias-label-secondary);font-size:11px}
.llm-quota-empty{color:var(--dsw-alias-label-secondary);padding:12px;text-align:center}
.llm-quota-settings{display:flex;flex-direction:column;gap:14px;padding:8px 0;min-width:0}
.llm-quota-settings-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.llm-quota-settings-head h2{margin:0 0 4px;color:var(--dsw-alias-label-primary);font-size:16px}
.llm-quota-settings-head p{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px}
.llm-quota-foot{display:flex;justify-content:space-between;gap:8px;color:var(--dsw-alias-label-secondary);font-size:11px}
.llm-quota-spin{animation:llm-quota-spin .8s linear infinite}
@keyframes llm-quota-spin{to{transform:rotate(360deg)}}
@media (max-width:720px){
  .llm-quota-current{max-width:100%}
  .llm-quota-summary{display:none}
  .llm-quota-grid{grid-template-columns:1fr}
}
`

    const ZH = {
      nav: '额度',
      title: '额度总览',
      subtitle: '设置 → 模型中已部署的全部供应商',
      label: '额度',
      all: '全部 {count}',
      collapse: '收起',
      refresh: '刷新',
      refreshAll: '刷新全部',
      refreshing: '刷新中…',
      loading: '正在读取额度…',
      empty: '设置 → 模型 中还没有已部署的模型',
      error: '额度读取失败',
      retry: '重试',
      current: '当前使用',
      default: '默认',
      currentMissing: '当前模型 {provider}/{model} 不在已部署目录',
      account: '账号',
      apiKey: 'API Key',
      codingPlan: '套餐',
      unknown: '未适配',
      unconfigured: '未配置凭据',
      unsupported: '额度接口未适配',
      balance: '余额',
      toppedUp: '充值',
      bonus: '赠送',
      models: '模型',
      noModels: '无可用模型',
      noneConfigured: '还没有已配置凭据的供应商，请在 设置 → 模型 中添加',
      used: '已用 {percent}%',
      remaining: '{window} 剩余 {percent}%',
      resetIn: '重置 {time}',
      stale: '显示上次成功数据',
      updated: '更新于 {time}',
      shared: '同一供应商下的模型共享账户额度',
      now: '即将重置',
      minutes: '{count} 分钟',
      hours: '{count} 小时',
      hoursMinutes: '{hours} 小时 {minutes} 分',
      days: '{count} 天',
      daysHours: '{days} 天 {hours} 小时',
    }

    const EN = {
      nav: 'Quota',
      title: 'Quota overview',
      subtitle: 'Every provider deployed in Settings → Models',
      label: 'Quota',
      all: 'All {count}',
      collapse: 'Collapse',
      refresh: 'Refresh',
      refreshAll: 'Refresh all',
      refreshing: 'Refreshing…',
      loading: 'Reading quota…',
      empty: 'No providers are deployed in Settings → Models yet',
      error: 'Could not read quota',
      retry: 'Retry',
      current: 'In use',
      default: 'Default',
      currentMissing: 'Current model {provider}/{model} is not in the deployed catalog',
      account: 'Account',
      apiKey: 'API Key',
      codingPlan: 'Plan',
      unknown: 'Unsupported',
      unconfigured: 'No credential configured',
      unsupported: 'Quota API not supported',
      balance: 'Balance',
      toppedUp: 'Topped up',
      bonus: 'Bonus',
      models: 'Models',
      noModels: 'No models',
      noneConfigured: 'No provider with configured credentials yet — add one in Settings → Models',
      used: '{percent}% used',
      remaining: '{window} {percent}% left',
      resetIn: 'resets in {time}',
      stale: 'Showing last successful reading',
      updated: 'Updated {time}',
      shared: 'Models under one provider share the same account quota',
      now: 'now',
      minutes: '{count}m',
      hours: '{count}h',
      hoursMinutes: '{hours}h {minutes}m',
      days: '{count}d',
      daysHours: '{days}d {hours}h',
    }

    function formatMoney(value, currency) {
      const number = Number(value)
      if (!Number.isFinite(number)) return String(value ?? '—')
      const locale = typeof navigator === 'undefined' ? undefined : navigator.language
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency || 'CNY',
          currencyDisplay: 'narrowSymbol',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(number)
      } catch {
        return `${currency || ''} ${number.toFixed(2)}`.trim()
      }
    }

    function formatTime(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      try {
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      } catch {
        return date.toLocaleTimeString()
      }
    }

    function formatDuration(ms, t) {
      if (!Number.isFinite(ms) || ms <= 0) return t('now')
      const minutes = Math.ceil(ms / 60_000)
      if (minutes < 60) return t('minutes', { count: String(minutes) })
      const hours = Math.floor(minutes / 60)
      const restMinutes = minutes % 60
      if (hours < 24) {
        return restMinutes > 0
          ? t('hoursMinutes', { hours: String(hours), minutes: String(restMinutes) })
          : t('hours', { hours: String(hours) })
      }
      const days = Math.floor(hours / 24)
      const restHours = hours % 24
      return restHours > 0
        ? t('daysHours', { days: String(days), hours: String(restHours) })
        : t('days', { days: String(days) })
    }

    function principalBalance(balances) {
      if (!Array.isArray(balances) || balances.length === 0) return undefined
      return balances.find((item) => item.currency === 'CNY') ?? balances[0]
    }

    function tightestWindow(windows) {
      if (!Array.isArray(windows) || windows.length === 0) return undefined
      return windows.reduce((best, item) => (best === undefined || item.usedPercent > best.usedPercent ? item : best), undefined)
    }

    function fiveHourWindow(windows) {
      if (!Array.isArray(windows) || windows.length === 0) return undefined
      return windows.find((item) => item.id === '5h')
    }

    function modeLabel(mode, t) {
      if (mode === 'account') return t('account')
      if (mode === 'api-key' || mode === 'moonshot' || mode === 'siliconflow') return t('apiKey')
      if (mode === 'coding-plan') return t('codingPlan')
      return t('unknown')
    }

    function statusText(status, t) {
      if (status === 'unconfigured') return t('unconfigured')
      if (status === 'unsupported') return t('unsupported')
      if (status === 'error') return t('error')
      return t('loading')
    }

    function summarize(provider, t) {
      if (provider.status !== 'ready') return statusText(provider.status, t)
      const balance = principalBalance(provider.balances)
      const window = tightestWindow(provider.windows)
      const parts = []
      if (balance !== undefined) parts.push(formatMoney(balance.total, balance.currency))
      if (window !== undefined) parts.push(`${window.id} ${Math.round(window.usedPercent)}%`)
      return parts.length === 0 ? '—' : parts.join(' · ')
    }

    function WalletIcon() {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: 14,
        height: 14,
        fill: 'none',
        'aria-hidden': true,
      },
        h('rect', { x: 3, y: 6, width: 18, height: 13, rx: 3, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M3 9.5h18', stroke: 'currentColor', strokeWidth: 1.6 }),
        h('circle', { cx: 17.2, cy: 14.5, r: 1.2, fill: 'currentColor' })
      )
    }

    function RefreshIcon(props) {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: 14,
        height: 14,
        fill: 'none',
        className: props?.spinning ? 'llm-quota-spin' : undefined,
        'aria-hidden': true,
      },
        h('path', {
          d: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        })
      )
    }

    function WindowRow(props) {
      const item = props.window
      const t = props.t
      const percent = Math.max(0, Math.min(100, Number(item.usedPercent) || 0))
      const color = percent >= 95
        ? 'var(--dsw-alias-state-error-primary)'
        : percent >= 80
          ? 'var(--dsw-alias-state-warn-primary)'
          : 'var(--dsw-alias-brand-primary)'
      const reset = Number(item.resetsAt)
      return h('div', { className: 'llm-quota-window' },
        h('div', { className: 'llm-quota-window-head' },
          h('span', null, item.id),
          h('span', null, t('used', { percent: String(Math.round(percent)) })),
          Number.isFinite(reset) && reset > 0
            ? h('span', { className: 'llm-quota-reset' }, t('resetIn', { time: formatDuration(reset - Date.now(), t) }))
            : null
        ),
        h('div', { className: 'llm-quota-track' },
          h('div', {
            className: 'llm-quota-fill',
            style: { width: `${percent}%`, background: color },
          })
        )
      )
    }

    function ProviderCard(props) {
      const provider = props.provider
      const current = props.current
      const t = props.t
      const isCurrent = current !== null && current !== undefined && current.provider === provider.id
      const balances = Array.isArray(provider.balances) ? provider.balances : []
      const windows = Array.isArray(provider.windows) ? provider.windows : []
      const models = Array.isArray(provider.models) ? provider.models : []
      const primary = principalBalance(balances)
      const tight = tightestWindow(windows)
      const currentLabel = current?.source === 'default' ? t('default') : t('current')

      const body = []
      if (provider.status === 'ready') {
        if (balances.length > 0) {
          body.push(h('div', { className: 'llm-quota-rows', key: 'balances' },
            balances.map((balance) => h('div', { className: 'llm-quota-row', key: balance.currency },
              h('span', null, `${t('balance')} ${balance.currency}`),
              h('strong', null, formatMoney(balance.total, balance.currency)),
              balance.toppedUp !== undefined || balance.bonus !== undefined
                ? h('span', { className: 'llm-quota-sub' }, [
                  balance.toppedUp !== undefined ? `${t('toppedUp')} ${formatMoney(balance.toppedUp, balance.currency)}` : null,
                  balance.bonus !== undefined ? `${t('bonus')} ${formatMoney(balance.bonus, balance.currency)}` : null,
                ].filter(Boolean).join(' · '))
                : null
            ))
          ))
        }
        if (windows.length > 0) {
          body.push(h('div', { className: 'llm-quota-windows', key: 'windows' },
            windows.map((window) => h(WindowRow, { key: window.id, window, t }))
          ))
        }
        if (balances.length === 0 && windows.length === 0) {
          body.push(h('p', { key: 'empty' }, '—'))
        }
      } else {
        body.push(h('p', { key: 'status' }, statusText(provider.status, t)))
        if (provider.status === 'error' && provider.error) {
          body.push(h('p', { key: 'detail', className: 'llm-quota-error' }, provider.error))
        }
      }

      return h('article', {
        className: 'llm-quota-card',
        'data-current': isCurrent ? 'true' : undefined,
        'data-status': provider.status,
      },
        h('div', { className: 'llm-quota-card-head' },
          h('div', { className: 'llm-quota-card-title' },
            h('span', { className: 'llm-quota-provider', title: provider.id }, provider.name),
            isCurrent ? h('span', { className: 'llm-quota-badge current' }, currentLabel) : null,
            h('span', { className: 'llm-quota-badge' }, modeLabel(provider.mode, t))
          ),
          provider.status === 'ready'
            ? h('div', { className: 'llm-quota-card-primary' },
              primary !== undefined
                ? formatMoney(primary.total, primary.currency)
                : tight !== undefined ? `${tight.id} ${Math.round(tight.usedPercent)}%` : '—'
            )
            : null
        ),
        h('div', { className: 'llm-quota-card-body' }, body),
        models.length > 0
          ? h('div', { className: 'llm-quota-models' },
            h('span', { className: 'llm-quota-models-label' }, t('models')),
            models.map((model) => h('span', {
              key: model.id,
              className: 'llm-quota-model-chip',
              'data-current': model.current ? 'true' : undefined,
              title: model.id,
            }, model.name || model.id))
          )
          : h('div', { className: 'llm-quota-models' },
            h('span', { className: 'llm-quota-models-label' }, t('noModels'))
          ),
        provider.status === 'ready' && provider.stale
          ? h('div', { className: 'llm-quota-stale' }, t('stale'))
          : null,
        provider.status === 'ready' && provider.fetchedAt
          ? h('div', { className: 'llm-quota-time' }, t('updated', { time: formatTime(provider.fetchedAt) }))
          : null
      )
    }

    function ProviderBoard(props) {
      const data = props.data
      const t = props.t
      if (!data) {
        return h('div', { className: 'llm-quota-empty' }, props.error ? `${t('error')}: ${props.error}` : t('loading'))
      }
      const providers = Array.isArray(data.providers) ? data.providers : []
      const visible = props.compact === true
        ? providers.filter((provider) => provider.status !== 'unconfigured' && provider.status !== 'unsupported')
        : providers
      const current = data.current
      const boardError = props.error ?? data.error
      const missing = current !== null && current !== undefined && !providers.some((provider) => provider.id === current.provider)
      return h('div', { className: 'llm-quota-board', 'data-compact': props.compact ? 'true' : undefined },
        missing
          ? h('div', { className: 'llm-quota-error' }, t('currentMissing', { provider: current.provider, model: current.model }))
          : null,
        providers.length === 0
          ? h('div', { className: 'llm-quota-empty' }, boardError ? `${t('error')}: ${boardError}` : t('empty'))
          : visible.length === 0
            ? h('div', { className: 'llm-quota-empty' }, t('noneConfigured'))
            : h('div', { className: 'llm-quota-grid' },
              visible.map((provider) => h(ProviderCard, { key: provider.id, provider, current, t }))
            ),
        h('div', { className: 'llm-quota-foot' },
          h('span', null, data.checkedAt ? t('updated', { time: formatTime(data.checkedAt) }) : ''),
          boardError ? h('span', { className: 'llm-quota-error' }, boardError) : null
        ),
        providers.length > 0 ? h('div', { className: 'llm-quota-shared' }, t('shared')) : null
      )
    }

    class QuotaStore {
      constructor() {
        this.state = { status: 'loading', data: null, error: null, refreshing: false }
        this.listeners = new Set()
        this.sessionId = undefined
        this.inflight = null
        this.inflightSession = undefined
        this.controller = null
        this.timer = null
        this.focusHandler = null
        this.started = false
        this.disposed = false
      }

      subscribe(listener) {
        this.listeners.add(listener)
        if (this.listeners.size === 1) this.start()
        return () => {
          this.listeners.delete(listener)
          if (this.listeners.size === 0) this.stop()
        }
      }

      getSnapshot() {
        return this.state
      }

      setSession(id) {
        const next = id === undefined || id === null || id === '' ? undefined : String(id)
        if (next === this.sessionId) return
        this.sessionId = next
        void this.refresh(false)
      }

      setState(patch) {
        this.state = { ...this.state, ...patch }
        for (const listener of this.listeners) {
          try {
            listener()
          } catch {
            // A component that already unmounted must not break the store.
          }
        }
      }

      start() {
        if (this.started || this.disposed) return
        this.started = true
        this.focusHandler = () => {
          if (!document.hidden) void this.refresh(false)
        }
        window.addEventListener('focus', this.focusHandler)
        this.timer = window.setInterval(() => {
          if (!document.hidden) void this.refresh(false)
        }, POLL_MS)
        void this.refresh(false)
      }

      stop() {
        this.started = false
        if (this.timer !== null) {
          window.clearInterval(this.timer)
          this.timer = null
        }
        if (this.focusHandler !== null) {
          window.removeEventListener('focus', this.focusHandler)
          this.focusHandler = null
        }
        if (this.controller !== null) {
          this.controller.abort()
          this.controller = null
        }
        this.inflight = null
        this.inflightSession = undefined
      }

      dispose() {
        this.disposed = true
        this.stop()
        this.listeners.clear()
      }

      async refresh(force) {
        if (this.disposed) return
        const requestedSession = this.sessionId
        if (this.inflight !== null && force !== true && this.inflightSession === requestedSession) {
          return this.inflight
        }
        if (this.controller !== null) this.controller.abort()

        const controller = new AbortController()
        this.controller = controller
        this.setState({ refreshing: true, error: null })

        const url = new URL('/api/llm-quota', window.location.origin)
        if (requestedSession !== undefined) url.searchParams.set('sessionId', requestedSession)
        if (force === true) url.searchParams.set('refresh', '1')

        let request
        request = (async () => {
          try {
            const response = await fetch(url, {
              credentials: 'same-origin',
              headers: { accept: 'application/json' },
              signal: controller.signal,
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const data = await response.json()
            if (this.disposed || controller.signal.aborted) return
            this.setState({ status: 'ready', data, error: null, refreshing: false })
          } catch (error) {
            if (this.disposed || controller.signal.aborted || error?.name === 'AbortError') return
            const message = error instanceof Error ? error.message : String(error)
            this.setState({
              status: this.state.data ? 'ready' : 'error',
              error: message,
              refreshing: false,
            })
          } finally {
            if (this.inflight === request) {
              this.inflight = null
              this.inflightSession = undefined
            }
            if (this.controller === controller) this.controller = null
          }
        })()

        this.inflight = request
        this.inflightSession = requestedSession
        return request
      }
    }

    function useStore(store) {
      const [snapshot, setSnapshot] = React.useState(store.getSnapshot())
      React.useEffect(() => {
        setSnapshot(store.getSnapshot())
        return store.subscribe(() => setSnapshot(store.getSnapshot()))
      }, [store])
      return snapshot
    }

    function QuotaDock(props) {
      const store = props.store
      const sessionId = props.sessionId
      const t = props.t
      const snapshot = useStore(store)
      const [open, setOpen] = React.useState(false)
      const rootRef = React.useRef(null)

      React.useEffect(() => {
        store.setSession(sessionId)
      }, [store, sessionId])

      React.useEffect(() => {
        if (!open) return
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        const onPointerDown = (event) => {
          const target = event.target
          if (rootRef.current && target instanceof Node && !rootRef.current.contains(target)) {
            setOpen(false)
          }
        }
        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('pointerdown', onPointerDown, true)
        return () => {
          document.removeEventListener('keydown', onKeyDown)
          document.removeEventListener('pointerdown', onPointerDown, true)
        }
      }, [open])

      const data = snapshot.data
      const current = data?.current
      const providers = Array.isArray(data?.providers) ? data.providers : []
      const currentProvider = current !== null && current !== undefined
        ? providers.find((provider) => provider.id === current.provider)
        : undefined
      const summary = currentProvider
        ? summarize(currentProvider, t)
        : current !== null && current !== undefined
          ? '—'
          : snapshot.status === 'error' ? t('error') : t('loading')
      const fiveHour = currentProvider?.status === 'ready' ? fiveHourWindow(currentProvider.windows) : undefined
      const fiveHourPercent = fiveHour !== undefined ? 100 - Math.round(fiveHour.usedPercent) : undefined
      const count = providers.filter((provider) => provider.status !== 'unconfigured' && provider.status !== 'unsupported').length

      return h('div', { ref: rootRef, className: 'llm-quota-dock', 'data-open': open ? 'true' : undefined },
        h('div', { className: 'llm-quota-bar' },
          h(WalletIcon),
          current !== null && current !== undefined
            ? h('span', { className: 'llm-quota-current' },
              h('span', null, currentProvider?.name ?? current.provider),
              h('span', { className: 'llm-quota-model' }, current.model)
            )
            : h('span', { className: 'llm-quota-muted' }, snapshot.status === 'error' ? t('error') : t('loading')),
          h('span', { className: 'llm-quota-summary' }, summary),
          fiveHourPercent !== undefined
            ? h('span', {
              className: 'llm-quota-summary',
              title: fiveHour.resetsAt !== undefined
                ? `${t('resetIn', { time: formatDuration(fiveHour.resetsAt - Date.now(), t) })}`
                : undefined,
            }, t('remaining', { window: fiveHour.id, percent: String(Math.max(0, Math.min(100, fiveHourPercent))) }))
            : null,
          h('button', {
            type: 'button',
            className: 'llm-quota-button',
            onClick: () => setOpen((value) => !value),
            'aria-expanded': open ? 'true' : 'false',
            'aria-controls': 'llm-quota-panel',
          }, open ? t('collapse') : t('all', { count: String(count) })),
          h('button', {
            type: 'button',
            className: 'llm-quota-icon-button',
            title: t('refresh'),
            'aria-label': t('refresh'),
            disabled: snapshot.refreshing,
            onClick: () => { void store.refresh(true) },
          }, h(RefreshIcon, { spinning: snapshot.refreshing }))
        ),
        open
          ? h('div', { id: 'llm-quota-panel', className: 'llm-quota-panel', role: 'region', 'aria-label': t('title') },
            h(ProviderBoard, { data, t, compact: true, error: snapshot.error })
          )
          : null
      )
    }

    function QuotaSettings(props) {
      const store = props.store
      const t = props.t
      const snapshot = useStore(store)
      return h('section', { className: 'llm-quota-settings' },
        h('div', { className: 'llm-quota-settings-head' },
          h('div', null,
            h('h2', null, t('title')),
            h('p', null, t('subtitle'))
          ),
          h('button', {
            type: 'button',
            className: 'llm-quota-button primary',
            disabled: snapshot.refreshing,
            onClick: () => { void store.refresh(true) },
          }, snapshot.refreshing ? t('refreshing') : t('refreshAll'))
        ),
        h(ProviderBoard, { data: snapshot.data, t, compact: false, error: snapshot.error })
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'llm-quota: dictionaries')
        const t = ctx.locale.bind(NS)

        ctx.effect(() => {
          const style = document.createElement('style')
          style.dataset.plugin = 'llm-quota'
          style.textContent = CSS
          document.head.appendChild(style)
          return () => { style.remove() }
        }, 'llm-quota: styles')

        const store = new QuotaStore()
        ctx.effect(() => () => store.dispose(), 'llm-quota: store')

        ctx.effect(() => ctx.on('api-session/status', (_sessionId, running) => {
          if (running === false) void store.refresh(false)
        }), 'llm-quota: refresh after settled turn')

        ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
          name: 'conversation.input.dock',
          id: 'llm-quota',
          order: 200,
          locale: NS,
          inject: () => ({ store }),
        }, QuotaDock))

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'llm-quota',
          order: 210,
          label: () => t('nav'),
          locale: NS,
          inject: () => ({ store }),
        }, QuotaSettings))
      },
    }
  },
})
