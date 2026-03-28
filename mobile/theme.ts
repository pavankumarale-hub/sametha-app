export type ColorSchemeName = 'cosmic' | 'ocean' | 'saffron' | 'rose' | 'forest' | 'gold';

export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  primary: string;
  primaryLight: string;
  gold: string;
  rose: string;
  text: string;
  textSub: string;
  textMuted: string;
  isDark: boolean;
  cardGradients: [string, string][];
}

const darkBase = {
  text: '#FFFFFF',
  textSub: '#9494B8',
  textMuted: '#5C5C7E',
  isDark: true,
};

const lightBase = {
  text: '#1A1A2E',
  textSub: '#4A4A6A',
  textMuted: '#9090A8',
  isDark: false,
};

const schemes: Record<ColorSchemeName, {
  dark: Omit<Theme, keyof typeof darkBase>;
  light: Omit<Theme, keyof typeof lightBase>;
}> = {
  cosmic: {
    dark: {
      bg: '#0D0D1F', surface: '#161630', surface2: '#1E1E42', border: '#2A2A50',
      primary: '#8B5CF6', primaryLight: '#A78BFA', gold: '#F5A623', rose: '#F43F5E',
      cardGradients: [['#1E1040','#3B1FA8'],['#1A3A5C','#1E6FA8'],['#2D1040','#7B1FA2'],['#1A2F1A','#1B5E20'],['#3D1A00','#C84B00'],['#2C0A1E','#880E4F'],['#0A2340','#0D47A1']],
    },
    light: {
      bg: '#F5F4FF', surface: '#FFFFFF', surface2: '#EDE9FE', border: '#DDD6FE',
      primary: '#7C3AED', primaryLight: '#8B5CF6', gold: '#D97706', rose: '#E11D48',
      cardGradients: [['#7C3AED','#5B21B6'],['#2563EB','#1D4ED8'],['#6D28D9','#4C1D95'],['#059669','#047857'],['#EA580C','#C2410C'],['#DB2777','#BE185D'],['#1D4ED8','#1E3A8A']],
    },
  },
  ocean: {
    dark: {
      bg: '#061220', surface: '#0A1F35', surface2: '#0D2A47', border: '#163354',
      primary: '#0EA5E9', primaryLight: '#38BDF8', gold: '#F5A623', rose: '#F43F5E',
      cardGradients: [['#0C2340','#0E4D8A'],['#064E63','#0891B2'],['#0A3351','#0369A1'],['#043A4A','#0E7490'],['#0F2A4A','#1D4ED8'],['#1A0A3A','#4338CA'],['#0A1F35','#1E3A8A']],
    },
    light: {
      bg: '#F0F9FF', surface: '#FFFFFF', surface2: '#E0F2FE', border: '#BAE6FD',
      primary: '#0284C7', primaryLight: '#0EA5E9', gold: '#D97706', rose: '#E11D48',
      cardGradients: [['#0284C7','#0369A1'],['#0891B2','#0E7490'],['#0369A1','#1D4ED8'],['#0D9488','#0F766E'],['#2563EB','#1D4ED8'],['#4F46E5','#4338CA'],['#0EA5E9','#0284C7']],
    },
  },
  saffron: {
    dark: {
      bg: '#1A0D00', surface: '#2A1800', surface2: '#3A2300', border: '#4D3000',
      primary: '#F97316', primaryLight: '#FB923C', gold: '#FBBF24', rose: '#F43F5E',
      cardGradients: [['#7C2D12','#C2410C'],['#92400E','#B45309'],['#78350F','#92400E'],['#431407','#7C2D12'],['#4A1942','#7B1FA2'],['#1A2F1A','#1B5E20'],['#0A2340','#0D47A1']],
    },
    light: {
      bg: '#FFF7ED', surface: '#FFFFFF', surface2: '#FFEDD5', border: '#FED7AA',
      primary: '#EA580C', primaryLight: '#F97316', gold: '#D97706', rose: '#E11D48',
      cardGradients: [['#EA580C','#C2410C'],['#D97706','#B45309'],['#DC2626','#B91C1C'],['#059669','#047857'],['#7C3AED','#6D28D9'],['#DB2777','#BE185D'],['#2563EB','#1D4ED8']],
    },
  },
  rose: {
    dark: {
      bg: '#1A040D', surface: '#2A0815', surface2: '#3A0C1E', border: '#4D1028',
      primary: '#F43F5E', primaryLight: '#FB7185', gold: '#F5A623', rose: '#FB7185',
      cardGradients: [['#881337','#BE123C'],['#9F1239','#881337'],['#7F1D1D','#991B1B'],['#831843','#9D174D'],['#312E81','#3730A3'],['#1E1040','#3B1FA8'],['#0A2340','#0D47A1']],
    },
    light: {
      bg: '#FFF1F2', surface: '#FFFFFF', surface2: '#FFE4E6', border: '#FECDD3',
      primary: '#E11D48', primaryLight: '#F43F5E', gold: '#D97706', rose: '#F43F5E',
      cardGradients: [['#E11D48','#BE123C'],['#DB2777','#BE185D'],['#DC2626','#B91C1C'],['#7C3AED','#6D28D9'],['#EA580C','#C2410C'],['#0284C7','#0369A1'],['#059669','#047857']],
    },
  },
  forest: {
    dark: {
      bg: '#040D07', surface: '#071A0C', surface2: '#0A2610', border: '#0E3317',
      primary: '#10B981', primaryLight: '#34D399', gold: '#F5A623', rose: '#F43F5E',
      cardGradients: [['#064E3B','#065F46'],['#14532D','#166534'],['#052E16','#14532D'],['#134E4A','#115E59'],['#1A3A5C','#1E6FA8'],['#1E1040','#3B1FA8'],['#78350F','#92400E']],
    },
    light: {
      bg: '#F0FDF4', surface: '#FFFFFF', surface2: '#DCFCE7', border: '#BBF7D0',
      primary: '#059669', primaryLight: '#10B981', gold: '#D97706', rose: '#E11D48',
      cardGradients: [['#059669','#047857'],['#0D9488','#0F766E'],['#16A34A','#15803D'],['#0284C7','#0369A1'],['#7C3AED','#6D28D9'],['#EA580C','#C2410C'],['#DB2777','#BE185D']],
    },
  },
  gold: {
    dark: {
      bg: '#1A1200', surface: '#2A1E00', surface2: '#3A2A00', border: '#4D3800',
      primary: '#F59E0B', primaryLight: '#FBBF24', gold: '#FBBF24', rose: '#F43F5E',
      cardGradients: [['#78350F','#92400E'],['#713F12','#854D0E'],['#7C2D12','#C2410C'],['#14532D','#166534'],['#1E1040','#3B1FA8'],['#881337','#BE123C'],['#1A3A5C','#1E6FA8']],
    },
    light: {
      bg: '#FFFBEB', surface: '#FFFFFF', surface2: '#FEF3C7', border: '#FDE68A',
      primary: '#D97706', primaryLight: '#F59E0B', gold: '#B45309', rose: '#E11D48',
      cardGradients: [['#D97706','#B45309'],['#EA580C','#C2410C'],['#DC2626','#B91C1C'],['#059669','#047857'],['#7C3AED','#6D28D9'],['#0284C7','#0369A1'],['#DB2777','#BE185D']],
    },
  },
};

export const schemeLabels: Record<ColorSchemeName, string> = {
  cosmic: 'Cosmic',
  ocean: 'Ocean',
  saffron: 'Saffron',
  rose: 'Rose',
  forest: 'Forest',
  gold: 'Gold',
};

export function buildTheme(scheme: ColorSchemeName, isDark: boolean): Theme {
  const variant = isDark ? schemes[scheme].dark : schemes[scheme].light;
  const base = isDark ? darkBase : lightBase;
  return { ...base, ...variant } as Theme;
}

export function todayGradient(theme: Theme): [string, string] {
  return theme.cardGradients[new Date().getDay()];
}

// Default (used as fallback before context is ready)
export const T = buildTheme('cosmic', true);
