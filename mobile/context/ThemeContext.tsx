import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ColorSchemeName, buildTheme } from '../theme';

const DARK_KEY = 'theme_is_dark';
const SCHEME_KEY = 'theme_scheme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  colorScheme: ColorSchemeName;
  toggleDark: () => void;
  setColorScheme: (s: ColorSchemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: buildTheme('cosmic', true),
  isDark: true,
  colorScheme: 'cosmic',
  toggleDark: () => {},
  setColorScheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [colorScheme, setScheme] = useState<ColorSchemeName>('cosmic');

  useEffect(() => {
    (async () => {
      const [dark, scheme] = await Promise.all([
        AsyncStorage.getItem(DARK_KEY),
        AsyncStorage.getItem(SCHEME_KEY),
      ]);
      if (dark !== null) setIsDark(dark === 'true');
      if (scheme) setScheme(scheme as ColorSchemeName);
    })();
  }, []);

  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    AsyncStorage.setItem(DARK_KEY, String(next));
  }

  function setColorScheme(s: ColorSchemeName) {
    setScheme(s);
    AsyncStorage.setItem(SCHEME_KEY, s);
  }

  return (
    <ThemeContext.Provider value={{
      theme: buildTheme(colorScheme, isDark),
      isDark,
      colorScheme,
      toggleDark,
      setColorScheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
