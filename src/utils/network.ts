import Taro from '@tarojs/taro';
import { useOfflineStore } from '../stores/offline-store';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

export function registerNetworkListener(): () => void {
  const handler = (res: Taro.onNetworkStatusChange.CallbackResult) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      const store = useOfflineStore.getState();

      if (!res.isConnected) {
        store.setOffline(true);
        Taro.eventCenter.trigger('network:offline');
      } else {
        store.setOffline(false);
        store.setRecovering();
        void store.flushSyncQueue();
        void store.loadManifest();
        Taro.eventCenter.trigger('network:online');
      }
    }, DEBOUNCE_MS);
  };

  Taro.onNetworkStatusChange(handler);

  // Immediately check current network
  Taro.getNetworkType().then((res) => {
    if (res.networkType === 'none') {
      useOfflineStore.getState().setOffline(true);
    }
  }).catch(() => {
    // 静默处理
  });

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    Taro.offNetworkStatusChange(handler);
  };
}
