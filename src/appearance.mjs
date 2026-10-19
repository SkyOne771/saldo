export const themes = [
  { id: 'forest', name: 'Forest', color: '#27785e' },
  { id: 'ocean', name: 'Ocean', color: '#286cbd' },
  { id: 'violet', name: 'Violet', color: '#7954bc' },
  { id: 'rose', name: 'Rose', color: '#b54f77' },
  { id: 'amber', name: 'Amber', color: '#99641e' },
  { id: 'slate', name: 'Slate', color: '#526477' },
];
export function appearance(value) {
  return {
    color: themes.some((t) => t.id === value?.color) ? value.color : 'forest',
    mode: ['light', 'dark', 'system'].includes(value?.mode) ? value.mode : 'light',
  };
}
