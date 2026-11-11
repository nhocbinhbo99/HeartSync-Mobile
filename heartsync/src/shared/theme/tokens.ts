export const colors = {
  /** Pink Romance v3 — mapped from UI_UX_Design/DESIGN_SYSTEM.md. */
  background: '#FFF7F9', surface: '#FFFFFF', surfaceMuted: '#FFF0F4', ink: '#3B1024',
  inkMuted: '#816776', border: '#F2D7E3', primary: '#FF4D7D', primaryPressed: '#E6386F',
  primarySoft: '#FFD6E1', onPrimary: '#FFFFFF', success: '#159967', warning: '#A96700',
  successSoft: '#E4F5ED', warningSoft: '#FFF4DF', danger: '#D93A4F', dangerSoft: '#FCEBED',
  disabled: '#F2E4E9', callBackdrop: '#36112A',
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 40 } as const;
export const radii = { sm: 10, md: 14, lg: 20, pill: 999 } as const;
export const componentSize = {
  minTouchTarget: 48,
  buttonHeight: 52,
  fieldHeight: 52,
  iconButton: 48,
  tabBarHeight: 66,
} as const;
export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  heading: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  label: { fontSize: 16, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
} as const;
