import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppTextField } from '../../shared/components/AppTextField';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { useSnackbar } from '../../shared/components/Snackbar';
import { colors, spacing, type } from '../../shared/theme/tokens';
import { useAuth } from './AuthProvider';
import { validatePassword } from './validation';

export function UpdatePasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const snackbar = useSnackbar();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!validatePassword(password)) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      snackbar.show({ message: 'Mật khẩu cần có ít nhất 8 ký tự.', tone: 'error' });
      return;
    }
    setBusy(true); setError(undefined); setNotice(undefined);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.ok) { const message = result.notice ?? 'Mật khẩu đã được cập nhật.'; setNotice(message); snackbar.show({ message, tone: 'success' }); }
    else { setError(result.message); snackbar.show({ message: result.message, tone: 'error' }); }
  };

  return <Screen safeTop keyboardAware contentStyle={styles.page}>
    <View style={styles.mark}><AppIcon name="lock" color={colors.primaryPressed} size={24} /></View>
    <Text accessibilityRole="header" style={styles.title}>Đặt mật khẩu mới</Text>
    <Text style={styles.body}>Liên kết khôi phục đã được xác nhận. Chọn mật khẩu mới cho tài khoản này.</Text>
    <AppTextField label="Mật khẩu mới" secureTextEntry={!visible} autoComplete="new-password" value={password}
      onChangeText={setPassword} error={error} rightAccessory={<IconButton icon={visible ? 'eyeOff' : 'eye'} label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setVisible((current) => !current)} />} />
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    <AppButton label={busy ? 'Đang cập nhật' : 'Cập nhật mật khẩu'} loading={busy} trailingIcon="check" disabled={busy} onPress={() => void submit()} />
    <AppButton label="Hủy và đăng xuất" variant="quiet" leadingIcon="back" onPress={() => void signOut()} />
  </Screen>;
}
const styles = StyleSheet.create({
  page: { justifyContent: 'center' }, title: { ...type.display, color: colors.ink },
  body: { ...type.body, color: colors.inkMuted, marginBottom: spacing.md },
  mark: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  notice: { ...type.body, color: colors.success },
});
