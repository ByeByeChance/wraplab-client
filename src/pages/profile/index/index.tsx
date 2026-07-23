import { useState, useCallback, useEffect } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import { useAuthStore } from '../../../stores/auth-store';
import { useCustomerCareStore } from '../../../stores/customer-care-store';
import { useWaitlistStore } from '../../../stores/waitlist-store';
import { configService } from '../../../services';
import SchemeListItem from '../../../components/SchemeListItem';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import CustomerCareBanner from '../../../components/CustomerCareBanner/index';
import WaitlistCard from '../../../components/waitlist/WaitlistCard';
import { navigateToDesign, navigateToRanking, navigateToStoreSwitch } from '../../../utils/navigate';
import type { Configuration } from '../../../types';
import './index.less';

export default function ProfilePage() {
  const authStore = useAuthStore();
  const { staff, logout, storeList, fetchMyStores } = authStore;

  const {
    birthdays,
    anniversaries,
    loading: careLoading,
    error: careError,
    fetchCareReminders,
  } = useCustomerCareStore();

  const {
    waitlist,
    loading: waitlistLoading,
    error: waitlistError,
    fetchMyWaitlist,
    leaveWaitlist,
  } = useWaitlistStore();

  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [waitlistExpanded, setWaitlistExpanded] = useState(false);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [configsError, setConfigsError] = useState<string | null>(null);
  const [configsPage, setConfigsPage] = useState(1);
  const [configsHasMore, setConfigsHasMore] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [careExpanded, setCareExpanded] = useState(false);

  // Fetch customer care reminders
  useEffect(() => {
    void fetchCareReminders(30);
  }, [fetchCareReminders]);

  // Phase 5: Fetch stores and waitlist on show
  useDidShow(() => {
    // SF-9: Skip fetchMyStores if already loaded
    if (storeList.length === 0) {
      void fetchMyStores();
    }
    if (staff?.phone) {
      void fetchMyWaitlist(staff.phone);
    }
  });

  /** 加载历史方案 */
  const fetchConfigurations = useCallback(async (page: number = 1) => {
    setConfigsLoading(true);
    setConfigsError(null);
    try {
      const res = await configService.getConfigurations({ page, limit: 10 });
      if (page === 1) {
        setConfigurations(res.items);
      } else {
        setConfigurations((prev) => [...prev, ...res.items]);
      }
      setConfigsHasMore(res.items.length === 10);
      setConfigsLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '方案加载失败';
      setConfigsError(message);
      setConfigsLoading(false);
    }
  }, []);

  /** 切换历史方案展开/收起 */
  const toggleHistory = useCallback(() => {
    const newExpanded = !historyExpanded;
    setHistoryExpanded(newExpanded);
    if (newExpanded && configurations.length === 0) {
      fetchConfigurations(1);
    }
  }, [historyExpanded, configurations.length, fetchConfigurations]);

  /** 加载更多 */
  const loadMore = useCallback(() => {
    if (configsLoading || !configsHasMore) return;
    const nextPage = configsPage + 1;
    setConfigsPage(nextPage);
    fetchConfigurations(nextPage);
  }, [configsLoading, configsHasMore, configsPage, fetchConfigurations]);

  /** 点击方案项 */
  const handleConfigTap = useCallback((config: Configuration) => {
    if (config.modelId) {
      navigateToDesign({ modelId: config.modelId, configurationId: config.id });
    }
  }, []);

  /** 退出登录 */
  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const confirmLogout = useCallback(() => {
    setShowLogoutConfirm(false);
    logout();
  }, [logout]);

  const cancelLogout = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  /** 关于 */
  const handleAbout = useCallback(() => {
    Taro.showModal({
      title: '关于 WrapLab',
      content: 'WrapLab 车衣实验室 v1.0.0\n车衣改色选色报价小程序\n(c) 2026 WrapLab',
      showCancel: false,
    });
  }, []);

  /** 设置 (Placeholder) */
  const handleSettings = useCallback(() => {
    Taro.showToast({ title: '功能开发中', icon: 'none' });
  }, []);

  /** 我的候补 -- 展开/收起 */
  const toggleWaitlist = useCallback(() => {
    setWaitlistExpanded((prev) => !prev);
    if (staff?.phone) {
      void fetchMyWaitlist(staff.phone);
    }
  }, [staff?.phone, fetchMyWaitlist]);

  /** 取消候补 */
  const handleCancelWaitlist = useCallback((waitlistId: string) => {
    void leaveWaitlist(waitlistId);
  }, [leaveWaitlist]);

  /** 候补项点击 */
  const handleWaitlistPress = useCallback((_waitlistId: string) => {
    Taro.showToast({ title: '预约详情功能开发中', icon: 'none' });
  }, []);

  /** 渲染候补列表内容 */
  const renderWaitlistContent = useCallback(() => {
    // Loading state
    if (waitlistLoading) {
      return (
        <View className='profile-waitlist-panel'>
          <LoadingSkeleton type='list-item' count={3} />
        </View>
      );
    }

    // Error state
    if (waitlistError) {
      return (
        <View className='profile-waitlist-panel'>
          <ErrorState
            message={waitlistError}
            onRetry={() => {
              if (staff?.phone) {
                void fetchMyWaitlist(staff.phone);
              }
            }}
          />
        </View>
      );
    }

    // Empty state
    if (waitlist.length === 0) {
      return (
        <View className='profile-waitlist-panel'>
          <EmptyState
            icon='📋'
            message='暂无候补'
            subMessage='暂未加入任何候补队列'
          />
        </View>
      );
    }

    // Success state
    return (
      <View className='profile-waitlist-panel'>
        {waitlist.map((entry) => (
          <WaitlistCard
            key={entry.waitlistId}
            entry={entry}
            actionable={entry.status === 'waiting'}
            onPress={handleWaitlistPress}
            onCancel={handleCancelWaitlist}
          />
        ))}
      </View>
    );
  }, [waitlistLoading, waitlistError, waitlist, staff?.phone, fetchMyWaitlist, handleWaitlistPress, handleCancelWaitlist]);

  return (
    <View className='page-container'>
      <ScrollView className='page-scroll' onScrollToLower={historyExpanded ? loadMore : undefined}>
        <View className='profile-content'>
          {/* Phase 4: Customer Care Banner */}
          <CustomerCareBanner
            birthdayCount={birthdays.length}
            anniversaryCount={anniversaries.length}
            loading={careLoading}
            error={careError}
            expanded={careExpanded}
            onViewDetail={() => {
              Taro.showToast({ title: '我的客户功能开发中', icon: 'none' });
            }}
            onToggleExpand={() => setCareExpanded(!careExpanded)}
            onRetry={() => { void fetchCareReminders(30); }}
          />

          {/* 用户信息卡片 */}
          <View className='profile-user-card'>
            <View className='profile-user-avatar'>
              <Text className='profile-user-avatar-text'>
                {staff?.name?.charAt(0) || '店'}
              </Text>
            </View>
            <View className='profile-user-info'>
              <Text className='profile-user-name'>{staff?.name || '店员'}</Text>
              <Text className='profile-user-store'>{staff?.storeName || '门店名称'}</Text>
            </View>
          </View>

          {/* Phase 5: 当前门店展示行 (仅多门店店员展示) */}
          {storeList.length > 1 && (
            <View
              className='profile-store-row'
              onClick={() => navigateToStoreSwitch()}
            >
              <Text className='profile-store-row-icon'>🏪</Text>
              <Text className='profile-store-row-name'>
                {storeList.find((s) => s.isActive)?.name || staff?.storeName || '当前门店'}
              </Text>
              <Text className='profile-store-row-arrow'>{'>'}</Text>
            </View>
          )}

          {/* 功能列表 */}
          <View className='profile-menu'>
            {/* Phase 5: 我的候补 (inline expand) */}
            <View className='profile-menu-item' onClick={toggleWaitlist}>
              <Text className='profile-menu-icon'>📋</Text>
              <Text className='profile-menu-text'>我的候补</Text>
              {waitlist.length > 0 && (
                <Text className='profile-menu-badge'>{waitlist.length}</Text>
              )}
              <Text className='profile-menu-arrow'>{waitlistExpanded ? '▼' : '>'}</Text>
            </View>

            {waitlistExpanded && renderWaitlistContent()}

            {/* 历史配置方案 */}
            <View className='profile-menu-item' onClick={toggleHistory}>
              <Text className='profile-menu-icon'>📋</Text>
              <Text className='profile-menu-text'>历史配置方案</Text>
              <Text className='profile-menu-arrow'>{historyExpanded ? '▼' : '>'}</Text>
            </View>

            {/* 展开的方案列表 */}
            {historyExpanded && (
              <View className='profile-history-panel'>
                {configsLoading && configurations.length === 0 ? (
                  <LoadingSkeleton type='list-item' count={4} />
                ) : configsError && configurations.length === 0 ? (
                  <ErrorState
                    message={configsError}
                    onRetry={() => fetchConfigurations(1)}
                  />
                ) : configurations.length === 0 ? (
                  <EmptyState
                    message='暂无改色方案'
                    subMessage='去为客户创建一个改色方案吧'
                    actionText='去创建'
                    onAction={() => Taro.switchTab({ url: '/pages/home/index' })}
                  />
                ) : (
                  <View>
                    {configurations.map((config) => (
                      <SchemeListItem
                        key={config.id}
                        scheme={config}
                        onTap={handleConfigTap}
                      />
                    ))}
                    {configsLoading && (
                      <Text className='profile-load-more-text'>加载中...</Text>
                    )}
                    {!configsHasMore && configurations.length > 0 && (
                      <Text className='profile-load-more-end'>—— 没有更多了 ——</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Phase 4: 我的客户 */}
            <View className='profile-menu-item' onClick={() => {
              Taro.showToast({ title: '我的客户功能开发中', icon: 'none' });
            }}
            >
              <Text className='profile-menu-icon'>👥</Text>
              <Text className='profile-menu-text'>我的客户</Text>
              <Text className='profile-menu-arrow'>{'>'}</Text>
            </View>

            {/* Phase 4: 排行榜入口 */}
            <View className='profile-menu-item' onClick={() => navigateToRanking()}>
              <Text className='profile-menu-icon'>🏆</Text>
              <Text className='profile-menu-text'>案例排行榜</Text>
              <Text className='profile-menu-arrow'>{'>'}</Text>
            </View>

            {/* 设置 */}
            <View className='profile-menu-item' onClick={handleSettings}>
              <Text className='profile-menu-icon'>⚙️</Text>
              <Text className='profile-menu-text'>设置</Text>
              <Text className='profile-menu-arrow'>{'>'}</Text>
            </View>

            {/* 关于 */}
            <View className='profile-menu-item' onClick={handleAbout}>
              <Text className='profile-menu-icon'>ℹ️</Text>
              <Text className='profile-menu-text'>关于 WrapLab</Text>
              <Text className='profile-menu-arrow'>{'>'}</Text>
            </View>
          </View>

          {/* 退出登录 */}
          <View className='profile-logout'>
            <Button className='profile-logout-btn' onClick={handleLogout}>
              退出登录
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* 退出确认弹窗 */}
      {showLogoutConfirm && (
        <View className='profile-modal-overlay' onClick={cancelLogout}>
          <View className='profile-modal' onClick={(e) => e.stopPropagation()}>
            <Text className='profile-modal-title'>确定要退出登录吗？</Text>
            <View className='profile-modal-actions'>
              <Button className='profile-modal-btn profile-modal-btn--cancel' onClick={cancelLogout}>
                取消
              </Button>
              <Button className='profile-modal-btn profile-modal-btn--confirm' onClick={confirmLogout}>
                确定退出
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
