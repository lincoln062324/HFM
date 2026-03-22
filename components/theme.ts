// lib/theme.ts — Single source of truth for all theme palettes
// Import ThemeColors type and THEMES / getTheme() wherever needed

export interface ThemeColors {
  id: string;
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  accent: string;
}

export const THEMES: ThemeColors[] = [
  { id:'purple',   primary:'#c67ee2', secondary:'#1e1929', background:'#15041f', card:'#211c24', text:'#FFFFFF', accent:'#84d7f4' },
  { id:'midnight', primary:'#5c9cef', secondary:'#1a2035', background:'#0d1423', card:'#182030', text:'#FFFFFF', accent:'#7fc8f8' },
  { id:'forest',   primary:'#5ccc7f', secondary:'#1a2e1c', background:'#0c1f0e', card:'#192d1b', text:'#FFFFFF', accent:'#a8e6b8' },
  { id:'ember',    primary:'#ff9f4a', secondary:'#2a1a0a', background:'#1a0e04', card:'#261706', text:'#FFFFFF', accent:'#ffd080' },
  { id:'rose',     primary:'#e8849a', secondary:'#2a1520', background:'#1a0c14', card:'#26131e', text:'#FFFFFF', accent:'#f5b8c8' },
  { id:'teal',     primary:'#38c9c0', secondary:'#0f2524', background:'#071918', card:'#0e2523', text:'#FFFFFF', accent:'#7de8e2' },
  { id:'slate',    primary:'#94a3b8', secondary:'#1e2432', background:'#111620', card:'#1a2030', text:'#FFFFFF', accent:'#cbd5e1' },
  { id:'gold',     primary:'#f0c040', secondary:'#221a06', background:'#160f02', card:'#201608', text:'#FFFFFF', accent:'#ffe08a' },
];

export const DEFAULT_THEME: ThemeColors = THEMES[0];

export function getTheme(id: string): ThemeColors {
  return THEMES.find(t => t.id === id) ?? DEFAULT_THEME;
}
