import { View } from "react-native";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import type { BoardCanvasProps } from "./BoardCanvas";

export function BoardCanvasHost(props: BoardCanvasProps) {
  return (
    <WithSkiaWeb
      getComponent={async () => {
        const { BoardCanvas } = await import("./BoardCanvas");
        return { default: BoardCanvas };
      }}
      componentProps={props}
      fallback={<View style={{ width: props.size, height: props.size }} />}
    />
  );
}
