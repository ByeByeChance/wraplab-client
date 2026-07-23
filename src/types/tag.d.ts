/** 标签 */
export interface Tag {
  id: string;
  name: string;
  color: string;
  group: 'platform' | 'store';
  sortOrder: number;
}

/** TagFilterBar 组件 Props */
export interface TagFilterBarProps {
  tags: Tag[];
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
  onReset: () => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}
