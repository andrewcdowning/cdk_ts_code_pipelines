module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  reporters: [
    'default',
    [ 'jest-junit', {
      outputDirectory: 'test_reports',
      outputName: 'test_report.xml',
    } ]
  ]
};
