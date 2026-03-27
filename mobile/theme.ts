// Dark theme inspired by "Daily Motivation: Better Me"
export const T = {
  bg: '#0D0D1F',
  surface: '#161630',
  surface2: '#1E1E42',
  border: '#2A2A50',
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  gold: '#F5A623',
  rose: '#F43F5E',
  green: '#10B981',
  text: '#FFFFFF',
  textSub: '#9494B8',
  textMuted: '#5C5C7E',

  // Gradient card presets — rotated by day of week
  cardGradients: [
    ['#1E1040', '#3B1FA8'] as [string, string],   // deep purple (Sun)
    ['#1A3A5C', '#1E6FA8'] as [string, string],   // ocean blue (Mon)
    ['#2D1040', '#7B1FA2'] as [string, string],   // violet (Tue)
    ['#1A2F1A', '#1B5E20'] as [string, string],   // forest (Wed)
    ['#3D1A00', '#E65100'] as [string, string],   // saffron (Thu)
    ['#2C0A1E', '#880E4F'] as [string, string],   // rose (Fri)
    ['#0A2340', '#0D47A1'] as [string, string],   // midnight (Sat)
  ] as [string, string][],
};

export function todayGradient(): [string, string] {
  return T.cardGradients[new Date().getDay()];
}
