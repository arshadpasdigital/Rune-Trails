import { createMMKV } from "react-native-mmkv";
import { KeyValueStorage } from "./progressStore";

const mmkv = createMMKV({ id: "rune-trails" });

export const mmkvStorage: KeyValueStorage = {
  getString(key: string): string | undefined {
    return mmkv.getString(key);
  },
  set(key: string, value: string): void {
    mmkv.set(key, value);
  },
};
