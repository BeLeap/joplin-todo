module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@react-native-async-storage/async-storage$': '<rootDir>/test/mocks/async-storage.ts',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};
