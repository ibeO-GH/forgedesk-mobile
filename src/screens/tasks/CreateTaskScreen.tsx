import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import TaskFormScreen from "./TaskFormScreen";

type Props = NativeStackScreenProps<RootStackParamList, "CreateTask">;

export default function CreateTaskScreen({ navigation }: Props) {
  return <TaskFormScreen navigation={navigation} mode="create" />;
}
