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
import { theme } from "../../theme";

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
  if (status === "todo") return "in-progress";
  if (status === "in-progress") return "done";
  return "todo";
}

function getStatusColors(status: TaskStatus) {
  if (status === "done") {
    return { background: theme.colors.successSoft, text: theme.colors.success };
  }

  if (status === "in-progress") {
    return { background: "#EDE9FE", text: "#6D28D9" };
  }

  return { background: theme.colors.primarySoft, text: theme.colors.primary };
}

function getPriorityColors(priority: Task["priority"]) {
  if (priority === "high") {
    return { background: theme.colors.dangerSoft, text: "#B91C1C" };
  }

  if (priority === "medium") {
    return { background: theme.colors.warningSoft, text: "#92400E" };
  }

  return { background: theme.colors.successSoft, text: "#166534" };
}

function SummaryCard({
  label,
  count,
  color,
  background,
}: {
  label: string;
  count: number;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIndicator, { backgroundColor: color }]} />
      <Text style={styles.summaryCount}>{count}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <View style={[styles.summaryIcon, { backgroundColor: background }]}>
        <View style={[styles.summaryIconDot, { backgroundColor: color }]} />
      </View>
    </View>
  );
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
  busy,
  onOpen,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  busy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onStatusChange: () => void;
  onDelete: () => void;
}) {
  const statusColors = getStatusColors(task.status);
  const priorityColors = getPriorityColors(task.priority);

  return (
    <View style={styles.taskCard}>
      <Pressable onPress={onOpen} style={styles.taskMain}>
        <View style={styles.taskTitleRow}>
          <View style={styles.taskAccent} />
          <Text style={styles.taskTitle}>{task.title}</Text>
        </View>

        <View style={styles.badgeRow}>
          <View
            style={[styles.badge, { backgroundColor: statusColors.background }]}
          >
            <Text style={[styles.badgeText, { color: statusColors.text }]}>
              {statusLabels[task.status]}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              { backgroundColor: priorityColors.background },
            ]}
          >
            <Text style={[styles.badgeText, { color: priorityColors.text }]}>
              {priorityLabels[task.priority]}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.taskDivider} />

      <Pressable
        style={styles.statusAction}
        onPress={onStatusChange}
        disabled={busy}
      >
        <Text style={styles.statusActionText}>
          {task.status === "done"
            ? "Reopen task"
            : `Move to ${statusLabels[getNextStatus(task.status)]}`}
        </Text>
        <Text style={styles.actionArrow}>›</Text>
      </Pressable>

      <View style={styles.taskActionRow}>
        <Pressable style={styles.editButton} onPress={onEdit} disabled={busy}>
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={onDelete}
          disabled={busy}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>

      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : null}
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
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

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

  const counts = useMemo(
    () => ({
      todo: tasks.filter((task) => task.status === "todo").length,
      inProgress: tasks.filter((task) => task.status === "in-progress").length,
      done: tasks.filter((task) => task.status === "done").length,
    }),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 || statusFilter !== "all";

  async function handleStatusChange(task: Task) {
    setBusyTaskId(task.id);
    setError("");

    try {
      const updatedTask = await updateTaskStatus(
        task.id,
        getNextStatus(task.status),
      );

      setTasks((current) =>
        current.map((item) =>
          item.id === updatedTask.id ? updatedTask : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update task status.",
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  async function confirmDelete() {
    if (!taskToDelete) return;

    const taskId = taskToDelete.id;
    setTaskToDelete(null);
    setBusyTaskId(taskId);
    setError("");

    try {
      await deleteTask(taskId);
      setTasks((current) => current.filter((item) => item.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete task.");
    } finally {
      setBusyTaskId(null);
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Preparing your workspace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredTasks.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadTasks(true)}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.taskWrapper}>
            <TaskCard
              task={item}
              busy={busyTaskId === item.id}
              onOpen={() =>
                navigation.navigate("TaskDetails", { taskId: item.id })
              }
              onEdit={() =>
                navigation.navigate("EditTask", { taskId: item.id })
              }
              onStatusChange={() => void handleStatusChange(item)}
              onDelete={() => setTaskToDelete(item)}
            />
          </View>
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>F</Text>
                </View>
                <Text style={styles.brandName}>FORGEDESK</Text>
              </View>

              <Pressable onPress={logout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Log out</Text>
              </Pressable>
            </View>

            <View style={styles.welcomeBlock}>
              <Text style={styles.greeting}>
                Hello{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </Text>
              <Text style={styles.title}>Your Tasks</Text>
              <Text style={styles.subtitle}>
                Keep your work moving forward.
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <SummaryCard
                label="To Do"
                count={counts.todo}
                color="#2563EB"
                background="#EFF6FF"
              />
              <SummaryCard
                label="In Progress"
                count={counts.inProgress}
                color="#7C3AED"
                background="#F3E8FF"
              />
              <SummaryCard
                label="Completed"
                count={counts.done}
                color="#16A34A"
                background="#DCFCE7"
              />
            </View>

            <Pressable
              style={styles.createButton}
              onPress={() => navigation.navigate("CreateTask")}
            >
              <Text style={styles.createPlus}>＋</Text>
              <Text style={styles.createButtonText}>Create new task</Text>
            </Pressable>

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Connection or task error</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  style={styles.retryButton}
                  onPress={() => void loadTasks()}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.searchSection}>
              <Text style={styles.sectionLabel}>Find a task</Text>
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Search your tasks..."
                  placeholderTextColor={theme.colors.muted}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchTerm.length > 0 ? (
                  <Pressable onPress={() => setSearchTerm("")}>
                    <Text style={styles.clearSearch}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Filter by status</Text>
              <View style={styles.filterRow}>
                <FilterButton
                  label={`All (${tasks.length})`}
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

            <View style={styles.listHeading}>
              <View>
                <Text style={styles.sectionTitle}>
                  {hasActiveFilters ? "Search results" : "All tasks"}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {filteredTasks.length}{" "}
                  {filteredTasks.length === 1 ? "task" : "tasks"}
                  {hasActiveFilters ? " found" : " in your workspace"}
                </Text>
              </View>

              {hasActiveFilters ? (
                <Pressable onPress={clearFilters}>
                  <Text style={styles.resetText}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>
                {tasks.length === 0 ? "＋" : "⌕"}
              </Text>
            </View>
            <Text style={styles.emptyTitle}>
              {tasks.length === 0 ? "Nothing here yet" : "No matching tasks"}
            </Text>
            <Text style={styles.emptyText}>
              {tasks.length === 0
                ? "Create your first task and start organising your work."
                : "Try another search term or change the status filter."}
            </Text>
            {tasks.length === 0 ? (
              <Pressable
                style={styles.emptyButton}
                onPress={() => navigation.navigate("CreateTask")}
              >
                <Text style={styles.emptyButtonText}>
                  Create your first task
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={clearFilters} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
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
            <View style={styles.deleteIcon}>
              <Text style={styles.deleteIconText}>!</Text>
            </View>
            <Text style={styles.confirmationTitle}>Delete this task?</Text>
            <Text style={styles.confirmationText}>
              {taskToDelete
                ? `"${taskToDelete.title}" will be permanently removed.`
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
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 36,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 17,
  },
  brandName: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  logoutButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  logoutText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  welcomeBlock: {
    marginBottom: 20,
  },
  greeting: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 5,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    minHeight: 112,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 15,
    padding: 11,
    overflow: "hidden",
  },
  summaryIndicator: {
    width: 22,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    marginTop: 3,
  },
  summaryIcon: {
    position: "absolute",
    right: 9,
    top: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryIconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  createButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
    shadowColor: "#2563EB",
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  createPlus: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "500",
    marginRight: 8,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  errorCard: {
    backgroundColor: theme.colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 13,
    padding: 14,
    marginBottom: 18,
  },
  errorTitle: {
    color: "#991B1B",
    fontWeight: "800",
    marginBottom: 5,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  retryText: {
    color: "#991B1B",
    fontWeight: "800",
    fontSize: 12,
  },
  searchSection: {
    marginBottom: 19,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 9,
  },
  searchBox: {
    minHeight: 51,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  searchIcon: {
    fontSize: 23,
    color: theme.colors.muted,
    marginRight: 9,
  },
  searchInput: {
    flex: 1,
    minHeight: 49,
    color: theme.colors.text,
    fontSize: 14,
  },
  clearSearch: {
    color: theme.colors.textSecondary,
    fontSize: 23,
    paddingHorizontal: 5,
  },
  filterSection: {
    marginBottom: 22,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  resetText: {
    color: theme.colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  taskWrapper: {
    marginBottom: 12,
  },
  taskCard: {
    position: "relative",
    backgroundColor: theme.colors.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 15,
  },
  taskMain: {
    paddingBottom: 2,
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  taskAccent: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginRight: 10,
  },
  taskTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
    marginLeft: 13,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  taskDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginTop: 15,
    marginBottom: 8,
  },
  statusAction: {
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusActionText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  actionArrow: {
    color: theme.colors.textSecondary,
    fontSize: 19,
    marginLeft: 5,
  },
  taskActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    minHeight: 39,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  deleteButton: {
    flex: 1,
    minHeight: 39,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  busyOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 25,
    marginTop: 3,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  emptyIconText: {
    color: theme.colors.primary,
    fontSize: 25,
    fontWeight: "600",
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  emptyButton: {
    marginTop: 17,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "800",
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
  deleteIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  deleteIconText: {
    color: theme.colors.danger,
    fontSize: 21,
    fontWeight: "900",
  },
  confirmationTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  confirmationText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
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
