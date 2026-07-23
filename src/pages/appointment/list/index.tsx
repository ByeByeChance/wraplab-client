import { useState, useCallback } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useAppointmentStore } from '../../../stores';
import StatusBadge from '../../../components/StatusBadge';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import type { Appointment } from '../../../types/phase3';
import './index.less';

const TABS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

const CANCEL_REASONS = [
  '行程变更',
  '选了其他门店',
  '暂时不需要',
  '其他',
];

const AppointmentList: React.FC = () => {
  const {
    appointments,
    appointmentsLoading,
    appointmentsError,
    appointmentStatusFilter,
    appointmentsHasMore,
    appointmentsRefreshing,
    cancelling,
    tabCounts,
    setStatusFilter,
    fetchMyAppointments,
    loadMoreAppointments,
    cancelAppointment,
  } = useAppointmentStore();

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelPanelVisible, setCancelPanelVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOtherReason, setCancelOtherReason] = useState('');
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

  useLoad(() => {
    fetchMyAppointments({ page: 1 });
  });

  const handleTabSwitch = useCallback(
    (status: string) => {
      setStatusFilter(status);
    },
    [setStatusFilter],
  );

  const handleItemTap = useCallback((item: Appointment) => {
    setSelectedAppointment(item);
    setDetailVisible(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setSelectedAppointment(null);
  }, []);

  const handleOpenCancelPanel = useCallback(() => {
    setDetailVisible(false);
    setCancelReason('');
    setCancelOtherReason('');
    setCancelPanelVisible(true);
  }, []);

  const handleSelectReason = useCallback((reason: string) => {
    setCancelReason(reason);
    if (reason !== '其他') {
      setCancelOtherReason('');
    }
  }, []);

  const handleConfirmCancelClick = useCallback(() => {
    if (!cancelReason) {
      Taro.showToast({ title: '请选择取消原因', icon: 'none' });
      return;
    }
    if (cancelReason === '其他' && !cancelOtherReason.trim()) {
      Taro.showToast({ title: '请填写取消原因', icon: 'none' });
      return;
    }
    setConfirmDialogVisible(true);
  }, [cancelReason, cancelOtherReason]);

  const handleDoCancel = useCallback(async () => {
    if (!selectedAppointment) return;
    const reason = cancelReason === '其他' ? cancelOtherReason : cancelReason;
    try {
      await cancelAppointment(selectedAppointment.id, reason);
      setConfirmDialogVisible(false);
      setCancelPanelVisible(false);
      setDetailVisible(false);
    } catch {
      // Error handled by store
    }
  }, [selectedAppointment, cancelReason, cancelOtherReason, cancelAppointment]);

  const isCancelable = (status: string): boolean => {
    return status === 'pending' || status === 'confirmed';
  };

  const formatTabCount = (tabKey: string): string => {
    const count = tabCounts[tabKey];
    if (count !== undefined) return String(count);
    return '--';
  };

  // Loading (first load)
  if (appointmentsLoading && appointments.length === 0) {
    return (
      <View className='list-page'>
        <View className='tab-bar'>
          {TABS.map((tab) => (
            <View key={tab.key} className='tab-item'>
              <Text className='tab-text'>{tab.label}</Text>
            </View>
          ))}
        </View>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} className='skeleton-item' style={{ margin: '8rpx 32rpx' }} />
        ))}
      </View>
    );
  }

  // Error (first load)
  if (appointmentsError && appointments.length === 0 && !appointmentsLoading) {
    return (
      <View className='list-page'>
        <ErrorState message={appointmentsError} onRetry={() => fetchMyAppointments({ page: 1 })} />
      </View>
    );
  }

  return (
    <View className='list-page'>
      {/* Tab bar */}
      <View className='tab-bar'>
        {TABS.map((tab) => {
          const active = appointmentStatusFilter === tab.key;
          return (
            <View
              key={tab.key}
              className='tab-item'
              onClick={() => handleTabSwitch(tab.key)}
            >
              <View className='tab-label-row'>
                <Text className={active ? 'tab-text-active' : 'tab-text'}>
                  {tab.label}
                </Text>
                <Text className={active ? 'tab-count-active' : 'tab-count'}>
                  {formatTabCount(tab.key)}
                </Text>
              </View>
              {active && <View className='tab-indicator' />}
            </View>
          );
        })}
      </View>

      {/* Empty */}
      {appointments.length === 0 && !appointmentsLoading && !appointmentsError && (
        <EmptyState
          icon='📅'
          message={appointmentStatusFilter ? '暂无该状态的预约' : '暂无预约记录'}
          actionText={!appointmentStatusFilter ? '去预约' : undefined}
          onAction={!appointmentStatusFilter ? () => Taro.switchTab({ url: '/pages/store/index' }) : undefined}
        />
      )}

      {/* List */}
      {appointments.map((item) => (
        <View
          key={item.id}
          className='appointment-item'
          onClick={() => handleItemTap(item)}
        >
          <View className='item-row-1'>
            <Text className='item-no'>{item.appointmentNo}</Text>
            <StatusBadge status={item.status} size='small' />
          </View>
          <Text className='item-store-name'>{item.storeName}</Text>
          <Text className='item-service'>{item.serviceType}</Text>
          <Text className='item-date'>
            {item.appointmentDate} {item.timeSlot}
          </Text>
          <Text className='item-created'>
            创建于 {item.createdAt}
          </Text>
        </View>
      ))}

      {/* Load more */}
      {appointments.length > 0 && (
        <View className='list-footer'>
          {appointmentsRefreshing && (
            <Text className='list-footer-refreshing'>正在刷新...</Text>
          )}
          {!appointmentsRefreshing && appointmentsHasMore && !appointmentsLoading && (
            <View onClick={loadMoreAppointments}>
              <Text className='list-footer-action'>加载更多</Text>
            </View>
          )}
          {!appointmentsRefreshing && !appointmentsHasMore && (
            <Text className='list-footer-text'>没有更多了</Text>
          )}
          {!appointmentsRefreshing && appointmentsLoading && (
            <Text className='list-footer-text'>加载中...</Text>
          )}
        </View>
      )}

      {/* Detail popup */}
      {detailVisible && selectedAppointment && (
        <>
          <View className='popup-mask' onClick={handleCloseDetail} />
          <View className='popup-panel'>
            <View className='popup-handle'>
              <View className='popup-handle-bar' />
            </View>
            <View className='popup-content'>
              <Text className='popup-title'>预约详情</Text>

              <View className='popup-row'>
                <Text className='popup-label'>预约编号</Text>
                <Text className='popup-value'>{selectedAppointment.appointmentNo}</Text>
              </View>
              <View className='popup-row popup-row-status'>
                <View className='popup-row-status-inner'>
                  <Text className='popup-label'>状态</Text>
                  <StatusBadge status={selectedAppointment.status} />
                </View>
              </View>
              <View className='popup-row'>
                <Text className='popup-label'>门店</Text>
                <Text className='popup-value'>{selectedAppointment.storeName}</Text>
              </View>
              <View className='popup-row'>
                <Text className='popup-label'>服务类型</Text>
                <Text className='popup-value'>{selectedAppointment.serviceType}</Text>
              </View>
              <View className='popup-row'>
                <Text className='popup-label'>预约时间</Text>
                <Text className='popup-value'>
                  {selectedAppointment.appointmentDate} {selectedAppointment.timeSlot}
                </Text>
              </View>
              <View className='popup-row'>
                <Text className='popup-label'>联系人</Text>
                <Text className='popup-value'>
                  {selectedAppointment.customerName} {selectedAppointment.customerPhone}
                </Text>
              </View>
              {selectedAppointment.vehicleInfo && (
                <View className='popup-row'>
                  <Text className='popup-label'>车辆信息</Text>
                  <Text className='popup-value'>{selectedAppointment.vehicleInfo}</Text>
                </View>
              )}
              {selectedAppointment.remark && (
                <View className='popup-row'>
                  <Text className='popup-label'>备注</Text>
                  <Text className='popup-value'>{selectedAppointment.remark}</Text>
                </View>
              )}
              <View className='popup-row'>
                <Text className='popup-label'>创建时间</Text>
                <Text className='popup-value'>{selectedAppointment.createdAt}</Text>
              </View>

              <View className='popup-buttons'>
                {isCancelable(selectedAppointment.status) && (
                  <View className='popup-btn-cancel' onClick={handleOpenCancelPanel}>
                    <Text className='popup-btn-cancel-text'>取消预约</Text>
                  </View>
                )}
                <View className='popup-btn-close' onClick={handleCloseDetail}>
                  <Text className='popup-btn-close-text'>关闭</Text>
                </View>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Cancel reason panel */}
      {cancelPanelVisible && (
        <>
          <View className='popup-mask' onClick={() => setCancelPanelVisible(false)} />
          <View className='popup-panel'>
            <View className='popup-handle'>
              <View className='popup-handle-bar' />
            </View>
            <View className='reason-panel'>
              <View className='reason-title'>
                <Text className='reason-title-text'>
                  选择取消原因
                </Text>
                <View onClick={() => setCancelPanelVisible(false)}>
                  <Text className='reason-close'>×</Text>
                </View>
              </View>

              {CANCEL_REASONS.map((reason) => (
                <View
                  key={reason}
                  className='reason-option'
                  onClick={() => handleSelectReason(reason)}
                >
                  <View
                    className={`radio-circle ${cancelReason === reason ? 'radio-circle-selected' : ''}`}
                  >
                    {cancelReason === reason && <View className='radio-dot' />}
                  </View>
                  <Text className='reason-label'>{reason}</Text>
                </View>
              ))}

              {cancelReason === '其他' && (
                <Input
                  className='reason-input'
                  placeholder='请填写取消原因'
                  maxlength={100}
                  value={cancelOtherReason}
                  onInput={(e) => setCancelOtherReason(e.detail.value)}
                />
              )}

              <View
                className='btn-cancel-confirm'
                onClick={handleConfirmCancelClick}
              >
                <Text className='btn-cancel-confirm-text'>
                  确认取消
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Confirm dialog */}
      {confirmDialogVisible && (
        <View className='confirm-dialog-mask'>
          <View className='confirm-dialog'>
            <Text className='dialog-title'>确认取消预约?</Text>
            <Text className='dialog-desc'>取消后可能需要重新预约</Text>
            <View className='dialog-buttons'>
              <View
                className='dialog-btn dialog-btn-secondary'
                onClick={() => setConfirmDialogVisible(false)}
              >
                <Text className='dialog-btn-text'>再想想</Text>
              </View>
              <View
                className='dialog-btn dialog-btn-danger'
                onClick={handleDoCancel}
              >
                <Text className='dialog-btn-text-white'>
                  {cancelling ? '取消中...' : '确认取消'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default AppointmentList;
