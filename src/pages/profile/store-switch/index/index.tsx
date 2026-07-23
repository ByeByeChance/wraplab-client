import { useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { View } from '@tarojs/components';
import { useAuthStore } from '../../../../stores/auth-store';
import StoreSwitcher from '../../../../components/store/StoreSwitcher';
import './index.less';

export default function StoreSwitchPage() {
  const authStore = useAuthStore();
  const {
    storeList,
    storeListLoading,
    storeListError,
    storeSwitching,
    fetchMyStores,
    switchStore,
  } = authStore;

  useEffect(() => {
    if (storeList.length === 0) {
      void fetchMyStores();
    }
  }, []);

  const handleSwitch = useCallback(
    async (storeId: string) => {
      await switchStore(storeId);
      Taro.navigateBack({ delta: 1 });
    },
    [switchStore],
  );

  const handleRetry = useCallback(() => {
    void fetchMyStores();
  }, [fetchMyStores]);

  return (
    <View className='store-switch-page'>
      <StoreSwitcher
        stores={storeList}
        loading={storeListLoading}
        error={Boolean(storeListError)}
        onSwitch={handleSwitch}
        onRetry={handleRetry}
        switching={storeSwitching}
      />
    </View>
  );
}
