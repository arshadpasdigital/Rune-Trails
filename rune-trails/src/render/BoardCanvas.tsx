/* eslint-disable react-hooks/immutability */
import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  Canvas,
  Circle,
  Group,
  Path,
  Rect,
  Skia,
} from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  Easing,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { BoardState, CellKind, Element, NO_PAIR } from "../engine/types";
import { GameEvent } from "../sim/events";
import { cellCenter, computeLayout } from "./layout";
import { ELEMENT_PALETTE, TERRAIN_COLORS } from "./palette";

export interface BoardCanvasProps {
  board: BoardState;
  size: number;
  events: GameEvent[];
  disabled?: boolean;
  onCommit: (pairId: number, path: number[]) => void;
}

function elementForCode(code: number): Element | null {
  if (code === 1) return "fire";
  if (code === 2) return "water";
  if (code === 3) return "earth";
  if (code === 4) return "air";
  return null;
}

function cellFill(kind: CellKind): string {
  if (kind === "pit") return TERRAIN_COLORS.pit;
  if (kind === "lava") return TERRAIN_COLORS.lava;
  if (kind === "thorn") return TERRAIN_COLORS.thorn;
  if (kind === "stone") return TERRAIN_COLORS.stone;
  if (kind === "covered") return TERRAIN_COLORS.covered;
  return TERRAIN_COLORS.free;
}

function buildCellPath(layout: ReturnType<typeof computeLayout>, cells: number[], w: number) {
  const builder = Skia.PathBuilder.Make();
  if (cells.length === 0) return builder.detach();
  const first = cellCenter(layout, cells[0] % w, Math.floor(cells[0] / w));
  builder.moveTo(first.x, first.y);
  for (let i = 1; i < cells.length; i += 1) {
    const point = cellCenter(layout, cells[i] % w, Math.floor(cells[i] / w));
    builder.lineTo(point.x, point.y);
  }
  return builder.detach();
}

export function BoardCanvas({
  board,
  size,
  events,
  disabled = false,
  onCommit,
}: BoardCanvasProps) {
  const layout = useMemo(
    () => computeLayout(board.w, board.h, size, size),
    [board.w, board.h, size],
  );
  const { cellSize, originX, originY } = layout;

  const traceCells = useSharedValue<number[]>([]);
  const activePair = useSharedValue(-1);
  const pointer = useSharedValue({ x: 0, y: 0 });
  const coreColor = useSharedValue<string>(ELEMENT_PALETTE.fire.core);
  const bloomColor = useSharedValue<string>(ELEMENT_PALETTE.fire.bloom);
  const haloColor = useSharedValue<string>(ELEMENT_PALETTE.fire.halo);

  let animatedRow = -1;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event.type === "hazard-applied" && event.mutation.kind === "shift-row") {
      animatedRow = event.mutation.row;
      break;
    }
  }
  const rowSlide = useSharedValue(1);
  const shake = useSharedValue(0);
  const rowTransform = useDerivedValue(() => [{ translateX: rowSlide.value }]);
  const shakeTransform = useDerivedValue(() => [{ translateX: shake.value }]);

  useEffect(() => {
    const lastApplied = [...events]
      .reverse()
      .find((event) => event.type === "hazard-applied");
    if (lastApplied && lastApplied.type === "hazard-applied") {
      const mutation = lastApplied.mutation;
      if (mutation.kind === "shift-row") {
        rowSlide.value = -mutation.dx * cellSize;
        rowSlide.value = withTiming(0, {
          duration: 280,
          easing: Easing.out(Easing.cubic),
        });
      }
    }
    const rejected = [...events].reverse().find((event) => event.type === "hazard-rejected");
    if (rejected) {
      shake.value = withSequence(
        withTiming(5, { duration: 45 }),
        withTiming(-5, { duration: 45 }),
        withTiming(0, { duration: 45 }),
      );
    }
  }, [events, cellSize, rowSlide, shake]);

  const hitCell = (px: number, py: number): number => {
    "worklet";
    if (cellSize <= 0) return -1;
    const lx = (px - originX) / cellSize;
    const ly = (py - originY) / cellSize;
    if (lx < 0 || ly < 0 || lx >= board.w || ly >= board.h) return -1;
    return Math.floor(ly) * board.w + Math.floor(lx);
  };

  const adjacent = (a: number, b: number): boolean => {
    "worklet";
    const ax = a % board.w;
    const ay = Math.floor(a / board.w);
    const bx = b % board.w;
    const by = Math.floor(b / board.w);
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      "worklet";
      if (disabled) return;
      const cell = hitCell(event.x, event.y);
      if (cell < 0) return;
      const pairId = board.pairOf[cell];
      if (pairId === NO_PAIR) return;
      if (board.connected.includes(pairId)) return;
      if (board.cells[cell] === "covered") return;
      const code = board.element[cell];
      const palette =
        code === 1
          ? ELEMENT_PALETTE.fire
          : code === 2
            ? ELEMENT_PALETTE.water
            : code === 3
              ? ELEMENT_PALETTE.earth
              : ELEMENT_PALETTE.air;
      activePair.value = pairId;
      coreColor.value = palette.core;
      bloomColor.value = palette.bloom;
      haloColor.value = palette.halo;
      traceCells.value = [cell];
      pointer.value = { x: event.x, y: event.y };
    })
    .onUpdate((event) => {
      "worklet";
      pointer.value = { x: event.x, y: event.y };
      if (activePair.value < 0) return;
      const cells = traceCells.value;
      if (cells.length === 0) return;
      const target = hitCell(event.x, event.y);
      if (target < 0) return;
      const head = cells[cells.length - 1];
      if (target === head) return;
      if (!adjacent(head, target)) return;
      if (cells.length >= 2 && cells[cells.length - 2] === target) {
        traceCells.value = cells.slice(0, -1);
        return;
      }
      if (cells.includes(target)) return;
      if (board.cells[target] === "covered") return;
      const kind = board.cells[target];
      if (kind !== "free" && kind !== "rune") return;
      const owner = board.pairOf[target];
      if (owner !== NO_PAIR && owner !== activePair.value) return;
      traceCells.value = [...cells, target];
    })
    .onEnd(() => {
      "worklet";
      const cells = traceCells.value;
      const pairId = activePair.value;
      traceCells.value = [];
      activePair.value = -1;
      if (cells.length >= 2 && pairId >= 0) {
        runOnJS(onCommit)(pairId, cells);
      }
    })
    .onFinalize(() => {
      "worklet";
      traceCells.value = [];
      activePair.value = -1;
    });

  const trailPath = useDerivedValue(() => {
    const builder = Skia.PathBuilder.Make();
    const cells = traceCells.value;
    if (cells.length === 0) return builder.detach();
    const center = (index: number) => {
      "worklet";
      return {
        x: originX + (index % board.w + 0.5) * cellSize,
        y: originY + (Math.floor(index / board.w) + 0.5) * cellSize,
      };
    };
    const first = center(cells[0]);
    builder.moveTo(first.x, first.y);
    for (let i = 1; i < cells.length; i += 1) {
      const point = center(cells[i]);
      builder.lineTo(point.x, point.y);
    }
    const head = center(cells[cells.length - 1]);
    const maxX = originX + board.w * cellSize;
    const maxY = originY + board.h * cellSize;
    const px = Math.max(originX, Math.min(maxX, pointer.value.x));
    const py = Math.max(originY, Math.min(maxY, pointer.value.y));
    const dx = px - head.x;
    const dy = py - head.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const limit = cellSize * 0.45;
    if (distance > 0.001) {
      const scale = Math.min(1, limit / distance);
      builder.lineTo(head.x + dx * scale, head.y + dy * scale);
    }
    return builder.detach();
  });

  const rowNodes: React.ReactNode[][] = Array.from(
    { length: board.h },
    () => [],
  );
  for (let index = 0; index < board.cells.length; index += 1) {
    const x = index % board.w;
    const y = Math.floor(index / board.w);
    const kind = board.cells[index];
    const cx = originX + x * cellSize;
    const cy = originY + y * cellSize;
    rowNodes[y].push(
      <Rect
        key={`cell-${index}`}
        x={cx}
        y={cy}
        width={cellSize}
        height={cellSize}
        color={cellFill(kind)}
      />,
    );
    if (kind === "pit") {
      rowNodes[y].push(
        <Circle
          key={`pit-${index}`}
          cx={cx + cellSize / 2}
          cy={cy + cellSize / 2}
          r={cellSize * 0.22}
          color="#000000"
        />,
      );
    } else if (kind === "lava") {
      rowNodes[y].push(
        <Circle
          key={`lava-${index}`}
          cx={cx + cellSize / 2}
          cy={cy + cellSize / 2}
          r={cellSize * 0.2}
          color="#FFB347"
          opacity={0.7}
        />,
      );
    } else if (kind === "thorn") {
      rowNodes[y].push(
        <Circle
          key={`thorn-${index}`}
          cx={cx + cellSize / 2}
          cy={cy + cellSize / 2}
          r={cellSize * 0.16}
          color="#2E2413"
        />,
      );
    } else if (kind === "stone") {
      rowNodes[y].push(
        <Circle
          key={`stone-${index}`}
          cx={cx + cellSize / 2}
          cy={cy + cellSize / 2}
          r={cellSize * 0.24}
          color="#7A8291"
        />,
      );
    }
  }

  const rows = rowNodes.map((nodes, y) =>
    y === animatedRow ? (
      <Group key={`row-${y}`} transform={rowTransform}>
        {nodes}
      </Group>
    ) : (
      <Group key={`row-${y}`}>{nodes}</Group>
    ),
  );

  const committedPaths = [];
  for (const key of Object.keys(board.paths)) {
    const pairId = Number(key);
    const cells = board.paths[pairId];
    const first = cells[0];
    const element = elementForCode(board.element[first]);
    if (!element) continue;
    const path = buildCellPath(layout, cells, board.w);
    const palette = ELEMENT_PALETTE[element];
    committedPaths.push(
      <Group key={`path-${pairId}`}>
        <Path
          path={path}
          style="stroke"
          strokeWidth={cellSize * 0.5}
          color={palette.halo}
          opacity={0.22}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path
          path={path}
          style="stroke"
          strokeWidth={cellSize * 0.26}
          color={palette.bloom}
          opacity={0.55}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path
          path={path}
          style="stroke"
          strokeWidth={cellSize * 0.11}
          color={palette.core}
          strokeCap="round"
          strokeJoin="round"
        />
      </Group>,
    );
  }

  const runes = [];
  for (let index = 0; index < board.pairOf.length; index += 1) {
    const pairId = board.pairOf[index];
    if (pairId === NO_PAIR) continue;
    const element = elementForCode(board.element[index]);
    if (!element) continue;
    const x = originX + (index % board.w + 0.5) * cellSize;
    const y = originY + (Math.floor(index / board.w) + 0.5) * cellSize;
    const connected = board.connected.includes(pairId);
    runes.push(
      <Group key={`rune-${index}`} opacity={connected ? 0.45 : 1}>
        <Circle cx={x} cy={y} r={cellSize * 0.3} color={ELEMENT_PALETTE[element].halo} opacity={0.35} />
        <Circle cx={x} cy={y} r={cellSize * 0.18} color={ELEMENT_PALETTE[element].rune} />
      </Group>,
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <GestureDetector gesture={pan}>
        <Canvas style={{ width: size, height: size }}>
          <Group transform={shakeTransform}>
            {rows}
            {committedPaths}
            <Path
              path={trailPath}
              style="stroke"
              strokeWidth={cellSize * 0.52}
              color={haloColor}
              opacity={0.28}
              strokeCap="round"
              strokeJoin="round"
            />
            <Path
              path={trailPath}
              style="stroke"
              strokeWidth={cellSize * 0.28}
              color={bloomColor}
              opacity={0.6}
              strokeCap="round"
              strokeJoin="round"
            />
            <Path
              path={trailPath}
              style="stroke"
              strokeWidth={cellSize * 0.12}
              color={coreColor}
              strokeCap="round"
              strokeJoin="round"
            />
            {runes}
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
  },
});
