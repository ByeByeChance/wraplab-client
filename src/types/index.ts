export type { ApiResponse, PaginatedData } from './api';
export type { Brand, Series, Model } from './vehicle';
export type { ColorBrand, ColorSwatchItem, Material } from './color';
export type { Configuration, HotScheme } from './config';
export type { Quote } from './quote';
export type { StaffInfo, AuthTokens, LoginResponse, RefreshResponse } from './auth';
export { WebViewMessageType } from './message';
export type {
  PostMessage,
  TaroToH5Message,
  H5ToTaroMessage,
  ModelUrlMessage,
  SetColorMessage,
  SetMaterialMessage,
  CaptureResultMessage,
  H5ReadyMessage,
  ModelReadyMessage,
  ModelLoadingMessage,
  ModelErrorMessage,
  ColorAppliedMessage,
  SetPartColorMessage,
  SetModeMessage,
  HighlightPartMessage,
  ResetPartsMessage,
  PartColorAppliedMessage,
} from './message';
export type {
  NearbyStore,
  StoreDetail,
  ServiceType,
  TimeSlot,
  Appointment,
  MaterialDetail,
  HistoryConfig,
  HistoryQuote,
  QuoteDetail,
} from './phase3';

// Phase 4 types
export type { CommentItem, Reply, CommentStatus, CommentPaginatedData } from './comment';
export type { RankingCaseItem, RankDimension, RankPeriod, RankingParams, RankChangeDirection } from './ranking';
export type { SmsCodeType, SmsCodeStatus, SmsSendRequest, SmsLoginRequest, SmsLoginResponse, SmsVerifyRequest, SmsVerifyResponse } from './sms';
export type { CareCustomer, CareReminder, Customer } from './customer-care';

// Phase 5 types
export type { WaitlistEntry, JoinWaitlistParams, WaitlistJoinResult, WaitlistSlotStatus } from './waitlist';
export type { RecommendCase, RecommendationStripProps } from './recommendation';
export type { Tag, TagFilterBarProps } from './tag';
export type { OfflineManifest, ManifestResource, CacheEntry, SyncOperation, LRUNode, OfflineIndicatorProps } from './offline';
export type { UsdzInfo, UsdzDownloadState } from './usdz';
export type { StoreInfo, SwitchStoreRequest, SwitchStoreResponse } from './store';
