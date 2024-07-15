import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: "node",
  testMatch: ["**/src/**/*.spec.ts"],
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
};

export default config;