import { useCallback, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useHistoryStore } from '../../../../stores';
import DateRangeFilter from '../../../../components/DateRangeFilter';
import HistoryList from '../../../../components/HistoryList';
import StatusBadge from '../../../../components/StatusBadge';
import type { HistoryConfig } from '../../../../types/phase3';
import './index.less';

const ConfigsHistoryPage: React.FC = () => {
  const {
    configs,
    configsLoading,
    configsError,
    configsHasMore,
    configsRefreshing,
    dateRange,
    setDateRange,
    fetchConfigHistory,
    loadMoreConfigs,
    refreshConfigs,
  } = useHistoryStore();

  useLoad(() => {
    fetchConfigHistory({ page: 1 });
  });

  // Reload when date range changes
  useEffect(() => {
    const { startDate, endDate } = dateRange;
    fetchConfigHistory({ page: 1, startDate, endDate });
  }, [dateRange.startDate, dateRange.endDate, dateRange.preset]);

  const handleDateChange = useCallback(
    (range: { startDate?: string; endDate?: string; preset: string }) => {
      setDateRange(range);
    },
    [setDateRange],
  );

  const handleReuse = useCallback(
    (item: HistoryConfig) => {
      Taro.navigateTo({
        url: `/pages/design/index/index?modelId=${item.modelId}&configurationId=${item.configurationId}`,
      });
    },
    [],
  );

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const renderConfigItem = useCallback(
    (item: HistoryConfig) => (
      <View className='config-item'>
        {item.thumbnail ? (
          <View className='config-thumb'>
            <Image src={item.thumbnail} mode='aspectFill' className='config-thumb-img' />
            {item.mode === 'PART' && (
              <View className='part-badge'>
                <StatusBadge status='pending' label='分区' size='small' />
              </View>
            )}
          </View>
        ) : (
          <View className='config-thumb-placeholder'>
            <Text className='config-thumb-placeholder-icon'>🚗</Text>
          </View>
        )}
        <View className='config-info'>
          <Text className='config-model'>
            {item.modelInfo || `${item.brandName} ${item.seriesName} ${item.modelName}`}
          </Text>
          {item.swatchName && (
            <View className='config-color-row'>
              {item.hex && (
                <View className='config-color-swatch' style={{ backgroundColor: item.hex }} />
              )}
              <Text className='config-color-text'>{item.swatchName}</Text>
            </View>
          )}
          {item.materialName && (
            <Text className='config-material'>材质: {item.materialName}</Text>
          )}
          <View className='config-bottom-row'>
            <Text className='config-time'>{formatDate(item.createdAt)}</Text>
            <View className='reuse-btn'>
              <Text className='reuse-btn-text'>复用方案</Text>
            </View>
          </View>
        </View>
      </View>
    ),
    [],
  );

  const emptyMessage = dateRange.preset !== 'all'
    ? '该时间段暂无改色记录'
    : '暂无改色记录';

  return (
    <View className='configs-page'>
      <DateRangeFilter
        selectedPreset={dateRange.preset as '7d' | '30d' | '90d' | 'all' | 'custom'}
        customStartDate={dateRange.startDate}
        customEndDate={dateRange.endDate}
        onChange={handleDateChange}
      />

      <HistoryList<HistoryConfig>
        items={configs}
        loading={configsLoading}
        refreshing={configsRefreshing}
        error={configsError}
        hasMore={configsHasMore}
        emptyMessage={emptyMessage}
        emptyIcon='🎨'
        emptyActionText={dateRange.preset === 'all' ? '去创建方案' : undefined}
        onEmptyAction={dateRange.preset === 'all' ? () => Taro.switchTab({ url: '/pages/design/index' }) : undefined}
        renderItem={renderConfigItem}
        onItemTap={(item) => handleReuse(item)}
        onLoadMore={loadMoreConfigs}
        onRetry={refreshConfigs}
      />
    </View>
  );
};

export default ConfigsHistoryPage;
