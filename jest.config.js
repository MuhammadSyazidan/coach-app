/** Unit test untuk logika inti (src/core), tanpa React Native. */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/core'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', target: 'es2022', lib: ['es2023'], strict: true, esModuleInterop: true, isolatedModules: true, rootDir: '.', types: ['jest'] } }],
  },
};
