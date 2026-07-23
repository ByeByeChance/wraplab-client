import { useState, useCallback, useMemo } from 'react';
import { View, Text, Input, Textarea } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useStoreStore, useAppointmentStore, useAuthStore, useWaitlistStore } from '../../../stores';
import Steps from '../../../components/Steps';
import StoreCard from '../../../components/StoreCard';
import TimeSlotPicker from '../../../components/TimeSlotPicker';
import type { NearbyStore, TimeSlot } from '../../../types/phase3';
import './index.less';

const STEPS = [
  { title: '选择门店' },
  { title: '服务类型' },
  { title: '时间&信息' },
];

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const AppointmentCreate: React.FC = () => {
  const {
    nearbyStores,
    nearbyStoresLoading,
    nearbyStoresError,
    fetchNearbyStores,
  } = useStoreStore();

  const {
    selectedStoreId,
    selectedServiceType,
    selectedDate,
    selectedTimeSlot,
    serviceTypes,
    serviceTypesLoading,
    serviceTypesError,
    timeSlots,
    timeSlotsLoading,
    timeSlotsError,
    submitting,
    setStepData,
    fetchServiceTypes,
    fetchTimeSlots,
    submitAppointment,
    resetCreateState,
    isDraftExpired,
    lastUpdatedAt,
  } = useAppointmentStore();

  const staff = useAuthStore((s) => s.staff);

  const {
    joinWaitlist,
    submitting: waitlistSubmitting,
  } = useWaitlistStore();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [remark, setRemark] = useState('');
  const [remarkLen, setRemarkLen] = useState(0);

  // Phase 5: Waitlist state
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistSlot, setWaitlistSlot] = useState<TimeSlot | null>(null);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  useLoad((options) => {
    // Check draft expiry
    if (lastUpdatedAt && isDraftExpired()) {
      resetCreateState();
      Taro.showToast({ title: '预约信息已过期，请重新填写', icon: 'none' });
    }

    // Pre-select store from route
    const storeId = options?.storeId;
    if (storeId) {
      setStepData({ selectedStoreId: storeId });
    }

    // Pre-fill customer info
    if (staff) {
      setCustomerName(staff.name || '');
      setCustomerPhone(staff.phone || '');
    }

    // Load data
    const loc = useStoreStore.getState().userLocation;
    if (loc) {
      fetchNearbyStores({ lat: loc.latitude, lng: loc.longitude });
    }
    fetchServiceTypes();
  });

  const canNextStep1 = !!selectedStoreId;
  const canNextStep2 = !!selectedServiceType;

  const canSubmit =
    customerName.length >= 2 &&
    customerName.length <= 20 &&
    /^1[3-9]\d{9}$/.test(customerPhone) &&
    !!selectedDate &&
    !!selectedTimeSlot;

  const handleNext = useCallback(() => {
    if (currentStep === 0 && !canNextStep1) {
      Taro.showToast({ title: '请选择门店', icon: 'none' });
      return;
    }
    if (currentStep === 1 && !canNextStep2) {
      Taro.showToast({ title: '请选择服务类型', icon: 'none' });
      return;
    }
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      Taro.pageScrollTo({ scrollTop: 0 });
    }
  }, [currentStep, canNextStep1, canNextStep2]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      Taro.pageScrollTo({ scrollTop: 0 });
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!customerName) { Taro.showToast({ title: '请输入姓名', icon: 'none' }); return; }
      if (customerName.length < 2) { Taro.showToast({ title: '姓名至少2个字符', icon: 'none' }); return; }
      if (!customerPhone) { Taro.showToast({ title: '请输入手机号', icon: 'none' }); return; }
      if (!/^1[3-9]\d{9}$/.test(customerPhone)) { Taro.showToast({ title: '请输入正确的手机号', icon: 'none' }); return; }
      if (!selectedDate) { Taro.showToast({ title: '请选择预约日期', icon: 'none' }); return; }
      if (!selectedTimeSlot) { Taro.showToast({ title: '请选择可用时段', icon: 'none' }); return; }
      return;
    }

    try {
      await submitAppointment({
        storeId: selectedStoreId!,
        serviceType: selectedServiceType!,
        appointmentDate: selectedDate!,
        timeSlot: selectedTimeSlot!,
        customerName,
        customerPhone,
        vehicleInfo: vehicleInfo || undefined,
        remark: remark || undefined,
      });
      Taro.redirectTo({
        url: '/pages/appointment/confirm/index',
      });
    } catch (error) {
      // Error toast handled by store
    }
  };

  const handleSelectStore = useCallback(
    (store: NearbyStore) => {
      setStepData({ selectedStoreId: store.id });
    },
    [setStepData],
  );

  const handleSelectServiceType = useCallback(
    (code: string) => {
      setStepData({ selectedServiceType: code });
    },
    [setStepData],
  );

  const handleSelectDate = useCallback(
    (date: string) => {
      setStepData({ selectedDate: date, selectedTimeSlot: undefined });
      if (selectedStoreId) {
        fetchTimeSlots(selectedStoreId, date);
      }
    },
    [selectedStoreId, setStepData, fetchTimeSlots],
  );

  const handleSelectTimeSlot = useCallback(
    (slot: string) => {
      setStepData({ selectedTimeSlot: slot });
    },
    [setStepData],
  );

  // Phase 5: Waitlist handlers
  const handleOpenWaitlist = useCallback((slot: TimeSlot) => {
    setWaitlistSlot(slot);
    setShowWaitlistForm(true);
    setWaitlistSuccess(false);
    setWaitlistPosition(null);
  }, []);

  const handleDismissWaitlist = useCallback(() => {
    setShowWaitlistForm(false);
    setWaitlistSlot(null);
    setWaitlistSuccess(false);
    setWaitlistPosition(null);
  }, []);

  const handleSubmitWaitlist = useCallback(async () => {
    if (!waitlistSlot || !selectedStoreId || !selectedDate) return;
    if (!customerName || customerName.length < 2) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(customerPhone)) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    try {
      const result = await joinWaitlist({
        date: selectedDate,
        timeSlotId: waitlistSlot.timeSlot,
        storeId: selectedStoreId,
        customerName,
        customerPhone,
        vehicleInfo: vehicleInfo || '',
        serviceType: selectedServiceType || '',
      });
      setWaitlistSuccess(true);
      setWaitlistPosition(result.position);
    } catch {
      // Error toast handled by store
    }
  }, [waitlistSlot, selectedStoreId, selectedDate, customerName, customerPhone, vehicleInfo, selectedServiceType, joinWaitlist]);

  // Calendar generation - next 30 days
  const calendarDates = useMemo(() => {
    const today = new Date();
    const dates: Array<{
      dateStr: string;
      day: number;
      weekday: number;
      isPast: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = i === 0;
      dates.push({
        dateStr,
        day: d.getDate(),
        weekday: d.getDay() || 7, // Sunday = 7
        isPast: false, // All future 30 days are selectable
        isSelected: selectedDate === dateStr,
        isToday,
      });
    }
    return dates;
  }, [selectedDate]);

  // Group by weeks
  const calendarWeeks = useMemo(() => {
    const weeks: typeof calendarDates[] = [];
    let currentWeek: typeof calendarDates = [];

    // Fill leading empty cells for first week
    const firstDay = calendarDates[0]?.weekday || 1;
    for (let i = 1; i < firstDay; i++) {
      currentWeek.push({ dateStr: '', day: 0, weekday: 0, isPast: true, isSelected: false, isToday: false });
    }

    calendarDates.forEach((d) => {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    return weeks;
  }, [calendarDates]);

  const today = new Date();
  const currentMonth = `${today.getFullYear()}年${today.getMonth() + 1}月`;

  // Step content
  const renderStep1 = () => {
    if (nearbyStoresLoading && nearbyStores.length === 0) {
      return (
        <View className='step-content'>
          <View className='step-title'>选择门店</View>
          {[0, 1, 2].map((i) => (
            <View key={i} className='skeleton-card' />
          ))}
        </View>
      );
    }

    if (nearbyStoresError && nearbyStores.length === 0) {
      return (
        <View className='step-content'>
          <View className='step-title'>选择门店</View>
          <View style={{ textAlign: 'center', padding: '40rpx 0' }}>
            <Text style={{ fontSize: '28rpx', color: '#FF4D4F' }}>门店列表加载失败</Text>
            <View
              onClick={() => {
                const loc = useStoreStore.getState().userLocation;
                if (loc) fetchNearbyStores({ lat: loc.latitude, lng: loc.longitude });
              }}
              style={{ marginTop: '16rpx', padding: '8rpx 24rpx', border: '1px solid #0F3460', borderRadius: '8rpx', display: 'inline-block' }}
            >
              <Text style={{ fontSize: '24rpx', color: '#0F3460' }}>点击重试</Text>
            </View>
          </View>
        </View>
      );
    }

    if (nearbyStores.length === 0 && !nearbyStoresLoading) {
      return (
        <View className='step-content'>
          <View className='step-title'>选择门店</View>
          <View style={{ textAlign: 'center', padding: '40rpx 0' }}>
            <Text style={{ fontSize: '28rpx', color: '#595959' }}>暂无可用门店</Text>
          </View>
        </View>
      );
    }

    return (
      <View className='step-content'>
        <View className='step-title'>选择门店</View>
        {nearbyStores.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            mode='detail-summary'
            selected={selectedStoreId === store.id}
            onTap={handleSelectStore}
          />
        ))}
      </View>
    );
  };

  const renderStep2 = () => {
    if (serviceTypesLoading && serviceTypes.length === 0) {
      return (
        <View className='step-content'>
          <View className='step-title'>选择您需要的服务类型</View>
          {[0, 1, 2].map((i) => (
            <View key={i} className='skeleton-item' />
          ))}
        </View>
      );
    }

    if (serviceTypesError && serviceTypes.length === 0) {
      return (
        <View className='step-content'>
          <View className='step-title'>选择您需要的服务类型</View>
          <View style={{ textAlign: 'center', padding: '40rpx 0' }}>
            <Text style={{ fontSize: '28rpx', color: '#FF4D4F' }}>服务类型加载失败</Text>
            <View
              onClick={fetchServiceTypes}
              style={{ marginTop: '16rpx', padding: '8rpx 24rpx', border: '1px solid #0F3460', borderRadius: '8rpx', display: 'inline-block' }}
            >
              <Text style={{ fontSize: '24rpx', color: '#0F3460' }}>点击重试</Text>
            </View>
          </View>
        </View>
      );
    }

    if (serviceTypes.length === 0 && !serviceTypesLoading) {
      return (
        <View className='step-content'>
          <View className='step-title'>选择您需要的服务类型</View>
          <View style={{ textAlign: 'center', padding: '40rpx 0' }}>
            <Text style={{ fontSize: '28rpx', color: '#595959' }}>暂无可用服务类型</Text>
          </View>
        </View>
      );
    }

    return (
      <View className='step-content'>
        <View className='step-title'>选择您需要的服务类型</View>
        {serviceTypes.map((st) => (
          <View
            key={st.code}
            className={`service-item ${selectedServiceType === st.code ? 'service-item-selected' : ''}`}
            onClick={() => handleSelectServiceType(st.code)}
          >
            <View className='service-icon' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: '40rpx' }}>{st.icon || '🎨'}</Text>
            </View>
            <View className='service-info'>
              <Text className='service-name'>{st.name}</Text>
              {st.description && (
                <Text className='service-desc'>{st.description}</Text>
              )}
            </View>
            {selectedServiceType === st.code && (
              <Text style={{ fontSize: '32rpx', color: '#0F3460' }}>✓</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStep3 = () => {
    return (
      <View className='step-content'>
        {/* Calendar */}
        <Text className='section-label'>选择预约日期</Text>
        <View className='calendar-grid'>
          <Text className='month-label'>{currentMonth}</Text>
          <View className='calendar-header'>
            {WEEKDAYS.map((d) => (
              <View key={d} className='calendar-header-cell'>
                <Text>{d}</Text>
              </View>
            ))}
          </View>
          {calendarWeeks.map((week, wi) => (
            <View key={wi} className='calendar-row'>
              {week.map((day, di) => {
                if (day.dateStr === '') {
                  return <View key={di} className='calendar-cell' />;
                }
                const isSelected = day.isSelected;
                return (
                  <View
                    key={di}
                    className={`calendar-cell ${isSelected ? 'calendar-cell-selected' : ''} ${day.isPast ? 'calendar-cell-past-day' : ''}`}
                    onClick={() => handleSelectDate(day.dateStr)}
                  >
                    <Text className={`calendar-cell-text ${isSelected ? 'calendar-cell-selected-text' : ''}`}>
                      {day.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* TimeSlot Picker */}
        <View style={{ marginTop: '24rpx' }}>
          <Text className='section-label'>选择预约时段</Text>
          {selectedDate && (
            <TimeSlotPicker
              slots={timeSlots}
              selectedSlot={selectedTimeSlot ?? undefined}
              loading={timeSlotsLoading}
              error={!!timeSlotsError}
              onSelect={handleSelectTimeSlot}
              onRetry={() => {
                if (selectedStoreId && selectedDate) {
                  fetchTimeSlots(selectedStoreId, selectedDate);
                }
              }}
            />
          )}
          {!selectedDate && (
            <View style={{ padding: '24rpx 0', textAlign: 'center' }}>
              <Text style={{ fontSize: '24rpx', color: '#BFBFBF' }}>请先选择日期</Text>
            </View>
          )}
        </View>

        {/* Phase 5: Waitlist entry for full slots */}
        {selectedDate && !timeSlotsLoading && timeSlots.some((s) => !s.available) && (
          <View style={{ marginTop: '24rpx' }}>
            <Text className='section-label'>满员时段候补</Text>
            <View style={{ backgroundColor: '#FFFBE6', borderRadius: '12rpx', padding: '20rpx' }}>
              {timeSlots.filter((s) => !s.available).map((slot) => (
                <View
                  key={slot.timeSlot}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12rpx 0',
                    borderBottom: '1px solid #F0E68C',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '26rpx', color: '#1A1A2E' }}>{slot.label}</Text>
                    <Text style={{ fontSize: '22rpx', color: '#FF4D4F' }}>已约满</Text>
                  </View>
                  {waitlistSuccess && waitlistSlot?.timeSlot === slot.timeSlot ? (
                    <View
                      style={{
                        padding: '8rpx 20rpx',
                        backgroundColor: '#52C41A',
                        borderRadius: '8rpx',
                      }}
                    >
                      <Text style={{ fontSize: '24rpx', color: '#FFFFFF' }}>
                        候补成功 (#{waitlistPosition})
                      </Text>
                    </View>
                  ) : (
                    <View
                      onClick={() => handleOpenWaitlist(slot)}
                      style={{
                        padding: '8rpx 20rpx',
                        backgroundColor: '#FAAD14',
                        borderRadius: '8rpx',
                      }}
                    >
                      <Text style={{ fontSize: '24rpx', color: '#FFFFFF' }}>加入候补</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Phase 5: Waitlist confirmation form */}
        {showWaitlistForm && waitlistSlot && (
          <View style={{ marginTop: '24rpx', backgroundColor: '#FFFFFF', borderRadius: '12rpx', padding: '24rpx' }}>
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20rpx' }}>
              <Text style={{ fontSize: '28rpx', fontWeight: 700, color: '#1A1A2E' }}>
                候补确认 - {waitlistSlot.label}
              </Text>
              <View onClick={handleDismissWaitlist} style={{ padding: '8rpx' }}>
                <Text style={{ fontSize: '24rpx', color: '#8C8C8C' }}>取消</Text>
              </View>
            </View>

            {waitlistSuccess ? (
              <View style={{ textAlign: 'center', padding: '24rpx 0' }}>
                <Text style={{ fontSize: '32rpx', color: '#52C41A', fontWeight: 700 }}>
                  候补成功！
                </Text>
                <Text style={{ fontSize: '26rpx', color: '#595959', display: 'block', marginTop: '12rpx' }}>
                  您排在第 {waitlistPosition} 位，有空位时会及时通知您
                </Text>
                <View
                  onClick={handleDismissWaitlist}
                  style={{
                    marginTop: '24rpx',
                    padding: '12rpx 40rpx',
                    backgroundColor: '#0F3460',
                    borderRadius: '8rpx',
                    display: 'inline-block',
                  }}
                >
                  <Text style={{ fontSize: '26rpx', color: '#FFFFFF' }}>我知道了</Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: '24rpx', color: '#FAAD14', display: 'block', marginBottom: '16rpx' }}>
                  该时段已约满，加入候补后有空位将优先通知您
                </Text>

                <Text style={{ fontSize: '26rpx', color: '#1A1A2E', fontWeight: 500, marginBottom: '8rpx' }}>联系人姓名 *</Text>
                <Input
                  style={{
                    height: '72rpx',
                    backgroundColor: '#F5F5F5',
                    borderRadius: '8rpx',
                    padding: '0 16rpx',
                    fontSize: '28rpx',
                    marginBottom: '16rpx',
                  }}
                  placeholder='请输入姓名'
                  value={customerName}
                  maxlength={20}
                  onInput={(e) => setCustomerName(e.detail.value)}
                />

                <Text style={{ fontSize: '26rpx', color: '#1A1A2E', fontWeight: 500, marginBottom: '8rpx' }}>手机号 *</Text>
                <Input
                  style={{
                    height: '72rpx',
                    backgroundColor: '#F5F5F5',
                    borderRadius: '8rpx',
                    padding: '0 16rpx',
                    fontSize: '28rpx',
                    marginBottom: '16rpx',
                  }}
                  type='number'
                  placeholder='请输入手机号'
                  value={customerPhone}
                  maxlength={11}
                  onInput={(e) => setCustomerPhone(e.detail.value)}
                />

                <Text style={{ fontSize: '26rpx', color: '#1A1A2E', fontWeight: 500, marginBottom: '8rpx' }}>车辆信息 (选填)</Text>
                <Input
                  style={{
                    height: '72rpx',
                    backgroundColor: '#F5F5F5',
                    borderRadius: '8rpx',
                    padding: '0 16rpx',
                    fontSize: '28rpx',
                    marginBottom: '20rpx',
                  }}
                  placeholder='如: 宝马 330i'
                  value={vehicleInfo}
                  onInput={(e) => setVehicleInfo(e.detail.value)}
                />

                <View
                  onClick={handleSubmitWaitlist}
                  style={{
                    height: '80rpx',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: waitlistSubmitting ? '#BFBFBF' : '#FAAD14',
                    borderRadius: '8rpx',
                  }}
                >
                  <Text style={{ fontSize: '28rpx', color: '#FFFFFF', fontWeight: 600 }}>
                    {waitlistSubmitting ? '提交中...' : '确认候补'}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Contact form */}
        <View className='form-section' style={{ marginTop: '24rpx' }}>
          <Text className='section-label'>联系信息</Text>

          <Text className='form-label'>姓名 *</Text>
          <Input
            className='form-input'
            placeholder='请输入您的姓名'
            value={customerName}
            maxlength={20}
            onInput={(e) => setCustomerName(e.detail.value)}
          />

          <Text className='form-label'>手机号 *</Text>
          <Input
            className='form-input'
            type='number'
            placeholder='请输入您的手机号'
            value={customerPhone}
            maxlength={11}
            onInput={(e) => setCustomerPhone(e.detail.value)}
          />

          <Text className='form-label'>车辆信息 (选填)</Text>
          <Input
            className='form-input'
            placeholder='如: 宝马 330i'
            value={vehicleInfo}
            onInput={(e) => setVehicleInfo(e.detail.value)}
          />

          <Text className='form-label'>备注 (选填)</Text>
          <Textarea
            className='form-textarea'
            placeholder='如有特殊需求请在此说明...'
            value={remark}
            maxlength={200}
            onInput={(e) => {
              setRemark(e.detail.value);
              setRemarkLen(e.detail.value.length);
            }}
          />
          <Text className='char-counter'>{remarkLen}/200</Text>
        </View>
      </View>
    );
  };

  return (
    <View className='create-page'>
      <Steps
        steps={STEPS}
        current={currentStep}
        onStepTap={(index) => {
          if (index < currentStep) setCurrentStep(index);
        }}
      />

      {currentStep === 0 && renderStep1()}
      {currentStep === 1 && renderStep2()}
      {currentStep === 2 && renderStep3()}

      {/* Bottom buttons */}
      <View className='bottom-buttons'>
        {currentStep > 0 && (
          <View className='btn-prev' onClick={handlePrev}>
            <Text className='btn-prev-text'>上一步</Text>
          </View>
        )}
        {currentStep < 2 ? (
          <View
            className={`btn-next ${(!canNextStep1 && currentStep === 0) || (!canNextStep2 && currentStep === 1) ? 'btn-next-disabled' : ''}`}
            onClick={handleNext}
          >
            <Text className='btn-next-text'>下一步</Text>
          </View>
        ) : (
          <View
            className={`btn-next ${!canSubmit || submitting ? 'btn-next-disabled' : ''}`}
            onClick={handleSubmit}
          >
            <Text className='btn-next-text'>
              {submitting ? '提交中...' : '提交预约'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default AppointmentCreate;
