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
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createTask } from "../../api/tasks";
import type { TaskPriority } from "../../types/task";
import type { RootStackParamList } from "../../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "CreateTask">;

const priorities: TaskPriority[] = ["low", "medium", "high"];

export default function CreateTaskScreen({ navigation }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleTitleChange(value: string) {
    setTitle(value);

    if (error) {
      setError("");
    }
  }

  async function handleCreateTask() {
    if (isSubmitting) {
      return;
    }

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Please enter a task title.");
      return;
    }

    Keyboard.dismiss();
    setError("");
    setIsSubmitting(true);

    try {
      await createTask(trimmedTitle, priority);
      navigation.goBack();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the task. Please try again.",
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={keyboardBehavior}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>FORGEDESK</Text>
            <Text style={styles.title}>Create task</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Task title</Text>

          <TextInput
            value={title}
            onChangeText={handleTitleChange}
            placeholder="What needs to be done?"
            placeholderTextColor="#94a3b8"
            style={[styles.input, error && styles.inputError]}
            maxLength={120}
            editable={!isSubmitting}
            autoFocus
            autoCapitalize="sentences"
            autoCorrect
            returnKeyType="done"
            onSubmitEditing={() => {
              void handleCreateTask();
            }}
            accessibilityLabel="Task title"
            accessibilityHint="Enter the title of the task"
          />

          <Text
            style={[
              styles.characterCount,
              title.length >= 110 && styles.characterCountWarning,
            ]}
          >
            {title.length}/120
          </Text>

          <Text style={[styles.label, styles.priorityLabel]}>Priority</Text>

          <View style={styles.priorityRow}>
            {priorities.map((item) => {
              const selected = priority === item;

              return (
                <Pressable
                  key={item}
                  style={({ pressed }) => [
                    styles.priorityButton,
                    selected && styles.priorityButtonSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    setPriority(item);

                    if (error) {
                      setError("");
                    }
                  }}
                  disabled={isSubmitting}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: selected,
                    disabled: isSubmitting,
                  }}
                  accessibilityLabel={`${item} priority`}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      selected && styles.priorityTextSelected,
                    ]}
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
              pressed && !isSubmitting && styles.submitButtonPressed,
            ]}
            onPress={() => {
              void handleCreateTask();
            }}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Create task"
            accessibilityState={{ disabled: isSubmitting }}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                  style={styles.buttonSpinner}
                />
                <Text style={styles.submitText}>Creating...</Text>
              </>
            ) : (
              <Text style={styles.submitText}>Create task</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  backText: {
    fontSize: 30,
    lineHeight: 30,
    color: "#334155",
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: 1,
    marginBottom: 3,
  },
  title: {
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
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  inputError: {
    borderColor: "#dc2626",
  },
  characterCount: {
    textAlign: "right",
    marginTop: 6,
    fontSize: 12,
    color: "#94a3b8",
  },
  characterCountWarning: {
    color: "#b45309",
  },
  priorityLabel: {
    marginTop: 24,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  priorityButtonSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },
  priorityText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  priorityTextSelected: {
    color: "#1d4ed8",
  },
  errorContainer: {
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonSpinner: {
    marginRight: 8,
  },
  pressed: {
    opacity: 0.75,
  },
});
