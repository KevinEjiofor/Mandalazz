// jest.config.js
module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Global timeout for all tests (15 seconds)
    testTimeout: 15000,

    // Clear mocks between tests
    clearMocks: true,

    // Coverage settings
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/coverage/'
    ],

    // Test file patterns
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],

    // Setup files (if you have any)
    // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

    // Verbose output
    verbose: true,

    // Handle ES modules if needed
    transform: {
        '^.+\\.js$': 'babel-jest'
    }
};