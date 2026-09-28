import type { Task } from "../types/task";
import { apiRequest } from "./client";

interface ApiTask {
  _id: string;
  title: string;
  status: Task["status"];
  priority: Task["priority"];
}

function mapTask(task: ApiTask): Task {
  return {
    id: task._id,
    title: task.title,
    status: task.status,
    priority: task.priority,
  };
}

export async function getTasks(): Promise<Task[]> {
  const tasks = await apiRequest<ApiTask[]>("/tasks");

  return tasks.map(mapTask);
}

export async function createTask(
  title: string,
  priority: Task["priority"],
): Promise<Task> {
  const task = await apiRequest<ApiTask>("/tasks", {
    method: "POST",
    body: JSON.stringify({
      title,
      priority,
    }),
  });

  return mapTask(task);
}

export async function updateTaskStatus(
  taskId: string,
  status: Task["status"],
): Promise<Task> {
  const task = await apiRequest<ApiTask>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
    }),
  });

  return mapTask(task);
}

export async function updateTask(
  taskId: string,
  updates: {
    title: string;
    priority: Task["priority"];
  },
): Promise<Task> {
  const task = await apiRequest<ApiTask>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  return mapTask(task);
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiRequest<void>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}
