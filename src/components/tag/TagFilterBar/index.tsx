import { View, Text, ScrollView } from '@tarojs/components';
import type { Tag, TagFilterBarProps } from '../../../types';
import './index.less';

function TagChip({
  tag,
  isSelected,
  onToggle,
}: {
  tag: Tag;
  isSelected: boolean;
  onToggle: (tagId: string) => void;
}) {
  return (
    <View
      className={`tag-chip ${isSelected ? 'tag-chip--selected' : ''}`}
      style={isSelected ? { backgroundColor: tag.color } : undefined}
      onClick={() => onToggle(tag.id)}
    >
      {!isSelected && (
        <View className='tag-chip-dot' style={{ backgroundColor: tag.color }} />
      )}
      <Text className={`tag-chip-text ${isSelected ? 'tag-chip-text--selected' : ''}`}>
        {tag.name}
      </Text>
      {isSelected && <Text className='tag-chip-close'>✕</Text>}
    </View>
  );
}

export default function TagFilterBar({
  tags,
  selectedTagIds,
  onTagToggle,
  onReset,
  loading,
  error,
  onRetry,
}: TagFilterBarProps) {
  // Loading state
  if (loading) {
    return (
      <View className='tag-filter-bar'>
        <ScrollView className='tag-filter-scroll' scrollX showScrollbar={false}>
          <View className='tag-filter-inner'>
            {Array.from({ length: 6 }).map((_, idx) => (
              <View key={idx} className='tag-chip-skeleton' />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className='tag-filter-bar'>
        <View className='tag-filter-error'>
          <Text className='tag-filter-error-text'>标签加载失败</Text>
          {onRetry && (
            <Text className='tag-filter-retry' onClick={onRetry}>
              重试
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Empty state - don't render
  if (!loading && tags.length === 0) {
    return null;
  }

  return (
    <View className='tag-filter-bar'>
      <ScrollView className='tag-filter-scroll' scrollX showScrollbar={false}>
        <View className='tag-filter-inner'>
          {selectedTagIds.length > 0 && (
            <View className='tag-chip tag-chip--reset' onClick={onReset}>
              <Text className='tag-chip-reset-text'>全部</Text>
            </View>
          )}
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              isSelected={selectedTagIds.includes(tag.id)}
              onToggle={onTagToggle}
            />
          ))}
        </View>
      </ScrollView>
      {/* 右侧渐变遮罩 */}
      <View className='tag-filter-mask' />
    </View>
  );
}
