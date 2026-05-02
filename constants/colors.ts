export const colors = {
  cream: '#F7F3EE',
  sage: '#7A9E7E',
  sageLight: '#C2D4C4',
  sageDark: '#4A6B4E',
  earth: '#8B6F47',
  earthLight: '#D4B896',
  dark: '#2C2C2C',
  mid: '#6B6B6B',
  white: '#FFFFFF',
} as const;

export type ColorKey = keyof typeof colors;
