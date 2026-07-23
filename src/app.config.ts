export default defineAppConfig({
  pages: [
    // 5 个 Tab 页 -- 必须在 pages 数组前 5 位
    'pages/home/index',
    'pages/design/index',
    'pages/cases/index',
    'pages/store/index',
    'pages/profile/index',

    // 非 Tab 子页面
    'pages/auth/login',
    'pages/home/car-select',
    'pages/design/quote',
    'pages/design/material-compare',
    'pages/cases/detail',
    'pages/favorites/index',
    'pages/ai-generate/index',

    // Phase 3: 门店
    'pages/store/detail/index',

    // Phase 3: 预约
    'pages/appointment/create/index',
    'pages/appointment/confirm/index',
    'pages/appointment/list/index',

    // Phase 3: 历史
    'pages/profile/history/configs/index',
    'pages/profile/history/quotes/index',

    // Phase 4: 案例评论
    'pages/cases/comment/index',

    // Phase 4: 分享卡片
    'pages/cases/share-card/index',

    // Phase 4: 案例排行榜
    'pages/cases/ranking/index',

    // Phase 4: AR 预览
    'pages/design/ar-preview/index',

    // Phase 5: 门店切换
    'pages/profile/store-switch/index',
  ],

  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: 'WrapLab',
    navigationBarTextStyle: 'black',
  },

  tabBar: {
    custom: true,
    color: '#8C8C8C',
    selectedColor: '#1A1A2E',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tab/home.png',
        selectedIconPath: 'assets/tab/home-active.png',
      },
      {
        pagePath: 'pages/design/index',
        text: '改色设计',
        iconPath: 'assets/tab/design.png',
        selectedIconPath: 'assets/tab/design-active.png',
      },
      {
        pagePath: 'pages/cases/index',
        text: '案例',
        iconPath: 'assets/tab/cases.png',
        selectedIconPath: 'assets/tab/cases-active.png',
      },
      {
        pagePath: 'pages/store/index',
        text: '门店',
        iconPath: 'assets/tab/store.png',
        selectedIconPath: 'assets/tab/store-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tab/profile.png',
        selectedIconPath: 'assets/tab/profile-active.png',
      },
    ],
  },
});
