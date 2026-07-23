import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import type { StoreInfo } from '../../../types';
import './index.less';

interface StoreSwitcherProps {
  stores: StoreInfo[];
  loading: boolean;
  error: boolean;
  onSwitch: (storeId: string) => Promise<void>;
  onRetry: () => void;
  switching: boolean;
}

export default function StoreSwitcher({
  stores,
  loading,
  error,
  onSwitch,
  onRetry,
  switching,
}: StoreSwitcherProps) {
  const [confirmStore, setConfirmStore] = useState<StoreInfo | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleStoreTap = useCallback((store: StoreInfo) => {
    if (store.isActive) return;
    setConfirmStore(store);
  }, []);

  const handleConfirmSwitch = useCallback(async () => {
    if (!confirmStore) return;
    setConfirmLoading(true);
    try {
      await onSwitch(confirmStore.storeId);
      setConfirmStore(null);
      setConfirmLoading(false);
    } catch {
      setConfirmLoading(false);
    }
  }, [confirmStore, onSwitch]);

  const handleCancelConfirm = useCallback(() => {
    setConfirmStore(null);
  }, []);

  // Loading
  if (loading) {
    return (
      <View className='store-switcher'>
        <View className='store-switcher-header'>
          <Text className='store-switcher-title'>切换门店</Text>
        </View>
        {Array.from({ length: 3 }).map((_, idx) => (
          <View key={idx} className='store-switcher-item store-switcher-item--skeleton'>
            <View className='store-switcher-item-icon-skeleton' />
            <View className='store-switcher-item-body'>
              <View className='store-switcher-item-name-skeleton' />
              <View className='store-switcher-item-addr-skeleton' />
            </View>
          </View>
        ))}
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View className='store-switcher'>
        <View className='store-switcher-error'>
          <Text className='store-switcher-error-text'>门店列表加载失败</Text>
          <Button className='store-switcher-retry-btn' onClick={onRetry}>
            重试
          </Button>
        </View>
      </View>
    );
  }

  // Empty
  if (!loading && stores.length === 0) {
    return (
      <View className='store-switcher'>
        <View className='store-switcher-empty'>
          <Text className='store-switcher-empty-icon'>🏪</Text>
          <Text className='store-switcher-empty-text'>暂无关联门店，请联系管理员</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='store-switcher'>
      <View className='store-switcher-header'>
        <Text className='store-switcher-title'>切换门店</Text>
      </View>
      <ScrollView className='store-switcher-list' scrollY>
        {stores.map((store) => (
          <View
            key={store.storeId}
            className={`store-switcher-item ${
              store.isActive ? 'store-switcher-item--active' : ''
            }`}
            onClick={() => handleStoreTap(store)}
          >
            <View className='store-switcher-item-icon'>
              <Text className='store-switcher-item-icon-text'>🏪</Text>
            </View>
            <View className='store-switcher-item-body'>
              <Text className='store-switcher-item-name'>{store.name}</Text>
              <Text className='store-switcher-item-addr' numberOfLines={1}>
                {store.address || ''}
              </Text>
              <View className='store-switcher-item-role'>
                <Text className='store-switcher-item-role-text'>{store.role}</Text>
              </View>
            </View>
            <View className='store-switcher-item-right'>
              {store.isActive ? (
                <View className='store-switcher-item-active-tag'>
                  <Text className='store-switcher-item-active-icon'>✓</Text>
                  <Text className='store-switcher-item-active-text'>当前</Text>
                </View>
              ) : (
                <Text className='store-switcher-item-arrow'>{'>'}</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 确认切换弹窗 */}
      {confirmStore && (
        <View className='store-switcher-overlay' onClick={handleCancelConfirm}>
          <View
            className='store-switcher-modal'
            onClick={(e) => e.stopPropagation()}
          >
            <Text className='store-switcher-modal-title'>
              确认切换到「{confirmStore.name}」？
            </Text>
            <Text className='store-switcher-modal-desc'>
              切换后将使用该门店的数据进行操作
            </Text>
            <View className='store-switcher-modal-actions'>
              <Button
                className='store-switcher-modal-btn store-switcher-modal-btn--cancel'
                onClick={handleCancelConfirm}
              >
                取消
              </Button>
              <Button
                className='store-switcher-modal-btn store-switcher-modal-btn--confirm'
                onClick={handleConfirmSwitch}
                loading={confirmLoading}
                disabled={switching || confirmLoading}
              >
                {confirmLoading ? '切换中...' : '确认切换'}
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
