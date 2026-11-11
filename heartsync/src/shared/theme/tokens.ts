export const colors = {
  background: '#FFF7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#FFF0F4',
  ink: '#1E1418',
  inkMuted: '#7A6B74',
  border: '#F3DCE4',
  primary: '#FF4D7D',
  primaryPressed: '#E6386F',
  primarySoft: '#FFE8EF',
  onPrimary: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#FF3366',
  disabled: '#F3EAEF',
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radii = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;
export const type = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '400' as const },
} as const;
