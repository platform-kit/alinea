import {values} from 'alinea/core/util/Objects'
import {atom, useAtom, useAtomValue, useSetAtom} from 'jotai'
import {atomFamily} from 'jotai/utils'
import {parse} from 'regexparam'

const browser = {
  get location() {
    return globalThis?.location! ?? {hash: ''}
  }
}

export const hashAtom = atom(
  browser.location.hash,
  (get, set, hash: string) => {
    if (get(hashAtom) !== hash) browser.location.hash = hash
    set(hashAtom, hash)
  }
)
hashAtom.onMount = set => {
  const listener = () => set(browser.location.hash)
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

export const locationAtom = atom(
  get => {
    const hash = get(hashAtom)
    const path = hash.slice(1) || '/'
    return new URL(path, browser.location.href)
  },
  (get, set, url: string) => {
    const hash = `#${url}`
    set(hashAtom, hash)
  }
)

interface Matcher {
  keys: Array<string>
  pattern: RegExp
}

export function createParams(matcher: Matcher, match: RegExpExecArray) {
  const params: Record<string, string> = {}
  if (matcher.keys)
    for (let i = 0; i < matcher.keys.length; i++)
      params[matcher.keys[i]] = match[i + 1]
  return params
}

function paramsEqual(a: Record<string, string>, b: Record<string, string>) {
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  for (const key of keys) if (a[key] !== b[key]) return false
  return true
}

interface MatchOptions {
  route: string
  loose?: boolean
}

export const matchAtoms = atomFamily(
  ({route, loose}: MatchOptions) => {
    let current: Record<string, string> | undefined
    const matcher = parse(route, loose)
    return atom(get => {
      const location = get(locationAtom)
      const match = matcher.pattern.exec(location.pathname)
      if (match === null) return undefined
      const result = createParams(matcher, match)
      if (current) {
        const resultValues = values(result)
        const currentValues = values(current)
        if (resultValues.every((v, i) => v === currentValues[i])) return current
      }
      return (current = result)
    })
  },
  (a, b) => a.route === b.route && a.loose === b.loose
)

export function useMatch(route: string, loose?: boolean) {
  return useAtom(matchAtoms({route, loose}))
}

export const useHash = () => useAtom(hashAtom)

export function useLocation() {
  return useAtomValue(locationAtom)
}

export function useNavigate() {
  const setLocation = useSetAtom(locationAtom)
  return function navigate(url: string) {
    setLocation(url)
  }
}

export function link(url: string | undefined) {
  return typeof url === 'string' ? {href: `#${url}`} : {}
}
