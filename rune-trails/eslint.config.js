const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const HEADLESS_MESSAGE =
  "src/engine and src/content must stay headless: no React, React Native, Skia, Reanimated, zustand, MMKV, or upper layers.";

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "android/*", "ios/*", ".expo/*", "node_modules/*"],
  },
  {
    files: ["src/engine/**/*.{ts,tsx}", "src/content/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: HEADLESS_MESSAGE },
            { name: "zustand", message: HEADLESS_MESSAGE },
            { name: "react-native-mmkv", message: HEADLESS_MESSAGE },
          ],
          patterns: [
            {
              group: [
                "react-native",
                "react-native/*",
                "react-dom",
                "@shopify/react-native-skia",
                "react-native-reanimated",
                "react-native-gesture-handler",
                "expo",
                "expo/*",
                "expo-router",
                "expo-router/*",
              ],
              message: HEADLESS_MESSAGE,
            },
            {
              group: [
                "../sim/*",
                "../../sim/*",
                "../render/*",
                "../../render/*",
                "../state/*",
                "../../state/*",
                "../platform/*",
                "../../platform/*",
                "../app/*",
                "../../app/*",
                "@/sim/*",
                "@/render/*",
                "@/state/*",
                "@/platform/*",
                "@/app/*",
              ],
              message: HEADLESS_MESSAGE,
            },
          ],
        },
      ],
    },
  },
]);
