import { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useAppointmentStore } from '../../../stores';
import StatusBadge from '../../../components/StatusBadge';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import type { Appointment } from '../../../types/phase3';
import './index.less';

const TIME_SLOT_LABELS: Record<string, string> = {
  MORNING: '上午',
  AFTERNOON: '下午',
  EVENING: '晚间',
};

const AppointmentConfirm: React.FC = () => {
  const {
    fetchAppointmentDetail,
  } = useAppointmentStore();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  useLoad((options) => {
    // First check lastCreatedAppointment (from create flow)
    const lastCreated = useAppointmentStore.getState().lastCreatedAppointment;
    if (lastCreated) {
      setAppointment(lastCreated);
      setAppointmentId(lastCreated.id);
      setShowAnimation(true);
      return;
    }

    // If direct URL access, fetch from API
    const id = options?.id;
    if (id) {
      setAppointmentId(id);
      loadDetail(id);
    }
  });

  useEffect(() => {
    // trigger animation on mount
    const timer = setTimeout(() => setShowAnimation(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const loadDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchAppointmentDetail(id);
      const detail = useAppointmentStore.getState().currentAppointmentDetail;
      setAppointment(detail);
      setLoading(false);
    } catch {
      setLoading(false);
      setError('预约数据加载失败');
    }
  };

  const handleViewAppointments = () => {
    Taro.navigateTo({ url: '/pages/appointment/list/index' });
  };

  const handleBackHome = () => {
    Taro.switchTab({ url: '/pages/home/index' });
  };

  // Loading
  if (loading) {
    return (
      <View className='confirm-page'>
        <View className='detail-card'>
          <View className='detail-card-title'>预约详情</View>
          {[60, 80, 60, 80, 60, 60].map((width, i) => (
            <View key={i} className='skeleton-line' style={{ width: `${width}%` }} />
          ))}
        </View>
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View className='confirm-page'>
        <ErrorState
          message={error}
          onRetry={appointmentId ? () => loadDetail(appointmentId) : undefined}
        />
      </View>
    );
  }

  // Empty
  if (!appointment) {
    return (
      <View className='confirm-page'>
        <EmptyState
          icon='📋'
          message='预约信息不存在'
          actionText='返回首页'
          onAction={handleBackHome}
        />
      </View>
    );
  }

  // Success
  const timeSlotLabel = TIME_SLOT_LABELS[appointment.timeSlot] || appointment.timeSlot;

  return (
    <View className='confirm-page'>
      {/* Success animation */}
      <View className='success-animation-area'>
        <View className={`checkmark-circle ${showAnimation ? '' : 'hidden'}`}>
          <Text className='checkmark-icon'>✓</Text>
        </View>
        <Text className={`success-text ${showAnimation ? '' : 'hidden'}`}>
          预约提交成功!
        </Text>
      </View>

      {/* Detail card */}
      <View className='detail-card'>
        <Text className='detail-card-title'>预约详情</Text>

        <View className='detail-row-header'>
          <View className='detail-row-header-inner'>
            <Text className='detail-label detail-label-auto'>预约编号</Text>
          </View>
          <StatusBadge status={appointment.status} />
        </View>
        <View className='detail-row'>
          <Text className='detail-value detail-value-sub'>
            {appointment.appointmentNo}
          </Text>
        </View>

        <View className='detail-row'>
          <Text className='detail-label'>预约门店</Text>
          <Text className='detail-value'>{appointment.storeName}</Text>
        </View>

        <View className='detail-row'>
          <Text className='detail-label'>服务类型</Text>
          <Text className='detail-value'>{appointment.serviceType}</Text>
        </View>

        <View className='detail-row'>
          <Text className='detail-label'>预约日期</Text>
          <Text className='detail-value'>{appointment.appointmentDate}</Text>
        </View>

        <View className='detail-row'>
          <Text className='detail-label'>预约时段</Text>
          <Text className='detail-value'>{timeSlotLabel}</Text>
        </View>

        <View className='detail-row'>
          <Text className='detail-label'>联系人</Text>
          <Text className='detail-value'>
            {appointment.customerName} {appointment.customerPhone}
          </Text>
        </View>

        {appointment.vehicleInfo && (
          <View className='detail-row'>
            <Text className='detail-label'>车辆信息</Text>
            <Text className='detail-value'>{appointment.vehicleInfo}</Text>
          </View>
        )}

        {appointment.remark && (
          <View className='detail-row'>
            <Text className='detail-label'>备注</Text>
            <Text className='detail-value'>{appointment.remark}</Text>
          </View>
        )}
      </View>

      {/* Buttons */}
      <View className='bottom-buttons'>
        <View className='btn-primary' onClick={handleViewAppointments}>
          <Text className='btn-primary-text'>查看我的预约</Text>
        </View>
        <View className='btn-secondary' onClick={handleBackHome}>
          <Text className='btn-secondary-text'>返回首页</Text>
        </View>
      </View>
    </View>
  );
};

export default AppointmentConfirm;
