export const colors = {
  /** Pink Romance Design System */
  background: '#FFF7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#FFF0F4',
  ink: '#3B1024',
  inkMuted: '#816776',
  border: '#F2D7E3',
  primary: '#FF4D7D',
  primaryPressed: '#E6386F',
  primarySoft: '#FFD6E1',
  onPrimary: '#FFFFFF',
  success: '#159967',
  warning: '#A96700',
  successSoft: '#E4F5ED',
  warningSoft: '#FFF4DF',
  danger: '#D93A4F',
  dangerSoft: '#FCEBED',
  disabled: '#F2E4E9',
  callBackdrop: '#36112A',
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
