import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { useAuth } from '../auth/AuthProvider';
import { ProfileEditor } from './ProfileEditor';

export function ProfileSetupScreen() {
  const { user, signOut } = useAuth();
  if (!user) return <Screen><StatePanel title="Phiên đăng nhập không hợp lệ" description="Hãy đăng nhập lại để hoàn thiện hồ sơ." /></Screen>;
  return <ProfileEditor mode="setup" onCancel={() => void signOut()} />;
}
