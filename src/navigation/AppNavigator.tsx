import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import DashboardScreen from "../screens/tasks/DashboardScreen";
import CreateTaskScreen from "../screens/tasks/CreateTaskScreen";
import EditTaskScreen from "../screens/tasks/EditTaskScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  CreateTask: undefined;
  EditTask: {
    taskId: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#f8fafc",
          },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
            <Stack.Screen name="EditTask" component={EditTaskScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
