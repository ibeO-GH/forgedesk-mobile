import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { deleteTask, getTasks, updateTaskStatus } from "../../api/tasks";
import type { Task } from "../../types/task";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "TaskDetails">;

const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

const PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function getNextStatus(status: Task["status"]): Task["status"] {
  if (status === "todo") return "in-progress";
  if (status === "in-progress") return "done";
  return "todo";
}

function getStatusColors(status: Task["status"]) {
  if (status === "done") {
    return { background: "#DCFCE7", text: "#15803D" };
  }

  if (status === "in-progress") {
    return { background: "#EDE9FE", text: "#6D28D9" };
  }

  return { background: "#EFF6FF", text: "#2563EB" };
}

function getPriorityColors(priority: Task["priority"]) {
  if (priority === "high") {
    return { background: "#FEF2F2", text: "#B91C1C" };
  }

  if (priority === "medium") {
    return { background: "#FEF3C7", text: "#92400E" };
  }

  return { background: "#DCFCE7", text: "#166534" };
}

export default function TaskDetailsScreen({ navigation, route }: Props) {
  const { taskId } = route.params;

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"status" | "delete" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const loadTask = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const tasks = await getTasks();
      const currentTask = tasks.find((item) => item.id === taskId);

      if (!currentTask) {
        setTask(null);
        setError("This task could not be found.");
      } else {
        setTask(currentTask);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load this task.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      void loadTask();
    }, [loadTask]),
  );

  async function handleStatusChange() {
    if (!task || busyAction) return;

    setBusyAction("status");
    setError("");

    try {
      const updatedTask = await updateTaskStatus(
        task.id,
        getNextStatus(task.status),
      );
      setTask(updatedTask);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update task status.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function confirmDelete() {
    if (!task || busyAction) return;

    setShowDeleteConfirmation(false);
    setBusyAction("delete");
    setError("");

    try {
      await deleteTask(task.id);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete task.");
      setBusyAction(null);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Task unavailable</Text>
        <Text style={styles.errorText}>
          {error || "This task could not be loaded."}
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>Back to tasks</Text>
        </Pressable>
      </View>
    );
  }

  const statusColors = getStatusColors(task.status);
  const priorityColors = getPriorityColors(task.priority);
  const nextStatus = getNextStatus(task.status);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={busyAction !== null}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>FORGEDESK / TASKS</Text>
            <Text style={styles.headerTitle}>Task details</Text>
          </View>
        </View>

        <View style={styles.taskCard}>
          <Text style={styles.cardEyebrow}>TASK</Text>
          <Text style={styles.taskTitle}>{task.title}</Text>

          <View style={styles.divider} />

          <View style={styles.metadataRow}>
            <View style={styles.metadataBlock}>
              <Text style={styles.metadataLabel}>STATUS</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: statusColors.background },
                ]}
              >
                <Text style={[styles.badgeText, { color: statusColors.text }]}>
                  {STATUS_LABELS[task.status]}
                </Text>
              </View>
            </View>

            <View style={styles.metadataBlock}>
              <Text style={styles.metadataLabel}>PRIORITY</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: priorityColors.background },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: priorityColors.text }]}
                >
                  {PRIORITY_LABELS[task.priority]}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Manage task</Text>
          <Text style={styles.sectionSubtitle}>
            Update the progress or make changes to this task.
          </Text>

          <Pressable
            style={styles.primaryAction}
            onPress={() => void handleStatusChange()}
            disabled={busyAction !== null}
          >
            {busyAction === "status" ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryActionText}>
                {task.status === "done"
                  ? "Reopen task"
                  : `Move to ${STATUS_LABELS[nextStatus]}`}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryAction}
            onPress={() => navigation.navigate("EditTask", { taskId: task.id })}
            disabled={busyAction !== null}
          >
            <Text style={styles.secondaryActionText}>Edit task details</Text>
          </Pressable>

          <Pressable
            style={styles.deleteAction}
            onPress={() => setShowDeleteConfirmation(true)}
            disabled={busyAction !== null}
          >
            <Text style={styles.deleteActionText}>Delete task</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmation(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Delete this task?</Text>
            <Text style={styles.confirmationText}>
              "{task.title}" will be permanently removed.
            </Text>

            <View style={styles.confirmationActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowDeleteConfirmation(false)}
                disabled={busyAction !== null}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.confirmDeleteButton}
                onPress={() => void confirmDelete()}
                disabled={busyAction !== null}
              >
                <Text style={styles.confirmDeleteText}>Delete task</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  errorTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 18,
  },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  backText: {
    fontSize: 30,
    lineHeight: 32,
    color: theme.colors.text,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  taskCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    padding: 20,
  },
  cardEyebrow: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },
  taskTitle: {
    color: theme.colors.text,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 20,
  },
  metadataRow: {
    flexDirection: "row",
    gap: 35,
  },
  metadataBlock: {
    alignItems: "flex-start",
  },
  metadataLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: 12,
    padding: 13,
    marginTop: 15,
  },
  actionsCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    padding: 20,
    marginTop: 18,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 18,
  },
  primaryAction: {
    minHeight: 51,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryAction: {
    minHeight: 49,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryActionText: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 14,
  },
  deleteAction: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  deleteActionText: {
    color: theme.colors.danger,
    fontWeight: "800",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.48)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  confirmationCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 22,
  },
  confirmationTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  confirmationText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  confirmationActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 23,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 12,
  },
  confirmDeleteButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
});
