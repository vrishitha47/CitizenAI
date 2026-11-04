import { api } from "./client";
import type { Page } from "./admin";
import type { Role, UserSummary } from "../types";

export interface UserFilters {
  search?: string;
  role?: Role | "";
  page?: number;
  size?: number;
}

export async function fetchUsers(filters: UserFilters): Promise<Page<UserSummary>> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 0,
    size: filters.size ?? 20,
  };
  if (filters.search) params.search = filters.search;
  if (filters.role) params.role = filters.role;
  const { data } = await api.get<Page<UserSummary>>("/admin/users", { params });
  return data;
}

export async function createUser(body: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<UserSummary> {
  const { data } = await api.post<UserSummary>("/admin/users", body);
  return data;
}

export async function updateUserRole(id: number, role: Role): Promise<UserSummary> {
  const { data } = await api.patch<UserSummary>(`/admin/users/${id}/role`, { role });
  return data;
}
