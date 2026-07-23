/** 推荐案例 */
export interface RecommendCase {
  caseId: string;
  coverUrl: string;
  title: string;
  carModelName: string;
  colorSummary: string;
  likeCount: number;
}

/** RecommendationStrip 组件 Props */
export interface RecommendationStripProps {
  caseId: string;
  onCardClick: (caseId: string) => void;
}
