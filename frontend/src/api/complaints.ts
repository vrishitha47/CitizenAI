import { api } from "./client";
import type { AiPreview, Category, Complaint } from "../types";

export interface NewComplaintData {
  category?: string | null;
  description?: string;
  latitude: number;
  longitude: number;
  locationAddress?: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories");
  return data;
}

/**
 * Creates a complaint. Sends multipart/form-data with an "image" file part and
 * a "data" part carrying the JSON metadata (as an application/json blob so the
 * backend binds it to a String cleanly).
 */
export async function createComplaint(
  image: File,
  data: NewComplaintData
): Promise<Complaint> {
  const form = new FormData();
  form.append("image", image);
  form.append(
    "data",
    new Blob([JSON.stringify(data)], { type: "application/json" })
  );

  const { data: complaint } = await api.post<Complaint>("/complaints", form);
  return complaint;
}

/**
 * Runs on-demand AI detection on an image WITHOUT creating a complaint.
 * Used by the "Detect issue" button on the report form to pre-fill fields.
 */
export async function analyzeIssuePreview(image: File): Promise<AiPreview> {
  const form = new FormData();
  form.append("image", image);
  const { data } = await api.post<AiPreview>("/complaints/analyze", form);
  return data;
}

export async function fetchMyComplaints(): Promise<Complaint[]> {
  const { data } = await api.get<Complaint[]>("/complaints/mine");
  return data;
}

export async function fetchComplaint(id: number): Promise<Complaint> {
  const { data } = await api.get<Complaint>(`/complaints/${id}`);
  return data;
}
