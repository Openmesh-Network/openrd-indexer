export enum TaskRole {
  Creator,
  Manager,
  Applicant,
  Executor,
  DisputeManager,
}

export interface User {
  tasks: {
    [chainId: number]: {
      [taskId: string]: TaskRole[];
    };
  };
  metadata: string;
}
