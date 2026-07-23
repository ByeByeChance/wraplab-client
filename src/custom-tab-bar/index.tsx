import { useCallback } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Image } from '@tarojs/components';
import { useAuthStore } from '../stores/auth-store';
import './index.less';

interface TabItem {
  pagePath: string;
  text: string;
  iconPath: string;
  selectedIconPath: string;
}

const TAB_LIST: TabItem[] = [
  {
    pagePath: '/pages/home/index',
    text: '首页',
    iconPath: '../assets/tab/home.png',
    selectedIconPath: '../assets/tab/home-active.png',
  },
  {
    pagePath: '/pages/design/index',
    text: '改色设计',
    iconPath: '../assets/tab/design.png',
    selectedIconPath: '../assets/tab/design-active.png',
  },
  {
    pagePath: '/pages/cases/index',
    text: '案例',
    iconPath: '../assets/tab/cases.png',
    selectedIconPath: '../assets/tab/cases-active.png',
  },
  {
    pagePath: '/pages/store/index',
    text: '门店',
    iconPath: '../assets/tab/store.png',
    selectedIconPath: '../assets/tab/store-active.png',
  },
  {
    pagePath: '/pages/profile/index',
    text: '我的',
    iconPath: '../assets/tab/profile.png',
    selectedIconPath: '../assets/tab/profile-active.png',
  },
];

export default function CustomTabBar() {
  const storeList = useAuthStore((s) => s.storeList);
  const activeStoreName = useAuthStore((s) => {
    const active = s.storeList.find((store) => store.isActive);
    return active?.name || '';
  });

  const currentPage = Taro.getCurrentInstance().router?.path || '';

  const switchTab = useCallback((path: string) => {
    Taro.switchTab({ url: path });
  }, []);

  /** Truncate store name to 8 characters */
  const truncateStoreName = (name: string): string => {
    if (name.length <= 8) return name;
    return name.slice(0, 8) + '...';
  };

  const isMultiStore = storeList.length > 1;

  return (
    <View className='custom-tab-bar'>
      {/* Store name indicator for multi-store staff */}
      {isMultiStore && activeStoreName && (
        <View className='custom-tab-bar-store-name'>
          <Text className='custom-tab-bar-store-name-text'>
            {truncateStoreName(activeStoreName)}
          </Text>
        </View>
      )}
      <View className='custom-tab-bar-inner'>
        {TAB_LIST.map((tab) => {
          const isActive = currentPage.startsWith(tab.pagePath.replace(/^\//, ''));
          return (
            <View
              key={tab.pagePath}
              className={`custom-tab-bar-item ${isActive ? 'custom-tab-bar-item--active' : ''}`}
              onClick={() => switchTab(tab.pagePath)}
            >
              <Image
                className='custom-tab-bar-icon'
                src={isActive ? tab.selectedIconPath : tab.iconPath}
              />
              <Text
                className={`custom-tab-bar-text ${isActive ? 'custom-tab-bar-text--active' : ''}`}
              >
                {tab.text}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
