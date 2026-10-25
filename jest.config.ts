import type { Config } from "jest";
import nextJest from "next/jest.js";

// next/jest wires up the Next.js compiler (SWC) as the transformer, mocks
// CSS/images/next/font, and loads .env files, so tests need no Babel config.
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Same "@/*" -> "src/*" alias as tsconfig.json.
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  // e2e/ is Playwright's; Jest must not try to run it.
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/e2e/"],
};

export default createJestConfig(config);
