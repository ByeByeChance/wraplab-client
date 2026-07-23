/** API 基础 URL */
export const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'https://api.wraplab.cn';

/** API 版本前缀 */
export const API_PREFIX = '/api/v1';

/** 请求超时 (ms) */
export const REQUEST_TIMEOUT = 10000;

/** Token 刷新最大重试次数 */
export const MAX_TOKEN_REFRESH_RETRIES = 1;

/** 业务错误码 */
export const ERROR_CODES = {
  TOKEN_EXPIRED: 10001,
  INVALID_CREDENTIALS: 10002,
  STAFF_NOT_FOUND: 10003,
  MODEL_NOT_FOUND: 20001,
  SWATCH_NOT_FOUND: 30001,
  CONFIG_NOT_FOUND: 40001,
  QUOTE_CALC_FAILED: 50001,
  VALIDATION_ERROR: 90001,

  // Phase 2 NEW
  WECHAT_CODE_INVALID: 10004,
  WECHAT_NOT_BOUND: 10005,
  CASE_NOT_FOUND: 60001,
  FAVORITE_DUPLICATE: 60002,
  GENERATION_PENDING: 70001,
  GENERATION_FAILED: 70002,
  GENERATION_TIMEOUT: 70003,
  PARTS_NOT_FOUND: 80001,
} as const;

/** 错误码对应的用户提示文案 */
export const ERROR_MESSAGES: Record<number, string> = {
  [ERROR_CODES.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ERROR_CODES.INVALID_CREDENTIALS]: '手机号或密码错误',
  [ERROR_CODES.STAFF_NOT_FOUND]: '店员账号不存在',
  [ERROR_CODES.MODEL_NOT_FOUND]: '车型数据不存在',
  [ERROR_CODES.SWATCH_NOT_FOUND]: '色卡数据不存在',
  [ERROR_CODES.CONFIG_NOT_FOUND]: '方案数据不存在',
  [ERROR_CODES.QUOTE_CALC_FAILED]: '价格计算失败',
  [ERROR_CODES.VALIDATION_ERROR]: '输入数据有误',

  // Phase 2 NEW
  [ERROR_CODES.WECHAT_CODE_INVALID]: '微信登录凭证已过期，请重试',
  [ERROR_CODES.WECHAT_NOT_BOUND]: '请先使用手机号登录以绑定微信',
  [ERROR_CODES.CASE_NOT_FOUND]: '案例不存在或已下架',
  [ERROR_CODES.FAVORITE_DUPLICATE]: '已收藏，无需重复操作',
  [ERROR_CODES.GENERATION_PENDING]: '已有生成任务进行中',
  [ERROR_CODES.GENERATION_FAILED]: 'AI 生成失败',
  [ERROR_CODES.GENERATION_TIMEOUT]: '生成超时，请重试',
  [ERROR_CODES.PARTS_NOT_FOUND]: '该车型暂无部件数据',
};

/** 色卡品牌标识色 */
export const BRAND_COLORS: Record<string, string> = {
  AX: '#FF6B35',
  HEXIS: '#0066CC',
  '3M': '#CC0000',
  Avery: '#FFCC00',
  KPMF: '#6C63FF',
  DEFAULT: '#0F3460',
};

/** 设计系统颜色 Token */
export const DESIGN_COLORS = {
  primary: '#1A1A2E',
  primaryLight: '#0F3460',
  accent: '#E94560',
  bg: '#F5F5F5',
  bgDark: '#16213E',
  bgWhite: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#595959',
  textTertiary: '#8C8C8C',
  textQuaternary: '#BFBFBF',
  border: '#E8E8E8',
  success: '#52C41A',
  warning: '#FAAD14',
  error: '#FF4D4F',
  info: '#1890FF',
  disabled: '#D9D9D9',
} as const;

/** WebView 基础路径 */
export const WEBVIEW_BASE_PATH = '/webview/3d-renderer/index.html';

/** WebSocket 连接地址 */
export const WS_URL = 'wss://api.wraplab.cn/ws/3d-viewer';

/** 消息超时配置 (ms) */
export const MESSAGE_TIMEOUT = {
  H5_READY: 5000,
  MODEL_LOAD: 15000,
  COLOR_APPLIED: 3000,
  CAPTURE: 5000,
} as const;

/** 缓存 TTL (ms) */
export const CACHE_TTL = 30 * 60 * 1000; // 30 分钟

/** Phase 3 新增业务错误码 */
export const PHASE3_ERROR_CODES = {
  // 门店 (60001-60099)
  STORE_NOT_FOUND: 60001,
  STORE_CLOSED: 60002,
  STORE_GEO_LOCATION_MISSING: 60003,

  // 预约 (61001-61099)
  APPOINTMENT_SLOT_FULL: 61001,
  APPOINTMENT_DUPLICATE: 61002,
  APPOINTMENT_NOT_FOUND: 61003,
  APPOINTMENT_SLOT_CONFLICT: 61004,
  APPOINTMENT_CANCEL_DENIED: 61005,

  // 材质 (62001-62099)
  MATERIAL_NOT_FOUND: 62001,
  MATERIAL_INSUFFICIENT: 62002,

  // 历史记录 (63001-63099)
  HISTORY_QUERY_INVALID: 63001,
} as const;

/** Phase 3 错误码 -> 用户提示文案 */
export const PHASE3_ERROR_MESSAGES: Record<number, string> = {
  [PHASE3_ERROR_CODES.STORE_NOT_FOUND]: '门店不存在或已下线',
  [PHASE3_ERROR_CODES.STORE_CLOSED]: '门店已关闭',
  [PHASE3_ERROR_CODES.STORE_GEO_LOCATION_MISSING]: '门店位置信息缺失',
  [PHASE3_ERROR_CODES.APPOINTMENT_SLOT_FULL]: '该时段已被约满',
  [PHASE3_ERROR_CODES.APPOINTMENT_DUPLICATE]: '您已有相同时间段的预约',
  [PHASE3_ERROR_CODES.APPOINTMENT_NOT_FOUND]: '预约信息不存在',
  [PHASE3_ERROR_CODES.APPOINTMENT_SLOT_CONFLICT]: '该时段已被预约，请重新选择',
  [PHASE3_ERROR_CODES.APPOINTMENT_CANCEL_DENIED]: '当前状态不允许取消预约',
  [PHASE3_ERROR_CODES.MATERIAL_NOT_FOUND]: '材质数据不存在',
  [PHASE3_ERROR_CODES.MATERIAL_INSUFFICIENT]: '可用材质不足，无法进行对比',
  [PHASE3_ERROR_CODES.HISTORY_QUERY_INVALID]: '查询参数无效',
};

/** Phase 4 新增业务错误码 */
export const PHASE4_ERROR_CODES = {
  // 短信验证码 (1012-1021)
  SMS_CODE_INVALID: 1012,
  SMS_CODE_NOT_REGISTERED: 1013,
  SMS_CODE_EXPIRED: 1014,
  SMS_CODE_USED: 1015,
  SMS_SEND_FREQUENT: 1020,
  SMS_DAILY_LIMIT: 1021,

  // 评论 (11001-11099)
  COMMENT_NOT_FOUND: 11001,
  COMMENT_RATE_LIMITED: 11002,

  // 排行榜 (12001-12099)
  RANKING_QUERY_INVALID: 12001,

  // AR (13001-13099)
  AR_CONFIG_NOT_FOUND: 13001,
  AR_MODEL_LOAD_FAILED: 13002,

  // AI 队列 (14001-14099)
  AI_QUEUE_FULL: 14001,
  AI_TASK_NOT_FOUND: 14002,
} as const;

/** Phase 4 错误码 -> 用户提示文案 */
export const PHASE4_ERROR_MESSAGES: Record<number, string> = {
  [PHASE4_ERROR_CODES.SMS_CODE_INVALID]: '验证码错误，请重新输入',
  [PHASE4_ERROR_CODES.SMS_CODE_NOT_REGISTERED]: '该手机号未注册，请联系店长创建账号',
  [PHASE4_ERROR_CODES.SMS_CODE_EXPIRED]: '验证码已过期，请重新获取',
  [PHASE4_ERROR_CODES.SMS_CODE_USED]: '验证码已使用，请重新获取',
  [PHASE4_ERROR_CODES.SMS_SEND_FREQUENT]: '发送过于频繁，请稍后再试',
  [PHASE4_ERROR_CODES.SMS_DAILY_LIMIT]: '今日发送次数已达上限',
  [PHASE4_ERROR_CODES.COMMENT_NOT_FOUND]: '评论不存在或已被删除',
  [PHASE4_ERROR_CODES.COMMENT_RATE_LIMITED]: '评论过于频繁，请稍后再试',
  [PHASE4_ERROR_CODES.RANKING_QUERY_INVALID]: '排行榜查询参数无效',
  [PHASE4_ERROR_CODES.AR_CONFIG_NOT_FOUND]: 'AR 配置数据不存在',
  [PHASE4_ERROR_CODES.AR_MODEL_LOAD_FAILED]: 'AR 模型加载失败',
  [PHASE4_ERROR_CODES.AI_QUEUE_FULL]: '当前排队人数过多，请稍后再试',
  [PHASE4_ERROR_CODES.AI_TASK_NOT_FOUND]: '生成任务不存在',
};

/** 短信验证码错误码用户提示映射 */
export const SMS_ERROR_MAP: Record<number, string> = {
  1012: '验证码错误，请重新输入',
  1014: '验证码已过期，请重新获取',
  1015: '验证码已使用，请重新获取',
  1020: '发送过于频繁，请稍后再试',
  1021: '今日发送次数已达上限',
};

/** 短信验证码发送冷却时间 (ms) */
export const SMS_COOLDOWN_MS = 60000;

/** 评论发送冷却时间 (ms) */
export const COMMENT_COOLDOWN_MS = 30000;

/** 排行榜缓存 TTL (ms) */
export const RANKING_CACHE_TTL = 5 * 60 * 1000;

/** AI 队列轮询间隔 (ms) */
export const AI_QUEUE_POLL_INTERVAL_QUEUED = 5000;
export const AI_QUEUE_POLL_INTERVAL_PROCESSING = 3000;

/** AI 生成超时 (ms) */
export const AI_GENERATION_TIMEOUT = 300000;
