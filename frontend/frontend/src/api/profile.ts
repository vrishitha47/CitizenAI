import { api } from "./client";
import type { Role } from "../types";

export interface Profile {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  complaintCount: number;
}

export async function fetchProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>("/profile");
  return data;
}

export async function updateProfile(name: string): Promise<Profile> {
  const { data } = await api.put<Profile>("/profile", { name });
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/profile/password", { currentPassword, newPassword });
}
