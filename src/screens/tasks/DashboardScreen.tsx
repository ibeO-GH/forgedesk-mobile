import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function DashboardScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>FORGEDESK</Text>
          <Text style={styles.title}>Your Tasks</Text>
        </View>

        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>Welcome, {user?.name}</Text>

        <Text style={styles.welcomeText}>
          Your mobile task dashboard is ready. Task management will be connected
          in the next milestone.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  logoutText: {
    color: "#334155",
    fontWeight: "600",
  },
  welcomeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748b",
  },
});
