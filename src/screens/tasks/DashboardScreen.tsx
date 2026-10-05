import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { deleteTask, getTasks, updateTaskStatus } from "../../api/tasks";
import type { Task, TaskStatus } from "../../types/task";
import { useAuth } from "../../context/AuthContext";
import type { RootStackParamList } from "../../navigation/AppNavigator";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

type StatusFilter = "all" | TaskStatus;

const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

function getNextStatus(status: TaskStatus): TaskStatus {
  if (status === "todo") {
    return "in-progress";
  }

  if (status === "in-progress") {
    return "done";
  }

  return "todo";
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterButtonText,
          active && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TaskCard({
  task,
  onOpen,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  onOpen: () => void;
  onEdit: () => void;
  onStatusChange: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.taskCard}>
      <Pressable style={styles.taskContent} onPress={onOpen}>
        <Text style={styles.taskTitle}>{task.title}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{statusLabels[task.status]}</Text>
          </View>

          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>
              {priorityLabels[task.priority]}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.taskActions}>
        <Pressable style={styles.secondaryAction} onPress={onStatusChange}>
          <Text style={styles.secondaryActionText}>
            Move to {statusLabels[getNextStatus(task.status)]}
          </Text>
        </Pressable>

        <View style={styles.actionRow}>
          <Pressable style={styles.editButton} onPress={onEdit}>
            <Text style={styles.editText}>Edit</Text>
          </Pressable>

          <Pressable style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Navigation>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const loadTasks = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError("");

    try {
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your tasks. Please try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTasks();
    }, [loadTasks]),
  );

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        task.title.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 || statusFilter !== "all";

  async function handleStatusChange(task: Task) {
    const nextStatus = getNextStatus(task.status);

    setBusyTaskId(task.id);
    setError("");

    try {
      const updatedTask = await updateTaskStatus(task.id, nextStatus);

      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === updatedTask.id ? updatedTask : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the task status.",
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  function handleDelete(task: Task) {
    setTaskToDelete(task);
  }

  async function confirmDelete() {
    if (!taskToDelete) {
      return;
    }

    const taskId = taskToDelete.id;

    setTaskToDelete(null);
    setBusyTaskId(taskId);
    setError("");

    try {
      await deleteTask(taskId);

      setTasks((currentTasks) =>
        currentTasks.filter((item) => item.id !== taskId),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete the task.",
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
  }

  function renderTask({ item }: { item: Task }) {
    const isBusy = busyTaskId === item.id;

    return (
      <View style={styles.taskWrapper}>
        <TaskCard
          task={item}
          onOpen={() =>
            navigation.navigate("TaskDetails", {
              taskId: item.id,
            })
          }
          onEdit={() =>
            navigation.navigate("EditTask", {
              taskId: item.id,
            })
          }
          onStatusChange={() => {
            if (!isBusy) {
              void handleStatusChange(item);
            }
          }}
          onDelete={() => {
            if (!isBusy) {
              handleDelete(item);
            }
          }}
        />

        {isBusy ? (
          <View style={styles.busyOverlay}>
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        ) : null}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />

        <Text style={styles.loadingText}>Loading your tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={[
          styles.listContent,
          filteredTasks.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadTasks(true)}
            tintColor="#2563eb"
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>FORGEDESK</Text>

                <Text style={styles.title}>Your Tasks</Text>

                <Text style={styles.subtitle}>
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                </Text>
              </View>

              <Pressable style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText}>Log out</Text>
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Something went wrong</Text>

                <Text style={styles.errorText}>{error}</Text>

                <Pressable
                  style={styles.retryButton}
                  onPress={() => void loadTasks()}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={styles.createButton}
              onPress={() => navigation.navigate("CreateTask")}
            >
              <Text style={styles.createButtonText}>+ Create task</Text>
            </Pressable>

            <View style={styles.discoverySection}>
              <Text style={styles.sectionLabel}>Find a task</Text>

              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search tasks..."
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Status</Text>

              <View style={styles.filterRow}>
                <FilterButton
                  label="All"
                  active={statusFilter === "all"}
                  onPress={() => setStatusFilter("all")}
                />

                <FilterButton
                  label="To Do"
                  active={statusFilter === "todo"}
                  onPress={() => setStatusFilter("todo")}
                />

                <FilterButton
                  label="In Progress"
                  active={statusFilter === "in-progress"}
                  onPress={() => setStatusFilter("in-progress")}
                />

                <FilterButton
                  label="Done"
                  active={statusFilter === "done"}
                  onPress={() => setStatusFilter("done")}
                />
              </View>
            </View>

            {tasks.length > 0 && filteredTasks.length > 0 ? (
              <Text style={styles.sectionTitle}>
                {hasActiveFilters
                  ? `${filteredTasks.length} matching ${
                      filteredTasks.length === 1 ? "task" : "tasks"
                    }`
                  : "All tasks"}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          tasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No tasks yet</Text>

              <Text style={styles.emptyText}>
                Create your first task to start managing your work from mobile.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No matching tasks</Text>

              <Text style={styles.emptyText}>
                Try a different search or status filter.
              </Text>

              <Pressable
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </Pressable>
            </View>
          )
        }
      />

      <Modal
        visible={taskToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskToDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Delete task?</Text>

            <Text style={styles.confirmationText}>
              {taskToDelete
                ? `Delete "${taskToDelete.title}"? This action cannot be undone.`
                : ""}
            </Text>

            <View style={styles.confirmationActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setTaskToDelete(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.confirmDeleteButton}
                onPress={() => void confirmDelete()}
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
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  listContent: {
    padding: 20,
    paddingTop: 32,
    paddingBottom: 32,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  centered: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 15,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: 1,
    marginBottom: 4,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0f172a",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#64748b",
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#ffffff",
  },

  logoutText: {
    color: "#334155",
    fontWeight: "600",
  },

  createButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  createButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  discoverySection: {
    marginBottom: 16,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    color: "#0f172a",
    fontSize: 15,
  },

  filterSection: {
    marginBottom: 18,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },

  filterButtonText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },

  filterButtonTextActive: {
    color: "#ffffff",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },

  taskWrapper: {
    position: "relative",
    marginBottom: 12,
  },

  taskCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 16,
  },

  taskContent: {
    flex: 1,
  },

  taskTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    color: "#0f172a",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#eff6ff",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1d4ed8",
  },

  priorityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f1f5f9",
  },

  priorityText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },

  taskActions: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },

  secondaryAction: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryActionText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },

  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  editButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },

  editText: {
    color: "#334155",
    fontWeight: "700",
  },

  deleteButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteText: {
    color: "#b91c1c",
    fontWeight: "700",
  },

  busyOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 24,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748b",
  },

  clearFiltersButton: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: "#eff6ff",
  },

  clearFiltersText: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 14,
  },

  errorCard: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 4,
  },

  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#b91c1c",
  },

  retryButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fecaca",
  },

  retryText: {
    color: "#991b1b",
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
