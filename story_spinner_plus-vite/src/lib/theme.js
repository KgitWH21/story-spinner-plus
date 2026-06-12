export const MODE_TOKENS = {
  character: {
    '--color-tertiary': '#e7c365',
    '--color-tertiary-container': '#c9a74d',
    '--color-on-tertiary': '#3e2e00',
    '--color-pointer': '#503d00',
  },
  story: {
    '--color-tertiary': '#52b788',
    '--color-tertiary-container': '#40916c',
    '--color-on-tertiary': '#1a3329',
    '--color-pointer': '#0f3320',
  },
  music: {
    '--color-tertiary': '#c77dff',
    '--color-tertiary-container': '#9d4edd',
    '--color-on-tertiary': '#2d0050',
    '--color-pointer': '#1e0042',
  },
}

export function applyModeTokens(mode) {
  const tokens = MODE_TOKENS[mode]
  if (!tokens) return
  const root = document.documentElement
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v))
}
