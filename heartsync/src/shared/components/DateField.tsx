import { useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme/tokens';
import { InlineFieldError } from './InlineFieldError';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string) {
  if (!DATE_ONLY.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function displayDate(value: Date) {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${value.getFullYear()}`;
}

type Props = { label: string; value: string; onChange: (value: string) => void; maximumDate: Date; minimumDate?: Date; error?: string; disabled?: boolean };

export function DateField({ label, value, onChange, maximumDate, minimumDate, error, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseDate(value) ?? maximumDate, [maximumDate, value]);
  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'set' && date) onChange(dateOnly(date));
  };
  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
      onPress={() => setOpen(true)} style={({ pressed }) => [styles.field, error && styles.fieldError, disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.value, !value && styles.placeholder]}>{value ? displayDate(selected) : 'Chọn ngày sinh'}</Text>
      <Text aria-hidden style={styles.disclosure}>Chọn ngày</Text>
    </Pressable>
    <InlineFieldError message={error} />
    {open ? <DateTimePicker value={selected} mode="date" display="default" maximumDate={maximumDate}
      minimumDate={minimumDate} onChange={handleChange} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs }, label: { ...type.label, color: colors.ink },
  field: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.background, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldError: { borderColor: colors.danger }, value: { ...type.body, color: colors.ink, flex: 1 },
  placeholder: { color: colors.inkMuted }, disclosure: { ...type.label, color: colors.primaryPressed },
  disabled: { opacity: 0.55 }, pressed: { opacity: 0.72 },
});
