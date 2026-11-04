import { api } from "./client";
import type { Complaint, ComplaintStatus } from "../types";

export interface AdminFilters {
  category?: string;
  severity?: string;
  status?: string;
  search?: string;
  sort?: string;
  direction?: "asc" | "desc";
  page?: number;
  size?: number;
}

// Matches Spring Data's Page<T> shape (the fields we use).
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page index
  size: number;
}

export interface Count {
  key: string;
  label: string;
  value: number;
}

export interface Analytics {
  total: number;
  pending: number;
  resolved: number;
  inProgress: number;
  byStatus: Count[];
  byCategory: Count[];
  bySeverity: Count[];
}

export async function fetchAdminComplaints(filters: AdminFilters): Promise<Page<Complaint>> {
  const params: Record<string, string | number> = {
    page: filters.page ?? 0,
    size: filters.size ?? 20,
  };
  if (filters.category) params.category = filters.category;
  if (filters.severity) params.severity = filters.severity;
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.sort) params.sort = filters.sort;
  if (filters.direction) params.direction = filters.direction;

  const { data } = await api.get<Page<Complaint>>("/admin/complaints", { params });
  return data;
}

export async function updateComplaintStatus(
  id: number,
  body: { status: ComplaintStatus; assignedTo?: string; remarks?: string }
): Promise<Complaint> {
  const { data } = await api.patch<Complaint>(`/admin/complaints/${id}/status`, body);
  return data;
}

export async function fetchMapData(): Promise<Complaint[]> {
  const { data } = await api.get<Complaint[]>("/admin/complaints/map");
  return data;
}

/**
 * Re-runs AI detection on an existing complaint's stored image and returns the
 * updated complaint (category/severity/priority may change).
 */
export async function reanalyzeComplaint(id: number): Promise<Complaint> {
  const { data } = await api.post<Complaint>(`/admin/complaints/${id}/reanalyze`);
  return data;
}

export async function fetchAnalytics(): Promise<Analytics> {
  const { data } = await api.get<Analytics>("/admin/complaints/analytics");
  return data;
}
