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
  if (status === "todo") {
    return "in-progress";
  }

  if (status === "in-progress") {
    return "done";
  }

  return "todo";
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
        return;
      }

      setTask(currentTask);
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
    if (!task) {
      return;
    }

    setBusyAction("status");
    setError("");

    try {
      const nextStatus = getNextStatus(task.status);

      const updatedTask = await updateTaskStatus(task.id, nextStatus);

      setTask(updatedTask);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the task status.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  function handleDeletePress() {
    if (!task || busyAction !== null) {
      return;
    }

    setError("");
    setShowDeleteConfirmation(true);
  }

  function cancelDelete() {
    if (busyAction === null) {
      setShowDeleteConfirmation(false);
    }
  }

  async function confirmDelete() {
    if (!task) {
      return;
    }

    setShowDeleteConfirmation(false);
    setBusyAction("delete");
    setError("");

    try {
      await deleteTask(task.id);
      navigation.goBack();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete the task.",
      );
      setBusyAction(null);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading task...</Text>
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

  const nextStatus = getNextStatus(task.status);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={busyAction !== null}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>TASK DETAILS</Text>
            <Text style={styles.headerTitle}>Task</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.taskTitle}>{task.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>STATUS</Text>

              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {STATUS_LABELS[task.status]}
                </Text>
              </View>
            </View>

            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>PRIORITY</Text>

              <View style={styles.priorityBadge}>
                <Text style={styles.priorityBadgeText}>
                  {PRIORITY_LABELS[task.priority]}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <Pressable
            style={styles.primaryAction}
            onPress={handleStatusChange}
            disabled={busyAction !== null}
          >
            {busyAction === "status" ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryActionText}>
                Move to {STATUS_LABELS[nextStatus]}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryAction}
            onPress={() =>
              navigation.navigate("EditTask", {
                taskId: task.id,
              })
            }
            disabled={busyAction !== null}
          >
            <Text style={styles.secondaryActionText}>Edit task</Text>
          </Pressable>

          <Pressable
            style={styles.deleteAction}
            onPress={handleDeletePress}
            disabled={busyAction !== null}
          >
            {busyAction === "delete" ? (
              <ActivityIndicator color="#dc2626" />
            ) : (
              <Text style={styles.deleteActionText}>Delete task</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteConfirmation}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Delete task?</Text>

            <Text style={styles.confirmationText}>
              {`Delete "${task.title}"? This action cannot be undone.`}
            </Text>

            <View style={styles.confirmationActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={cancelDelete}
                disabled={busyAction !== null}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.confirmDeleteButton}
                onPress={() => void confirmDelete()}
                disabled={busyAction !== null}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
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
    backgroundColor: "#f8fafc",
  },

  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },

  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    color: "#0f172a",
    fontSize: 30,
    lineHeight: 32,
  },

  headerText: {
    marginLeft: 12,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: 1,
    marginBottom: 3,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  taskTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
    color: "#0f172a",
  },

  metaRow: {
    flexDirection: "row",
    gap: 28,
    marginTop: 28,
  },

  metaBlock: {
    flex: 1,
  },

  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  statusBadgeText: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "700",
  },

  priorityBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  priorityBadgeText: {
    color: "#92400e",
    fontSize: 13,
    fontWeight: "700",
  },

  errorBox: {
    marginTop: 16,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 14,
  },

  errorBoxText: {
    color: "#b91c1c",
    fontSize: 14,
    lineHeight: 20,
  },

  actionsCard: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },

  primaryAction: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  primaryActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  secondaryAction: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 10,
  },

  secondaryActionText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },

  deleteAction: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fffafa",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 10,
  },

  deleteActionText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "700",
  },

  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },

  errorText: {
    color: "#64748b",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },

  primaryButton: {
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
  },

  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  confirmationCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
  },

  confirmationTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },

  confirmationText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748b",
  },

  confirmationActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },

  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },

  confirmDeleteButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmDeleteText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
