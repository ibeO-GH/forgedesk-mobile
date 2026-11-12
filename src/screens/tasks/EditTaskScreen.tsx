import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import TaskFormScreen from "./TaskFormScreen";

type Props = NativeStackScreenProps<RootStackParamList, "EditTask">;

export default function EditTaskScreen({ navigation, route }: Props) {
  return (
    <TaskFormScreen
      navigation={navigation}
      mode="edit"
      taskId={route.params.taskId}
    />
  );
}
