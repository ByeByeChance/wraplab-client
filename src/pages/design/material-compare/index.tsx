import { useState, useCallback } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useMaterialCompareStore } from '../../../stores';
import MaterialCompareTable from '../../../components/MaterialCompareTable';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import type { MaterialDetail } from '../../../types/phase3';
import './index.less';

const MaterialComparePage: React.FC = () => {
  const {
    selectedMaterials,
    allMaterials,
    allMaterialsLoading,
    allMaterialsError,
    detailMaterial,
    detailVisible,
    pickerVisible,
    fetchAllMaterials,
    addToCompare,
    removeFromCompare,
    clearCompare,
    toggleDetail,
    togglePicker,
    restore,
  } = useMaterialCompareStore();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useLoad(() => {
    fetchAllMaterials().then(() => {
      restore();
    });
  });

  const handleAddMaterial = useCallback(() => {
    togglePicker();
  }, [togglePicker]);

  const handleSelectMaterial = useCallback(
    (material: MaterialDetail) => {
      addToCompare(material);
    },
    [addToCompare],
  );

  const handleClearCompare = useCallback(() => {
    if (showClearConfirm) {
      clearCompare();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
    }
  }, [showClearConfirm, clearCompare]);

  // Error — check BEFORE empty states
  if (allMaterialsError && !allMaterialsLoading) {
    return (
      <View className='compare-page'>
        <ErrorState message='材质数据加载失败' onRetry={fetchAllMaterials} />
      </View>
    );
  }

  // Empty-insufficient state
  if (allMaterials.length <= 1 && !allMaterialsLoading && !allMaterialsError) {
    return (
      <View className='compare-page'>
        <EmptyState icon='⚖' message='可用材质不足，无法进行对比' actionText='返回改色工作台' onAction={() => Taro.navigateBack()} />
      </View>
    );
  }

  // Empty-initial state
  if (selectedMaterials.length === 0 && !allMaterialsLoading && !allMaterialsError) {
    return (
      <View className='compare-page'>
        <View className='top-bar'>
          <View className='add-btn' onClick={handleAddMaterial}>
            <Text className='add-btn-text'>+ 添加材质</Text>
          </View>
        </View>
        <EmptyState icon='⚖' message='选择 2-3 种材质开始对比' actionText='+ 添加材质' onAction={handleAddMaterial} />

        {/* Picker */}
        {pickerVisible && (
          <>
            <View className='picker-mask' onClick={togglePicker} />
            <View className='picker-panel'>
              <View className='picker-handle'>
                <View className='picker-handle-bar' />
              </View>
              <View className='picker-header'>
                <Text className='picker-title'>选择材质</Text>
                <View className='picker-close' onClick={togglePicker}>
                  <Text style={{ fontSize: '32rpx', color: '#8C8C8C' }}>×</Text>
                </View>
              </View>
              {allMaterialsLoading && (
                <View style={{ padding: '24rpx 32rpx' }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={{ height: '100rpx', backgroundColor: '#F0F0F0', borderRadius: '8rpx', marginBottom: '12rpx' }} />
                  ))}
                </View>
              )}
              {allMaterials.map((material) => {
                const isInCompare = selectedMaterials.some((m) => m.id === material.id);
                const isFull = selectedMaterials.length >= 3;
                const isDisabled = isFull && !isInCompare;
                return (
                  <View
                    key={material.id}
                    className={`picker-item ${isDisabled ? 'picker-item-disabled' : ''}`}
                    onClick={() => {
                      if (!isDisabled) handleSelectMaterial(material);
                    }}
                  >
                    {material.sampleImage && (
                      <Image src={material.sampleImage} mode='aspectFill' className='picker-thumb' />
                    )}
                    <View className='picker-info'>
                      <Text className='picker-name'>{material.name}</Text>
                      <Text className='picker-finish'>{material.finishType}</Text>
                    </View>
                    {isInCompare && (
                      <Text className='picker-check'>✓</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>
    );
  }

  // Success / Empty table state
  return (
    <View className='compare-page'>
      {/* Top bar */}
      <View className='top-bar'>
        <View
          className={`add-btn ${selectedMaterials.length >= 3 ? 'add-btn-disabled' : ''}`}
          onClick={() => selectedMaterials.length < 3 && handleAddMaterial()}
        >
          <Text className='add-btn-text' style={selectedMaterials.length >= 3 ? { color: '#D9D9D9' } : undefined}>
            + 添加材质
          </Text>
        </View>
        <View className='chip-container'>
          {selectedMaterials.map((material) => (
            <View key={material.id} className='material-chip'>
              <Text className='material-chip-text'>{material.name}</Text>
              <View
                className='material-chip-remove'
                onClick={() => removeFromCompare(material.id)}
              >
                <Text style={{ fontSize: '28rpx', color: '#8C8C8C' }}>×</Text>
              </View>
            </View>
          ))}
          {selectedMaterials.length >= 2 && (
            <Text className='clear-btn' onClick={handleClearCompare}>
              {showClearConfirm ? '确认清空?' : '清空对比'}
            </Text>
          )}
        </View>
      </View>

      {/* Compare table */}
      {selectedMaterials.length >= 2 && (
        <View style={{ marginTop: '16rpx' }}>
          <MaterialCompareTable
            materials={selectedMaterials}
            loading={allMaterialsLoading}
            error={!!allMaterialsError}
            onMaterialDetail={(material) => toggleDetail(material)}
            onRemoveMaterial={removeFromCompare}
            onRetry={fetchAllMaterials}
          />
        </View>
      )}

      {/* Picker */}
      {pickerVisible && (
        <>
          <View className='picker-mask' onClick={togglePicker} />
          <View className='picker-panel'>
            <View className='picker-handle'>
              <View className='picker-handle-bar' />
            </View>
            <View className='picker-header'>
              <Text className='picker-title'>选择材质</Text>
              <View className='picker-close' onClick={togglePicker}>
                <Text style={{ fontSize: '32rpx', color: '#8C8C8C' }}>×</Text>
              </View>
            </View>
            {allMaterials.map((material) => {
              const isInCompare = selectedMaterials.some((m) => m.id === material.id);
              const isFull = selectedMaterials.length >= 3;
              const isDisabled = isFull && !isInCompare;
              return (
                <View
                  key={material.id}
                  className={`picker-item ${isDisabled ? 'picker-item-disabled' : ''}`}
                  onClick={() => {
                    if (!isDisabled) handleSelectMaterial(material);
                  }}
                >
                  {material.sampleImage && (
                    <Image src={material.sampleImage} mode='aspectFill' className='picker-thumb' />
                  )}
                  <View className='picker-info'>
                    <Text className='picker-name'>{material.name}</Text>
                    <Text className='picker-finish'>{material.finishType}</Text>
                  </View>
                  {isInCompare && <Text className='picker-check'>✓</Text>}
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Detail panel */}
      {detailVisible && detailMaterial && (
        <>
          <View className='detail-mask' onClick={() => toggleDetail()} />
          <View className='detail-panel'>
            {detailMaterial.sampleImage && (
              <Image src={detailMaterial.sampleImage} mode='aspectFill' className='detail-image' />
            )}
            <View className='detail-body'>
              <Text className='detail-name'>{detailMaterial.name}</Text>

              <View className='detail-row'>
                <Text className='detail-label'>表面效果</Text>
                <Text className='detail-value'>{detailMaterial.finishType}</Text>
              </View>
              <View className='detail-row'>
                <Text className='detail-label'>光泽度</Text>
                <Text className='detail-value'>
                  {'★'.repeat(detailMaterial.glossLevel)}{'☆'.repeat(5 - detailMaterial.glossLevel)} ({detailMaterial.glossLevel})
                </Text>
              </View>
              <View className='detail-row'>
                <Text className='detail-label'>耐久性</Text>
                <Text className='detail-value'>{detailMaterial.durability}</Text>
              </View>
              <View className='detail-row'>
                <Text className='detail-label'>价格倍率</Text>
                <Text className='detail-value'>{detailMaterial.priceMultiplier}x</Text>
              </View>

              {detailMaterial.pros && detailMaterial.pros.length > 0 && (
                <View className='pros-section'>
                  <Text className='pros-title'>优点</Text>
                  {detailMaterial.pros.map((p) => (
                    <Text key={p} className='pros-item'>✓ {p}</Text>
                  ))}
                </View>
              )}

              {detailMaterial.cons && detailMaterial.cons.length > 0 && (
                <View className='pros-section' style={{ marginTop: '8rpx' }}>
                  <Text className='cons-title'>缺点</Text>
                  {detailMaterial.cons.map((c) => (
                    <Text key={c} className='pros-item' style={{ color: '#FF4D4F' }}>✗ {c}</Text>
                  ))}
                </View>
              )}
            </View>

            {!selectedMaterials.some((m) => m.id === detailMaterial.id) && (
              <View
                className='add-to-compare-btn'
                onClick={() => {
                  handleSelectMaterial(detailMaterial);
                  toggleDetail();
                }}
              >
                <Text style={{ fontSize: '28rpx', color: '#FFFFFF', fontWeight: 700 }}>加入对比</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
};

export default MaterialComparePage;
