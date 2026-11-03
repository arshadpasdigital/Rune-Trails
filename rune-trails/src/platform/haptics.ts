import * as Haptics from "expo-haptics";

export function lightImpact(enabled: boolean): void {
  if (!enabled) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function successNotification(enabled: boolean): void {
  if (!enabled) return;
  void Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Success,
  ).catch(() => {});
}
