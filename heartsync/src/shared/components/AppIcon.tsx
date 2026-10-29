import type { ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';

type AppIconProps = { name: ComponentProps<typeof SymbolView>['name']; color: string; size?: number };
export function AppIcon({ name, color, size = 24 }: AppIconProps) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}
