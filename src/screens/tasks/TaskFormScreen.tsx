import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createTask, getTasks, updateTask } from "../../api/tasks";
import type { TaskPriority } from "../../types/task";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: {
    goBack: () => void;
  };
  mode: "create" | "edit";
  taskId?: string;
}

const priorities: TaskPriority[] = ["low", "medium", "high"];

const priorityDescriptions: Record<TaskPriority, string> = {
  low: "Can wait",
  medium: "Normal urgency",
  high: "Needs attention",
};

export default function TaskFormScreen({ navigation, mode, taskId }: Props) {
  const isEditing = mode === "edit";

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadTask = useCallback(async () => {
    if (!isEditing || !taskId) return;

    setIsLoading(true);
    setError("");

    try {
      const tasks = await getTasks();
      const task = tasks.find((item) => item.id === taskId);

      if (!task) {
        setError("This task could not be found.");
        return;
      }

      setTitle(task.title);
      setPriority(task.priority);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load this task.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isEditing, taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  async function handleSubmit() {
    if (isSubmitting) return;

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Please enter a task title.");
      return;
    }

    if (isEditing && !taskId) {
      setError("The task identifier is missing.");
      return;
    }

    Keyboard.dismiss();
    setError("");
    setIsSubmitting(true);

    try {
      if (isEditing && taskId) {
        await updateTask(taskId, {
          title: trimmedTitle,
          priority,
        });
      } else {
        await createTask(trimmedTitle, priority);
      }

      navigation.goBack();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to ${isEditing ? "update" : "create"} the task.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const keyboardBehavior =
    Platform.OS === "ios"
      ? "padding"
      : Platform.OS === "android"
        ? "height"
        : undefined;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading task...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={keyboardBehavior}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>FORGEDESK / TASKS</Text>
            <Text style={styles.title}>
              {isEditing ? "Edit task" : "Create task"}
            </Text>
            <Text style={styles.subtitle}>
              {isEditing
                ? "Make changes to your task."
                : "Add something important to your workload."}
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Task information</Text>
            <Text style={styles.sectionHint}>Required fields</Text>
          </View>

          <Text style={styles.label}>Task title</Text>

          <TextInput
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              if (error) setError("");
            }}
            placeholder="What needs to be done?"
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, error && styles.inputError]}
            maxLength={120}
            editable={!isSubmitting}
            autoFocus={!isEditing}
            autoCapitalize="sentences"
            autoCorrect
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit()}
          />

          <Text style={styles.characterCount}>
            {title.length}/120 characters
          </Text>

          <View style={styles.priorityHeading}>
            <Text style={styles.label}>Priority level</Text>
            <Text style={styles.sectionHint}>Choose one</Text>
          </View>

          <View style={styles.priorityList}>
            {priorities.map((item) => {
              const selected = priority === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setPriority(item)}
                  disabled={isSubmitting}
                  style={[
                    styles.priorityOption,
                    selected && styles.priorityOptionSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View
                    style={[
                      styles.priorityDot,
                      item === "low" && styles.lowDot,
                      item === "medium" && styles.mediumDot,
                      item === "high" && styles.highDot,
                    ]}
                  />

                  <View style={styles.priorityCopy}>
                    <Text
                      style={[
                        styles.priorityName,
                        selected && styles.priorityNameSelected,
                      ]}
                    >
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </Text>
                    <Text style={styles.priorityDescription}>
                      {priorityDescriptions[item]}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioOuter,
                      selected && styles.radioOuterSelected,
                    ]}
                  >
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => void handleSubmit()}
            disabled={isSubmitting}
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                {isEditing ? "Save changes" : "Create task"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 30,
    paddingBottom: 40,
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
  },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 26,
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
    marginRight: 14,
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
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: theme.colors.primary,
    marginBottom: 5,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.text,
  },
  sectionHint: {
    fontSize: 11,
    color: theme.colors.muted,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 9,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 13,
    paddingHorizontal: 15,
    color: theme.colors.text,
    fontSize: 15,
    backgroundColor: "#FBFCFE",
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  characterCount: {
    textAlign: "right",
    marginTop: 7,
    fontSize: 11,
    color: theme.colors.muted,
  },
  priorityHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 10,
  },
  priorityList: {
    gap: 9,
  },
  priorityOption: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  priorityOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  lowDot: {
    backgroundColor: "#16A34A",
  },
  mediumDot: {
    backgroundColor: "#D97706",
  },
  highDot: {
    backgroundColor: "#DC2626",
  },
  priorityCopy: {
    flex: 1,
  },
  priorityName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  priorityNameSelected: {
    color: theme.colors.primaryDark,
  },
  priorityDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  errorBox: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: 11,
    padding: 12,
    marginTop: 18,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
});
