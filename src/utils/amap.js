const AMAP_SCRIPT_ID = 'attendance-amap-sdk'
const AMAP_BASE_URL = 'https://webapi.amap.com/maps'

let amapLoaderPromise
const pluginLoaderCache = new Map()

function buildAmapUrl(key) {
  return `${AMAP_BASE_URL}?v=2.0&key=${encodeURIComponent(key)}`
}

function applyAmapSecurityConfig() {
  const securityJsCode = (import.meta.env.VITE_AMAP_SECURITY_JS_CODE || '').trim()

  if (!securityJsCode || typeof window === 'undefined') {
    return
  }

  window._AMapSecurityConfig = {
    ...(window._AMapSecurityConfig || {}),
    securityJsCode,
  }
}

export function loadAmapSdk() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('当前环境不支持地图加载'))
  }

  if (window.AMap) {
    return Promise.resolve(window.AMap)
  }

  const amapKey = (import.meta.env.VITE_AMAP_KEY || '').trim()
  if (!amapKey) {
    return Promise.reject(new Error('未配置前端地图 Key'))
  }

  applyAmapSecurityConfig()

  if (amapLoaderPromise) {
    return amapLoaderPromise
  }

  amapLoaderPromise = new Promise((resolve, reject) => {
    const handleLoad = () => {
      if (window.AMap) {
        resolve(window.AMap)
        return
      }

      amapLoaderPromise = undefined
      reject(new Error('地图 SDK 加载完成但未找到 AMap'))
    }

    const handleError = () => {
      amapLoaderPromise = undefined
      reject(new Error('高德地图脚本加载失败'))
    }

    const existingScript = document.getElementById(AMAP_SCRIPT_ID)
    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = AMAP_SCRIPT_ID
    script.src = buildAmapUrl(amapKey)
    script.async = true
    script.defer = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  return amapLoaderPromise
}

export async function loadAmapPlugins(pluginNames = []) {
  const AMap = await loadAmapSdk()
  const normalizedPluginNames = pluginNames.filter(Boolean)
  if (!normalizedPluginNames.length) {
    return AMap
  }

  const cacheKey = normalizedPluginNames.slice().sort().join('|')
  if (!pluginLoaderCache.has(cacheKey)) {
    pluginLoaderCache.set(cacheKey, new Promise((resolve, reject) => {
      AMap.plugin(normalizedPluginNames, () => {
        resolve(AMap)
      })
      setTimeout(() => reject(new Error('地图插件加载超时')), 10000)
    }))
  }

  return pluginLoaderCache.get(cacheKey)
}
