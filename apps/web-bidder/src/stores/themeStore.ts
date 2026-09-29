import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>((set) => {
  // Initialize from localStorage or system preference
  const stored = localStorage.getItem('gemverify-theme') as Theme | null
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const initial: Theme = stored || (systemDark ? 'dark' : 'light')

  // Apply on load
  if (initial === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }

  return {
    theme: initial,
    setTheme: (theme) => {
      set({ theme })
      localStorage.setItem('gemverify-theme', theme)
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    toggleTheme: () => {
      set((state) => {
        const next = state.theme === 'dark' ? 'light' : 'dark'
        localStorage.setItem('gemverify-theme', next)
        if (next === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        return { theme: next }
      })
    },
  }
})
