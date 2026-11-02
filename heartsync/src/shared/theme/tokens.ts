export const colors = {
  background: '#F6FAFB', surface: '#FFFFFF', surfaceMuted: '#EAF3F5', ink: '#102A33',
  inkMuted: '#587079', border: '#CFE0E4', primary: '#007E8C', primaryPressed: '#006674',
  primarySoft: '#DDF8FB', onPrimary: '#FFFFFF', success: '#168760', warning: '#A96900',
  danger: '#C5364D', disabled: '#E3EAEC',
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radii = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const type = {
  display: { fontSize: 32, lineHeight: 39, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 29, fontWeight: '700' as const },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
} as const;
