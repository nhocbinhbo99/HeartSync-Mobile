import { StyleSheet, Text } from 'react-native';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { colors, type } from '../../shared/theme/tokens';
import { useAuth } from './AuthProvider';

export function AuthLoadingScreen() {
  return <Screen safeTop contentStyle={styles.center}><AsyncStatePanel state="loading" title="Đang kiểm tra phiên"
    description="HeartSync đang khôi phục phiên đăng nhập đã lưu trên thiết bị." /></Screen>;
}

export function SetupRequiredScreen() {
  const { setupMessage } = useAuth();
  return <Screen safeTop contentStyle={styles.center}>
    <StatePanel eyebrow="Cần cấu hình" title="Kết nối Supabase để dùng đăng nhập"
      description={setupMessage ?? 'Supabase chưa được cấu hình. Ứng dụng vẫn mở an toàn và không thử kết nối bằng khóa giả.'} />
    <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_URL{`\n`}EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY</Text>
    <Text style={styles.note}>Sao chép heartsync/.env.example thành heartsync/.env, điền giá trị từ Supabase Connect, rồi khởi động lại Metro. Không commit file .env.</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  code: { ...type.label, color: colors.ink, backgroundColor: colors.surfaceMuted, padding: 16 },
  note: { ...type.body, color: colors.inkMuted },
});
