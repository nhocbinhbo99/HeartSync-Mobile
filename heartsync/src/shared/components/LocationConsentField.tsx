import { StyleSheet, Text, View } from 'react-native';
import { feedback } from '../motion/feedback';
import { colors, radii, spacing, type } from '../theme/tokens';
import { AppIcon } from './AppIcon';
import { PinkSwitch } from './PinkSwitch';

type Props = { value: boolean; onChange: (value: boolean) => void; disabled?: boolean; hasCoordinates: boolean };

export function LocationConsentField({ value, onChange, disabled = false, hasCoordinates }: Props) {
  const active = value && hasCoordinates;
  return (
    <View style={styles.container}>
      <View style={[styles.icon, active && styles.iconActive]}>
        <AppIcon
          name={active ? 'location' : 'locationOff'}
          color={active ? '#FFFFFF' : colors.inkMuted}
          size={20}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Dùng vị trí cho bộ lọc khoảng cách</Text>
        <Text style={styles.body}>
          {value && hasCoordinates
            ? 'Đã có vị trí riêng tư. Người khác không nhìn thấy tọa độ của bạn.'
            : 'Khi tắt, bộ lọc khoảng cách sẽ tự chuyển thành không giới hạn.'}
        </Text>
      </View>
      <PinkSwitch
        accessibilityLabel="Dùng vị trí cho bộ lọc khoảng cách"
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          feedback(next ? 'toggleOn' : 'toggleOff');
          onChange(next);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#F3D6E2',
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#D67094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F4EEF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: colors.primary,
  },
  copy: { flex: 1, gap: spacing.xxs },
  title: { ...type.label, color: colors.ink },
  body: { ...type.caption, color: colors.inkMuted },
});
