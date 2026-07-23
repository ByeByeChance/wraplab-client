import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { MaterialDetail } from '../../types/phase3';

interface MaterialCompareTableProps {
  materials: MaterialDetail[];
  loading?: boolean;
  error?: boolean;
  onMaterialDetail?: (material: MaterialDetail) => void;
  onRemoveMaterial?: (materialId: string) => void;
  onRetry: () => void;
}

function renderStars(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}

function getPriceLabel(multiplier: number): string {
  if (multiplier === 1.0) return '基准价';
  return '标准价';
}

function getDifficultyLabel(score: number): string {
  if (score <= 2) return '简单';
  if (score <= 3) return '中等';
  if (score <= 4) return '较高';
  return '困难';
}

const DIMENSION_NAMES = [
  '表面效果',
  '光泽度',
  '耐久性',
  '价格倍率',
  '推荐用途',
  '厚度',
  '质保年限',
  '施工难度',
  '材质样张',
];

const COL_WIDTH = 260;
const DIM_COL_WIDTH = 160;

const MaterialCompareTable: React.FC<MaterialCompareTableProps> = ({
  materials,
  loading,
  error,
  onMaterialDetail,
  onRemoveMaterial,
  onRetry,
}) => {
  if (loading) {
    return (
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          padding: '0 32rpx',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${DIM_COL_WIDTH}rpx`,
            flexShrink: 0,
          }}
        >
          {DIMENSION_NAMES.map((_name, i) => (
            <View
              key={i}
              style={{
                height: '80rpx',
                padding: '16rpx',
                backgroundColor: '#F5F5F5',
                borderBottom: '1px solid #F0F0F0',
              }}
            />
          ))}
        </View>
        <View style={{ width: `${COL_WIDTH}rpx`, flexShrink: 0, marginLeft: '8rpx' }}>
          {DIMENSION_NAMES.map((_, i) => (
            <View
              key={i}
              style={{
                height: '80rpx',
                padding: '16rpx',
                backgroundColor: '#F5F5F5',
                borderBottom: '1px solid #F0F0F0',
                borderRadius: '4rpx',
              }}
            />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64rpx',
        }}
      >
        <Text style={{ fontSize: '28rpx', color: '#FF4D4F', marginBottom: '24rpx' }}>
          材质数据加载失败
        </Text>
        <View
          onClick={onRetry}
          style={{
            padding: '12rpx 32rpx',
            border: '1px solid #0F3460',
            borderRadius: '8rpx',
          }}
        >
          <Text style={{ fontSize: '26rpx', color: '#0F3460' }}>点击重试</Text>
        </View>
      </View>
    );
  }

  const needScroll = materials.length > 2;

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        padding: '0 32rpx',
        overflow: 'hidden',
      }}
    >
      {/* Fixed dimension column */}
      <View
        style={{
          width: `${DIM_COL_WIDTH}rpx`,
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header spacer */}
        <View
          style={{
            height: '80rpx',
            padding: '16rpx',
            backgroundColor: '#FAFAFA',
            borderBottom: '1px solid #F0F0F0',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: '24rpx', color: '#595959', fontWeight: 500 }}>
            维度
          </Text>
        </View>
        {DIMENSION_NAMES.map((_name, i) => (
          <View
            key={i}
            style={{
              height: '80rpx',
              padding: '16rpx',
              backgroundColor: '#FAFAFA',
              borderBottom: '1px solid #F0F0F0',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: '24rpx', color: '#595959', fontWeight: 500 }}>
              {_name}
            </Text>
          </View>
        ))}
      </View>

      {/* Scrollable material columns */}
      <ScrollView
        scrollX={needScroll}
        style={{
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {materials.map((material) => (
          <View
            key={material.id}
            style={{
              width: `${COL_WIDTH}rpx`,
              flexShrink: 0,
              display: 'inline-block',
            }}
          >
            {/* Header */}
            <View
              onClick={() => onMaterialDetail?.(material)}
              style={{
                height: '80rpx',
                padding: '16rpx',
                borderBottom: '1px solid #F0F0F0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text
                  style={{
                    fontSize: '26rpx',
                    fontWeight: 700,
                    color: '#1A1A2E',
                  }}
                >
                  {material.name}
                </Text>
                {materials.length >= 3 && onRemoveMaterial && (
                  <View onClick={(e) => { e.stopPropagation(); onRemoveMaterial(material.id); }}>
                    <Text style={{ fontSize: '28rpx', color: '#8C8C8C' }}>×</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Rows */}
            <View style={{ height: '80rpx', padding: '16rpx', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: '28rpx', color: '#1A1A2E' }}>
                {material.finishType}
              </Text>
            </View>
            <View style={{ height: '80rpx', padding: '16rpx', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: '24rpx', color: '#FAAD14' }}>
                {renderStars(material.glossLevel)} ({material.glossLevel})
              </Text>
            </View>
            <View style={{ height: '80rpx', padding: '16rpx', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Text style={{ fontSize: '28rpx', color: '#1A1A2E' }}>
                {material.durability}
              </Text>
              <Text style={{ fontSize: '22rpx', color: '#FAAD14' }}>
                {renderStars(material.durabilityScore)}
              </Text>
            </View>
            <View style={{ height: '80rpx', padding: '16rpx', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Text style={{ fontSize: '28rpx', color: '#1A1A2E' }}>
                {material.priceMultiplier}x
              </Text>
              <Text
                style={{
                  fontSize: '22rpx',
                  color: material.priceMultiplier === 1.0 ? '#52C41A' : '#8C8C8C',
                }}
              >
                {getPriceLabel(material.priceMultiplier)}
              </Text>
            </View>
            <View style={{ height: '80rpx', padding: '16rpx', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {material.recommendedUse.map((use) => (
                <Text
                  key={use}
                  style={{
                    fontSize: '22rpx',
                    color: '#0F3460',
                    backgroundColor: '#F0F5FF',
                    padding: '2rpx 8rpx',
                    borderRadius: '4rpx',
                    marginRight: '4rpx',
                    marginBottom: '4rpx',
                  }}
                >
                  {use}
                </Text>
              ))}
            </View>
            <View style={{ height: '80rpx', padding: '16rpx', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: '28rpx', color: '#1A1A2E' }}>
                {material.thickness || '--'}
              </Text>
            </View>
            <View style={{ height: '80rpx', padding: '16rpx', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: '28rpx', color: '#1A1A2E' }}>
                {material.warrantyYears || '--'}
              </Text>
            </View>
            <View style={{ height: '80rpx', padding: '16rpx', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              {material.installationDifficulty ? (
                <>
                  <Text style={{ fontSize: '24rpx', color: '#FAAD14' }}>
                    {renderStars(material.installationDifficulty)}
                  </Text>
                  <Text style={{ fontSize: '22rpx', color: '#595959' }}>
                    {getDifficultyLabel(material.installationDifficulty)}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: '28rpx', color: '#BFBFBF' }}>--</Text>
              )}
            </View>
            <View style={{ height: '80rpx', padding: '16rpx', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {material.sampleImage ? (
                <Image
                  src={material.sampleImage}
                  mode='aspectFill'
                  style={{ width: '120rpx', height: '80rpx', borderRadius: '4rpx' }}
                  onClick={() => {
                    Taro.previewImage({
                      urls: [material.sampleImage],
                      current: material.sampleImage,
                    });
                  }}
                />
              ) : (
                <Text style={{ fontSize: '24rpx', color: '#BFBFBF' }}>暂无样张</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default MaterialCompareTable;
