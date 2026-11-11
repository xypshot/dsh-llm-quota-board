/**
 * Host half of the quota overview.
 *
 * It discovers every provider that currently has a registered LLM adapter, reads
 * the models each provider exposes, and queries account-level quota through a
 * small provider adapter table. The browser receives normalized numbers only.
 */

const VOLATILE_WRITE = Symbol.for('cosmokit.volatile.write')
const QUOTA_TTL_MS = 30_000
const PROVIDER_TTL_MS = 5 * 60_000
const REQUEST_TIMEOUT_MS = 15_000
const MAX_SESSION_TRACKING = 64

function isVolatile(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    VOLATILE_WRITE in value &&
    typeof value.get === 'function'
  )
}

function plain(value) {
  if (isVolatile(value)) return plain(value.get())
  if (Array.isArray(value)) return value.map(plain)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]))
  }
  return value
}

function asRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined
}

function descend(value, path) {
  let current = value
  for (const key of path) {
    const record = asRecord(current)
    if (record === undefined) return undefined
    current = record[key]
  }
  return current
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const text = value.trim()
    if (text === '') return undefined
    const parsed = Number(text)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function round2(value) {
  return Math.round(value * 100) / 100
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10))
}

function fromNumericInstant(value) {
  if (!Number.isFinite(value) || value <= 0) return undefined
  return value > 1e12 ? Math.round(value) : Math.round(value * 1000)
}

function parseInstant(value) {
  if (typeof value === 'string') {
    const text = value.trim()
    if (text === '') return undefined
    if (/^\d+(\.\d+)?$/.test(text)) return fromNumericInstant(Number(text))
    const parsed = Date.parse(text)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (typeof value === 'number') return fromNumericInstant(value)
  return undefined
}

function errorText(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.length > 180 ? `${message.slice(0, 177)}...` : message
}

function clientMetadata() {
  return {
    version: '0.1.0',
    locale: Intl.DateTimeFormat().resolvedOptions().locale || 'en',
    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
  }
}

function normalizeModels(models) {
  if (!Array.isArray(models)) return []
  const result = []
  const seen = new Set()
  for (const raw of models) {
    if (typeof raw === 'string') {
      if (raw === '' || seen.has(raw)) continue
      seen.add(raw)
      result.push({ id: raw, name: raw })
      continue
    }
    const record = asRecord(raw)
    const id = record?.id
    if (typeof id !== 'string' || id === '' || seen.has(id)) continue
    seen.add(id)
    const name = typeof record.name === 'string' && record.name !== '' ? record.name : id
    result.push({ id, name })
  }
  return result
}

function fallbackModels(config) {
  return normalizeModels(config?.models)
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

async function fetchJson(url, headers) {
  const signal = typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    : undefined
  const response = await fetch(url, {
    headers,
    redirect: 'error',
    ...(signal === undefined ? {} : { signal }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return await response.json()
}

function parseDeepSeekBalance(payload) {
  const root = asRecord(payload)
  const infos = root !== undefined && Array.isArray(root.balance_infos) ? root.balance_infos : []
  const balances = []
  for (const raw of infos) {
    const item = asRecord(raw)
    const total = toNumber(item?.total_balance)
    if (total === undefined) continue
    const currency = typeof item.currency === 'string' && item.currency !== '' ? item.currency : 'CNY'
    const toppedUp = toNumber(item.topped_up_balance)
    const bonus = toNumber(item.granted_balance)
    balances.push({
      currency,
      total: round2(total),
      ...(toppedUp === undefined ? {} : { toppedUp: round2(toppedUp) }),
      ...(bonus === undefined ? {} : { bonus: round2(bonus) }),
    })
  }
  if (balances.length === 0) throw new Error('余额响应中没有可用金额')
  return balances
}

function parseAccountBalance(payload) {
  const root = asRecord(payload)
  if (root?.status !== 'ready' || !Array.isArray(root.value) || !Array.isArray(root.bonusWallets)) {
    throw new Error(root?.status === 'failed' ? 'DeepSeek 账户余额暂时不可用' : '账户余额响应不可解析')
  }

  const wallets = new Map()
  const rows = [
    [root.value, 'toppedUp'],
    [root.bonusWallets, 'bonus'],
  ]
  for (const [entries, field] of rows) {
    for (const raw of entries) {
      const row = asRecord(raw)
      const amount = toNumber(row?.balance)
      const currency = row?.currency
      if (amount === undefined || (currency !== 'CNY' && currency !== 'USD')) {
        throw new Error('账户余额包含不可识别的钱包')
      }
      const wallet = wallets.get(currency) ?? { toppedUp: 0, bonus: 0 }
      wallet[field] += amount
      wallets.set(currency, wallet)
    }
  }

  return [...wallets].map(([currency, wallet]) => ({
    currency,
    total: round2(wallet.toppedUp + wallet.bonus),
    toppedUp: round2(wallet.toppedUp),
    bonus: round2(wallet.bonus),
  }))
}

function parseZaiQuota(payload) {
  const root = asRecord(payload)
  const body = asRecord(root?.data)
  const limits = body !== undefined && Array.isArray(body.limits) ? body.limits : []
  const found = new Map()

  for (const raw of limits) {
    const limit = asRecord(raw)
    if (limit === undefined) continue
    if (limit.type !== 'TOKENS_LIMIT' && limit.type !== 'CREDIT_LIMIT') continue

    let percent = toNumber(limit.percentage)
    if (percent === undefined) {
      const usage = toNumber(limit.usage)
      const current = toNumber(limit.currentValue)
      if (usage !== undefined && usage > 0 && current !== undefined) percent = (current / usage) * 100
    }
    if (percent === undefined) continue

    const unit = toNumber(limit.unit)
    const id = unit === 3 ? '5h' : unit === 6 ? '7d' : undefined
    if (id === undefined || found.has(id)) continue

    const resetsAt = parseInstant(limit.nextResetTime)
    found.set(id, {
      id,
      usedPercent: clampPercent(percent),
      ...(resetsAt === undefined ? {} : { resetsAt }),
    })
  }

  return [...found.values()].sort((left, right) => (left.id === '5h' ? 0 : 1) - (right.id === '5h' ? 0 : 1))
}

/**
 * Host entry point.
 * @param ctx - plugin context.
 */
export const inject = ['llm', 'credentials', 'connection', 'timer']

export function apply(ctx) {
  let providerCache = { at: 0, value: [] }
  const quotaCache = new Map()
  const inflight = new Map()
  const currentBySession = new Map()
  let turnEndTimer

  const readNamespace = (namespace) => {
    if (typeof namespace !== 'string' || namespace === '') return undefined
    try {
      const editor = ctx.get('configEditor')
      if (editor === undefined || typeof editor.entries !== 'function') return undefined
      const entry = editor.entries().find((candidate) => candidate?.options?.id === namespace)
      return plain(entry?.fiber?.config)
    } catch {
      return undefined
    }
  }

  const providerConfig = (meta) => {
    const root = readNamespace(meta.settingsNs)
    if (root === undefined) return undefined
    const path = Array.isArray(meta.settingsPath) ? meta.settingsPath : []
    const selected = descend(root, path)
    if (selected !== undefined && selected !== null) return selected
    const providers = asRecord(root.providers)
    if (providers !== undefined && typeof meta.provider === 'string') {
      return asRecord(providers[meta.provider])
    }
    return selected
  }

  const resolveKey = async (refs) => {
    const unique = [...new Set(refs.filter((ref) => typeof ref === 'string' && ref.trim() !== '').map((ref) => ref.trim()))]
    for (const ref of unique) {
      try {
        const resolved = await ctx.credentials.resolve(ref)
        if (resolved !== undefined && typeof resolved.value === 'string' && resolved.value.trim() !== '') {
          return { ref, key: resolved.value }
        }
      } catch {
        // Another candidate may still resolve.
      }
    }
    return undefined
  }

  const resolveProviderKey = async (provider, refs) => {
    const resolved = await resolveKey(refs)
    if (resolved !== undefined) return resolved
    try {
      const record = await ctx.credentials.readRecord(`llm-pi-ai/${provider.id}`)
      if (record !== undefined && record.kind === 'api-key' && typeof record.key === 'string' && record.key.trim() !== '') {
        return { ref: `llm-pi-ai/${provider.id}`, key: record.key }
      }
    } catch {
      // The provider may not use a stored pi-ai record.
    }
    return undefined
  }

  const credentialRefs = (meta, config, defaults) => {
    const refs = []
    const push = (value) => {
      if (typeof value === 'string' && value.trim() !== '') refs.push(value)
    }
    push(config?.apiKeyEnv)
    const env = meta?.nativeAuth?.env
    if (Array.isArray(env)) for (const ref of env) push(ref)
    for (const ref of defaults) push(ref)
    return refs
  }

  const loadProviders = async () => {
    if (providerCache.value.length > 0 && Date.now() - providerCache.at < PROVIDER_TTL_MS) {
      return providerCache.value
    }

    let active = []
    try {
      active = ctx.llm.listProviders() ?? []
    } catch {
      active = []
    }

    let configurable = []
    try {
      configurable = typeof ctx.llm.listConfigurableProviders === 'function'
        ? ctx.llm.listConfigurableProviders() ?? []
        : []
    } catch {
      configurable = []
    }

    const metaById = new Map()
    for (const meta of configurable) {
      if (meta !== null && typeof meta === 'object' && typeof meta.provider === 'string') {
        metaById.set(meta.provider, meta)
      }
    }

    const result = []
    const seen = new Set()
    for (const item of active) {
      const id = typeof item?.id === 'string' ? item.id : undefined
      if (id === undefined || id === '' || seen.has(id)) continue
      seen.add(id)
      const meta = metaById.get(id) ?? {
        provider: id,
        displayName: typeof item.name === 'string' ? item.name : id,
        settingsNs: '',
        settingsPath: [],
      }
      const config = providerConfig(meta)

      let models = []
      try {
        models = normalizeModels(await ctx.llm.listModels(id))
      } catch {
        models = []
      }
      if (models.length === 0) models = fallbackModels(config)

      result.push({
        id,
        name: typeof meta.displayName === 'string' && meta.displayName !== ''
          ? meta.displayName
          : typeof item.name === 'string' && item.name !== '' ? item.name : id,
        meta,
        config,
        models,
      })
    }

    // A configured but dormant pi-ai route is still deployed in Settings -> Models.
    // Built-in catalog providers are not listed until the user actually configures
    // one, so this only adds profiles that exist in the llm-pi-ai providers map.
    for (const meta of configurable) {
      if (meta === null || typeof meta !== 'object') continue
      if (typeof meta.provider !== 'string' || meta.provider === '' || seen.has(meta.provider)) continue
      if (meta.settingsNs !== 'llm-pi-ai') continue
      const config = providerConfig(meta)
      if (config === undefined || config === null) continue
      seen.add(meta.provider)
      result.push({
        id: meta.provider,
        name: typeof meta.displayName === 'string' && meta.displayName !== '' ? meta.displayName : meta.provider,
        meta,
        config,
        models: fallbackModels(config),
      })
    }

    providerCache = { at: Date.now(), value: result }
    return result
  }

  const detectMode = (provider) => {
    const id = provider.id.toLowerCase()
    const namespace = typeof provider.meta.settingsNs === 'string' ? provider.meta.settingsNs.toLowerCase() : ''
    const text = `${id} ${namespace} ${typeof provider.config?.displayName === 'string' ? provider.config.displayName : ''}`.toLowerCase()

    if (id.includes('deepseek-account') || namespace.includes('deepseek-account')) return 'account'
    if (provider.meta.nativeAuth?.oauth === true && id.includes('deepseek')) return 'account'
    if (/opencode|openrouter|kimi|moonshot|minimax|openai|anthropic|claude|gemini/.test(text)) return 'unsupported'
    if (text.includes('zai') || text.includes('zhipu') || text.includes('bigmodel') || text.includes('glm')) return 'coding-plan'
    if (text.includes('deepseek')) return 'api-key'
    return 'unsupported'
  }

  const queryAccount = async () => {
    const account = ctx.get('deepseekAccount')
    if (account === undefined || typeof account.getState !== 'function' || typeof account.getBalance !== 'function') {
      return { mode: 'account', status: 'unconfigured', balances: [], windows: [] }
    }
    const state = await account.getState()
    if (state?.status !== 'credential-stored') {
      return { mode: 'account', status: 'unconfigured', balances: [], windows: [] }
    }
    const payload = await account.getBalance(clientMetadata())
    if (payload === null) {
      return { mode: 'account', status: 'unconfigured', balances: [], windows: [] }
    }
    return { mode: 'account', status: 'ready', balances: parseAccountBalance(payload), windows: [] }
  }

  const queryDeepSeekApi = async (provider) => {
    const resolved = await resolveProviderKey(provider, credentialRefs(provider.meta, provider.config, ['DEEPSEEK_API_KEY']))
    if (resolved === undefined) {
      return { mode: 'api-key', status: 'unconfigured', balances: [], windows: [] }
    }
    const payload = await fetchJson('https://api.deepseek.com/user/balance', {
      authorization: `Bearer ${resolved.key}`,
      accept: 'application/json',
    })
    return { mode: 'api-key', status: 'ready', balances: parseDeepSeekBalance(payload), windows: [] }
  }

  const queryZai = async (provider) => {
    const resolved = await resolveProviderKey(provider, credentialRefs(provider.meta, provider.config, ['ZAI_API_KEY', 'GLM_API_KEY', 'ZHIPU_API_KEY']))
    if (resolved === undefined) {
      return { mode: 'coding-plan', status: 'unconfigured', balances: [], windows: [] }
    }

    let lastError
    for (const base of ['https://open.bigmodel.cn', 'https://api.z.ai']) {
      try {
        const payload = await fetchJson(`${base}/api/monitor/usage/quota/limit`, {
          authorization: `Bearer ${resolved.key}`,
          accept: 'application/json',
        })
        const windows = parseZaiQuota(payload)
        if (windows.length > 0) {
          return { mode: 'coding-plan', status: 'ready', balances: [], windows }
        }
        lastError = new Error('额度响应中没有 5h/7d 窗口')
      } catch (error) {
        lastError = error
      }
    }
    throw lastError ?? new Error('额度查询失败')
  }

  const getQuota = async (provider, force) => {
    const now = Date.now()
    const cached = quotaCache.get(provider.id)
    if (force !== true && cached !== undefined && now - cached.at < QUOTA_TTL_MS) {
      return cached.value
    }

    const running = inflight.get(provider.id)
    if (running !== undefined) return running

    const mode = detectMode(provider)
    const promise = (async () => {
      let value
      try {
        if (mode === 'account') value = await queryAccount()
        else if (mode === 'api-key') value = await queryDeepSeekApi(provider)
        else if (mode === 'coding-plan') value = await queryZai(provider)
        else value = { mode: 'unsupported', status: 'unsupported', balances: [], windows: [] }
        value = { ...value, fetchedAt: Date.now() }
      } catch (error) {
        const previous = quotaCache.get(provider.id)?.value
        const message = errorText(error)
        value = previous !== undefined && previous.status === 'ready'
          ? { ...previous, stale: true, error: message, fetchedAt: Date.now() }
          : { mode, status: 'error', balances: [], windows: [], error: message, fetchedAt: Date.now() }
      }
      quotaCache.set(provider.id, { at: Date.now(), value })
      return value
    })().finally(() => {
      if (inflight.get(provider.id) === promise) inflight.delete(provider.id)
    })

    inflight.set(provider.id, promise)
    return promise
  }

  const resolveCurrent = (sessionId) => {
    if (typeof sessionId === 'string' && sessionId !== '') {
      const tracked = currentBySession.get(sessionId)
      if (tracked !== undefined) {
        return { provider: tracked.provider, model: tracked.model, source: 'session' }
      }
    }
    try {
      const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
      if (selection !== undefined && typeof selection.provider === 'string' && typeof selection.model === 'string') {
        return { provider: selection.provider, model: selection.model, source: 'default' }
      }
    } catch {
      // No default selection service in this composition.
    }
    return null
  }

  const noteCurrent = (session, event) => {
    const sessionId = session !== undefined && session !== null && typeof session.id === 'string' ? session.id : undefined
    if (sessionId === undefined || event === undefined || event === null) return

    let provider
    let model
    if (event.type === 'request/header') {
      const config = event.data?.header?.config
      provider = config?.provider
      model = config?.model
    } else if (event.type === 'request/context') {
      provider = event.data?.provider
      model = event.data?.model
    } else if (event.type === 'assistant/message') {
      const source = event.data?.message?.source
      provider = source?.provider
      model = source?.model
    }

    if (typeof provider !== 'string' || provider === '' || typeof model !== 'string' || model === '') return
    currentBySession.set(sessionId, { provider, model, at: Date.now() })
    if (currentBySession.size > MAX_SESSION_TRACKING) {
      const oldest = [...currentBySession.entries()].sort((left, right) => left[1].at - right[1].at)[0]
      if (oldest !== undefined) currentBySession.delete(oldest[0])
    }
  }

  const getState = async ({ sessionId, force }) => {
    let providers = []
    let listError
    try {
      providers = await loadProviders()
    } catch (error) {
      listError = errorText(error)
    }
    const current = resolveCurrent(sessionId)
    const quotas = await Promise.all(providers.map((provider) => getQuota(provider, force === true)))

    return {
      checkedAt: Date.now(),
      current,
      providers: providers.map((provider, index) => ({
        id: provider.id,
        name: provider.name,
        models: provider.models.map((model) => ({
          ...model,
          current: current !== null && current.provider === provider.id && current.model === model.id,
        })),
        ...quotas[index],
      })),
      ...(listError === undefined ? {} : { error: listError }),
    }
  }

  ctx.effect(() => {
    const dispose = ctx.connection.fetch.register({
      path: '/api/llm-quota',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const url = new URL(request.url)
          const sessionId = url.searchParams.get('sessionId') ?? undefined
          const force = url.searchParams.get('refresh') === '1'
          return jsonResponse(await getState({ sessionId, force }))
        } catch (error) {
          return jsonResponse({
            checkedAt: Date.now(),
            current: null,
            providers: [],
            error: errorText(error),
          }, 500)
        }
      },
    })
    return () => { void dispose() }
  }, 'llm-quota: authenticated route')

  ctx.effect(() => {
    const disposers = [
      ctx.on('session/event', (session, event) => {
        noteCurrent(session, event)
        if (event?.type === 'turn/end') {
          if (turnEndTimer !== undefined) turnEndTimer()
          turnEndTimer = ctx.timeout(() => {
            quotaCache.clear()
            turnEndTimer = undefined
          }, 2_000)
        }
      }),
      ctx.on('session/disposed', (session) => {
        if (session !== undefined && session !== null && typeof session.id === 'string') {
          currentBySession.delete(session.id)
        }
      }),
      ctx.on('deepseek-account/signed-out', () => {
        quotaCache.clear()
      }),
      ctx.on('llm/adapters-updated', () => {
        providerCache = { at: 0, value: [] }
      }),
      ctx.on('settings/document-updated', (namespace) => {
        if (typeof namespace === 'string' && namespace.startsWith('llm')) {
          providerCache = { at: 0, value: [] }
          quotaCache.clear()
        }
      }),
      ctx.on('credentials/reference-updated', () => {
        quotaCache.clear()
      }),
    ]

    return () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch {
          // The owning context may already be unwinding.
        }
      }
      if (turnEndTimer !== undefined) {
        turnEndTimer()
        turnEndTimer = undefined
      }
    }
  }, 'llm-quota: host events')
}
