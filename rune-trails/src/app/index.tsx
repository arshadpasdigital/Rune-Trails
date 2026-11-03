import { useEffect, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { BoardCanvasHost } from "../render/BoardCanvasHost";
import { hudState, isUnlocked, nextLevelId } from "../state/sessionLogic";
import { useSessionStore } from "../state/store";

export default function PlayScreen() {
  const {
    ready,
    levels,
    levelIndex,
    game,
    events,
    solved,
    progress,
    load,
    startLevel,
    connect,
    undo,
    advance,
    toggleHaptics,
  } = useSessionStore();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (!ready) load();
  }, [ready, load]);

  const level = levels[levelIndex];
  const board = game.history.current;
  const hud = useMemo(
    () =>
      level
        ? hudState(level.id, board, game.history)
        : { levelId: "", connected: 0, totalPairs: 0, canUndo: false },
    [level, board, game.history],
  );

  const boardSize = Math.min(width - 32, Math.min(height * 0.52, 460));
  const levelIds = levels.map((item) => item.id);
  const hasNext = level ? nextLevelId(levelIds, level.id) !== null : false;

  const lastHazard = [...events].reverse().find(
    (event) =>
      event.type === "hazard-applied" || event.type === "hazard-rejected",
  );

  if (!ready || !level) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading Mystic Swirls…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Mystic Swirls</Text>
        <Text style={styles.subtitle}>
          {level.name} · Level {levelIndex + 1} / {levels.length}
        </Text>
      </View>

      <View style={styles.hud}>
        <View style={styles.hudBlock}>
          <Text style={styles.hudLabel}>Pairs</Text>
          <Text style={styles.hudValue}>
            {hud.connected}/{hud.totalPairs}
          </Text>
        </View>
        <View style={styles.hudBlock}>
          <Text style={styles.hudLabel}>Haptics</Text>
          <Pressable onPress={toggleHaptics} style={styles.toggle}>
            <Text style={styles.hudValue}>
              {progress.hapticsEnabled ? "On" : "Off"}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={undo}
          disabled={!hud.canUndo || solved}
          style={[
            styles.hudBlock,
            styles.undo,
            (!hud.canUndo || solved) && styles.undoDisabled,
          ]}
        >
          <Text style={styles.hudLabel}>Undo</Text>
          <Text style={styles.hudValue}>↶</Text>
        </Pressable>
      </View>

      <BoardCanvasHost
        board={board}
        size={boardSize}
        events={events}
        disabled={solved}
        onCommit={connect}
      />

      <View style={styles.feedback}>
        {lastHazard?.type === "hazard-applied" ? (
          <Text style={styles.feedbackApplied}>The wind shifts the board.</Text>
        ) : lastHazard?.type === "hazard-rejected" ? (
          <Text style={styles.feedbackRejected}>
            The wind falters — the board holds.
          </Text>
        ) : (
          <Text style={styles.feedbackIdle}>
            Trace a path between matching runes.
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.levelRow}
      >
        {levels.map((item, index) => {
          const unlocked = isUnlocked(item.id, levelIds, progress.completed);
          const done = progress.completed.includes(item.id);
          return (
            <Pressable
              key={item.id}
              disabled={!unlocked}
              onPress={() => startLevel(index)}
              style={[
                styles.levelChip,
                index === levelIndex && styles.levelChipActive,
                !unlocked && styles.levelChipLocked,
              ]}
            >
              <Text style={styles.levelChipText}>
                {index + 1}
                {done ? " ✓" : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {solved ? (
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Level complete</Text>
            <Text style={styles.panelBody}>
              {hud.totalPairs}/{hud.totalPairs} pairs connected
            </Text>
            {hasNext ? (
              <Pressable onPress={advance} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Next level</Text>
              </Pressable>
            ) : (
              <Text style={styles.panelBody}>
                All shipped levels complete. Replay any level above.
              </Text>
            )}
            <Pressable
              onPress={() => startLevel(levelIndex)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Replay level</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#080D17",
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  loading: {
    flex: 1,
    backgroundColor: "#080D17",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#D9D4FF",
    fontSize: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    color: "#F2F0FF",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 1,
  },
  subtitle: {
    color: "#8FA0C4",
    fontSize: 13,
    marginTop: 2,
  },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  hudBlock: {
    backgroundColor: "#111A2C",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 82,
  },
  hudLabel: {
    color: "#7E8DB3",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hudValue: {
    color: "#E8ECFF",
    fontSize: 17,
    fontWeight: "600",
  },
  toggle: {
    paddingTop: 2,
  },
  undo: {
    alignItems: "center",
  },
  undoDisabled: {
    opacity: 0.35,
  },
  feedback: {
    minHeight: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  feedbackIdle: {
    color: "#5F6B8A",
    fontSize: 12,
  },
  feedbackApplied: {
    color: "#7BC96F",
    fontSize: 12,
  },
  feedbackRejected: {
    color: "#FF9F5A",
    fontSize: 12,
  },
  levelRow: {
    gap: 8,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  levelChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#111A2C",
    alignItems: "center",
    justifyContent: "center",
  },
  levelChipActive: {
    borderWidth: 2,
    borderColor: "#6FC3FF",
  },
  levelChipLocked: {
    opacity: 0.3,
  },
  levelChipText: {
    color: "#E8ECFF",
    fontSize: 14,
    fontWeight: "600",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(4, 8, 16, 0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  panel: {
    width: "82%",
    backgroundColor: "#101A2E",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#223252",
  },
  panelTitle: {
    color: "#F2F0FF",
    fontSize: 24,
    fontWeight: "700",
  },
  panelBody: {
    color: "#9FB0D6",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: "#3DA9FF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  primaryButtonText: {
    color: "#04101F",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#8FA0C4",
    fontSize: 13,
  },
});
