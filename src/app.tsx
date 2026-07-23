import { useEffect } from 'react';
import { useLaunch } from '@tarojs/taro';
import { useAuthStore } from './stores/auth-store';
import { useOfflineStore } from './stores/offline-store';
import { registerNetworkListener } from './utils/network';
import OfflineIndicator from './components/network/OfflineIndicator';
import './app.less';

function App({ children }: { children: React.ReactNode }) {
  const { restoreSession } = useAuthStore();
  const { isOffline, isRecovering, isFirstOffline, dismissFirstOfflineGuide } = useOfflineStore();

  useLaunch(() => {
    // 应用启动时恢复登录态
    restoreSession();
  });

  useEffect(() => {
    // Phase 5: 注册全局网络状态监听
    const unregister = registerNetworkListener();
    return () => unregister();
  }, []);

  return (
    <>
      {/* Phase 5: 离线指示器 (全局置顶) */}
      <OfflineIndicator
        isOffline={isOffline}
        isRecovering={isRecovering}
        isFirstOffline={isFirstOffline}
        onDismissGuide={dismissFirstOfflineGuide}
      />
      {children}
    </>
  );
}

export default App;
