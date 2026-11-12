export const colors = {
  /** Pink Romance Design System — Clean High-Contrast Palette (No AI Pastel Slop) */
  background: '#FFF9FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F6F1F4',
  ink: '#24111A',
  inkMuted: '#78626E',
  border: '#EAD6DF',
  primary: '#FF4D7D',
  primaryPressed: '#E6386F',
  primarySoft: '#F6EEF2',
  secondary: '#FF8FAB',
  onPrimary: '#FFFFFF',
  verified: '#2B8CFF',
  online: '#17B978',
  success: '#17B978',
  warning: '#E59400',
  successSoft: '#E6F8F0',
  warningSoft: '#FFF5E0',
  danger: '#E53955',
  dangerSoft: '#FDECEF',
  disabled: '#EDE4E8',
  callBackdrop: '#230C1A',
} as const;

export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 40 } as const;
export const radii = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const componentSize = {
  minTouchTarget: 48,
  buttonHeight: 52,
  fieldHeight: 52,
  iconButton: 48,
  tabBarHeight: 66,
} as const;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 40 },
  heading: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 34 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  label: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
} as const;
