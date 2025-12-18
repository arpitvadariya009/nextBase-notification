export interface CreateGroupBody {
  name: string;
  description?: string;
  members?: string[];
  createdBy: string;
}

export interface DeleteGroupBody {
  id: string;
  userId: string;
}

export interface GetGroupsQuery {
  userId: string;
}
