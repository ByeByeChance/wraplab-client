import { useState } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';

interface DateRangeFilterProps {
  selectedPreset: '7d' | '30d' | '90d' | 'all' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  onChange: (range: {
    startDate?: string;
    endDate?: string;
    preset: string;
  }) => void;
}

const PRESETS: Array<{
  key: '7d' | '30d' | '90d' | 'all' | 'custom';
  label: string;
}> = [
  { key: '7d', label: '最近7天' },
  { key: '30d', label: '最近30天' },
  { key: '90d', label: '最近90天' },
  { key: 'all', label: '全部' },
  { key: 'custom', label: '自定义' },
];

function getDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getToday(): string {
  return getDateString(0);
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  selectedPreset,
  customStartDate,
  customEndDate,
  onChange,
}) => {
  const [panelVisible, setPanelVisible] = useState(false);
  const [tempStart, setTempStart] = useState(customStartDate || '');
  const [tempEnd, setTempEnd] = useState(customEndDate || '');
  const [startStr, setStartStr] = useState(customStartDate || '');
  const [endStr, setEndStr] = useState(customEndDate || '');

  const handlePresetTap = (preset: '7d' | '30d' | '90d' | 'all' | 'custom') => {
    if (preset === 'custom') {
      setTempStart(startStr);
      setTempEnd(endStr);
      setPanelVisible(true);
      return;
    }
    let startDate: string | undefined;
    let endDate: string | undefined;
    switch (preset) {
      case '7d':
        startDate = getDateString(7);
        endDate = getToday();
        break;
      case '30d':
        startDate = getDateString(30);
        endDate = getToday();
        break;
      case '90d':
        startDate = getDateString(90);
        endDate = getToday();
        break;
      case 'all':
        startDate = undefined;
        endDate = undefined;
        break;
    }
    onChange({ startDate, endDate, preset });
  };

  const handleCustomConfirm = () => {
    if (!tempStart || !tempEnd) {
      Taro.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }
    if (tempEnd < tempStart) {
      Taro.showToast({ title: '结束日期不能早于开始日期', icon: 'none' });
      return;
    }
    const start = new Date(tempStart);
    const end = new Date(tempEnd);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      Taro.showToast({ title: '查询范围不能超过90天', icon: 'none' });
      return;
    }
    setStartStr(tempStart);
    setEndStr(tempEnd);
    setPanelVisible(false);
    onChange({ startDate: tempStart, endDate: tempEnd, preset: 'custom' });
  };

  const handleStartDateChange = (e: { detail: { value: string } }) => {
    setTempStart(e.detail.value);
  };

  const handleEndDateChange = (e: { detail: { value: string } }) => {
    setTempEnd(e.detail.value);
  };

  const isPresetActive = (preset: string): boolean => {
    if (selectedPreset === 'custom') return false;
    return selectedPreset === preset;
  };

  return (
    <View>
      <View className='date-range-bar'>
        {PRESETS.map((p) => {
          const active = isPresetActive(p.key);
          const isCustomActive = selectedPreset === 'custom' && p.key === 'custom';
          return (
            <View
              key={p.key}
              className='date-range-tab'
              onClick={() => handlePresetTap(p.key)}
            >
              <Text
                className={
                  active || isCustomActive
                    ? 'date-range-tab-text-active'
                    : 'date-range-tab-text'
                }
              >
                {isCustomActive && startStr
                  ? `${startStr} ~ ${endStr}`
                  : p.label}
              </Text>
              {(active || isCustomActive) && (
                <View className='date-range-tab-indicator' />
              )}
            </View>
          );
        })}
      </View>

      {/* Custom date range panel */}
      {panelVisible && (
        <View className='date-range-panel-wrapper'>
          <View
            className='date-range-panel-mask'
            onClick={() => setPanelVisible(false)}
          />
          <View className='date-range-panel'>
            <View className='date-range-panel-handle-bar' />
            <Text className='date-range-panel-title'>
              自定义时间范围
            </Text>
            <View className='date-range-picker-row'>
              <View className='date-range-picker-item'>
                <Text className='date-range-picker-label'>开始日期</Text>
                <Picker
                  mode='date'
                  value={tempStart}
                  end={tempEnd || getToday()}
                  onChange={handleStartDateChange}
                >
                  <View className='date-range-picker-value'>
                    <Text className={tempStart ? 'date-range-picker-value-text' : 'date-range-picker-placeholder'}>
                      {tempStart || '请选择日期'}
                    </Text>
                  </View>
                </Picker>
              </View>
              <View className='date-range-picker-item'>
                <Text className='date-range-picker-label'>结束日期</Text>
                <Picker
                  mode='date'
                  value={tempEnd}
                  start={tempStart || undefined}
                  end={getToday()}
                  onChange={handleEndDateChange}
                >
                  <View className='date-range-picker-value'>
                    <Text className={tempEnd ? 'date-range-picker-value-text' : 'date-range-picker-placeholder'}>
                      {tempEnd || '请选择日期'}
                    </Text>
                  </View>
                </Picker>
              </View>
            </View>
            <View className='date-range-confirm-row'>
              <View
                className='date-range-confirm-cancel'
                onClick={() => setPanelVisible(false)}
              >
                <Text className='date-range-confirm-cancel-text'>取消</Text>
              </View>
              <View
                className='date-range-confirm-ok'
                onClick={handleCustomConfirm}
              >
                <Text className='date-range-confirm-ok-text'>确定</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default DateRangeFilter;
