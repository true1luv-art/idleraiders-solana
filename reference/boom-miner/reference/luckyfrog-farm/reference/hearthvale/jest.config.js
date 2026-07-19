/*
 * Jest configuration for Hearthvale game tests
 */
module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  // The test environment that will be used for testing
  testEnvironment: "node",

  // Test file patterns
  testMatch: ["<rootDir>/features/**/*.test.ts"],

  // Ignore patterns
  testPathIgnorePatterns: ["/node_modules/", "/repo/"],

  // A map from regular expressions to module names
  moduleNameMapper: {
    "^lib/(.*)$": "<rootDir>/lib/$1",
    "^features/(.*)$": "<rootDir>/features/$1",
    "^components/(.*)$": "<rootDir>/components/$1",
    "^assets/(.*)$": "<rootDir>/public/assets/$1",
  },

  // Transform TypeScript files
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },

  // Module file extensions
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  // Root directory
  rootDir: ".",
};
