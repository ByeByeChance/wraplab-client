import { useState, useCallback, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useHistoryStore } from '../../../../stores';
import DateRangeFilter from '../../../../components/DateRangeFilter';
import HistoryList from '../../../../components/HistoryList';
import StatusBadge from '../../../../components/StatusBadge';
import type { HistoryQuote } from '../../../../types/phase3';
import './index.less';

const QuotesHistoryPage: React.FC = () => {
  const {
    quotes,
    quotesLoading,
    quotesError,
    quotesHasMore,
    quotesRefreshing,
    quoteDetail,
    dateRange,
    setDateRange,
    fetchQuoteHistory,
    fetchQuoteDetail,
    loadMoreQuotes,
    refreshQuotes,
  } = useHistoryStore();

  const [detailVisible, setDetailVisible] = useState(false);

  useLoad(() => {
    fetchQuoteHistory({ page: 1 });
  });

  // Reload when date range changes
  useEffect(() => {
    const { startDate, endDate } = dateRange;
    fetchQuoteHistory({ page: 1, startDate, endDate });
  }, [dateRange.startDate, dateRange.endDate, dateRange.preset]);

  const handleDateChange = useCallback(
    (range: { startDate?: string; endDate?: string; preset: string }) => {
      setDateRange(range);
    },
    [setDateRange],
  );

  const handleItemTap = useCallback(
    (item: HistoryQuote) => {
      setDetailVisible(true);
      fetchQuoteDetail(item.id);
    },
    [fetchQuoteDetail],
  );

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
  }, []);

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (price: number | null): string => {
    if (price === null || price === 0) return '待报价';
    return `¥${price.toLocaleString('zh-CN')}`;
  };

  const renderQuoteItem = useCallback(
    (item: HistoryQuote) => (
      <View className='quote-item'>
        <View className='quote-row-1'>
          <Text className='quote-no'>{item.quoteNo}</Text>
          <StatusBadge status={item.status} size='small' />
        </View>
        <Text className='quote-model'>{item.modelInfo}</Text>
        <Text className='quote-color-material'>
          {item.colorInfo?.swatchName || ''} {item.materialName ? `· ${item.materialName}` : ''}
        </Text>
        <View className='quote-bottom-row'>
          <Text className='quote-customer-time'>
            {item.customerName} · {formatDate(item.createdAt)}
          </Text>
          <Text
            className={
              item.totalPrice === null || item.totalPrice === 0
                ? 'quote-price-pending'
                : 'quote-price'
            }
          >
            {formatPrice(item.totalPrice)}
          </Text>
        </View>
      </View>
    ),
    [],
  );

  const emptyMessage = dateRange.preset !== 'all'
    ? '该时间段暂无报价记录'
    : '暂无报价记录';

  return (
    <View className='quotes-page'>
      <DateRangeFilter
        selectedPreset={dateRange.preset as '7d' | '30d' | '90d' | 'all' | 'custom'}
        customStartDate={dateRange.startDate}
        customEndDate={dateRange.endDate}
        onChange={handleDateChange}
      />

      <HistoryList<HistoryQuote>
        items={quotes}
        loading={quotesLoading}
        refreshing={quotesRefreshing}
        error={quotesError}
        hasMore={quotesHasMore}
        emptyMessage={emptyMessage}
        emptyIcon='💰'
        emptyActionText={dateRange.preset === 'all' ? '去创建' : undefined}
        onEmptyAction={dateRange.preset === 'all' ? () => Taro.navigateTo({ url: '/pages/design/quote/index' }) : undefined}
        renderItem={renderQuoteItem}
        onItemTap={handleItemTap}
        onLoadMore={loadMoreQuotes}
        onRetry={refreshQuotes}
      />

      {/* Detail popup */}
      {detailVisible && quoteDetail && (
        <>
          <View className='detail-mask' onClick={handleCloseDetail} />
          <View className='detail-panel'>
            <View className='detail-handle'>
              <View className='detail-handle-bar' />
            </View>
            <View className='detail-content'>
              <Text className='detail-title'>报价详情</Text>

              <View className='detail-row'>
                <Text className='detail-label'>报价编号</Text>
                <Text className='detail-value'>{quoteDetail.quoteNo}</Text>
              </View>
              <View className='detail-row'>
                <Text className='detail-label'>状态</Text>
                <StatusBadge status={quoteDetail.status} />
              </View>
              <View className='detail-row'>
                <Text className='detail-label'>车型</Text>
                <Text className='detail-value'>{quoteDetail.modelInfo}</Text>
              </View>
              <View className='detail-row'>
                <Text className='detail-label'>颜色材质</Text>
                <Text className='detail-value'>
                  {quoteDetail.colorInfo.swatchName} · {quoteDetail.materialName}
                </Text>
              </View>

              {/* Price details */}
              <View className='detail-price-breakdown'>
                <View className='detail-price-item'>
                  <Text className='detail-price-label'>材料费</Text>
                  <Text className='detail-price-value'>
                    ¥{(quoteDetail.materialCost || 0).toLocaleString('zh-CN')}
                  </Text>
                </View>
                <View className='detail-price-item'>
                  <Text className='detail-price-label'>工时费</Text>
                  <Text className='detail-price-value'>
                    ¥{(quoteDetail.laborCost || 0).toLocaleString('zh-CN')}
                  </Text>
                </View>
                <View className='detail-price-total'>
                  <Text className='detail-price-total-label'>总价</Text>
                  <Text className='detail-price-total-value'>
                    {formatPrice(quoteDetail.totalPrice)}
                  </Text>
                </View>
              </View>

              <View className='detail-row'>
                <Text className='detail-label'>客户</Text>
                <Text className='detail-value'>
                  {quoteDetail.customerName} {quoteDetail.customerPhone}
                </Text>
              </View>

              {quoteDetail.remark && (
                <View className='detail-row'>
                  <Text className='detail-label'>备注</Text>
                  <Text className='detail-value'>{quoteDetail.remark}</Text>
                </View>
              )}

              <View className='detail-row'>
                <Text className='detail-label'>创建时间</Text>
                <Text className='detail-value'>{formatDate(quoteDetail.createdAt)}</Text>
              </View>

              <View
                className='view-scheme-btn'
                onClick={() => {
                  handleCloseDetail();
                  Taro.navigateTo({
                    url: `/pages/design/index/index?modelId=${quoteDetail.modelId}&configurationId=${quoteDetail.configurationId}`,
                  });
                }}
              >
                <Text className='view-scheme-btn-text'>查看方案</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

export default QuotesHistoryPage;
