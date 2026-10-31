export const TASK_STATES = [
  "DRAFT", "OPEN", "ASSIGNED", "SUBMITTED", "REVISION_REQUESTED",
  "APPROVED", "COMPLETED", "DISPUTED", "CANCELLED", "REFUNDED", "EXPIRED"
] as const;

export type TaskState = typeof TASK_STATES[number];
export type Actor = "CLIENT" | "WORKER" | "SYSTEM";

const transitions: Partial<Record<TaskState, Partial<Record<Actor, TaskState[]>>>> = {
  DRAFT: { CLIENT: ["OPEN", "CANCELLED"] },
  OPEN: { CLIENT: ["CANCELLED"], WORKER: ["ASSIGNED"] },
  ASSIGNED: { WORKER: ["SUBMITTED"], CLIENT: ["CANCELLED"] },
  SUBMITTED: { CLIENT: ["APPROVED", "REVISION_REQUESTED", "DISPUTED"] },
  REVISION_REQUESTED: { WORKER: ["SUBMITTED"], CLIENT: ["DISPUTED", "CANCELLED"] },
  APPROVED: { SYSTEM: ["COMPLETED"] },
  DISPUTED: { SYSTEM: ["COMPLETED", "REFUNDED"] }
};

export function transitionTask(state: TaskState, actor: Actor, next: TaskState): TaskState {
  if (!transitions[state]?.[actor]?.includes(next)) {
    throw new Error(`Invalid task transition: ${actor} cannot move ${state} to ${next}`);
  }
  return next;
}
