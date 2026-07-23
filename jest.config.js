const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    '@tarojs/taro': '<rootDir>/__mocks__/taro.ts',
    '@tarojs/components': '<rootDir>/__mocks__/taro-components.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/stores/**/*.ts',
    'src/services/**/*.ts',
    '!src/**/index.ts',
  ],
};
