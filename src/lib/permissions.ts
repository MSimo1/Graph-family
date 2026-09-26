import type { GraphRole } from "@/types/domain";

export function canEditOwnedResource(
  role: GraphRole,
  currentUserId: string,
  createdBy: string
) {
  return role === "owner" || role === "admin" || currentUserId === createdBy;
}

export function canManageMembers(role: GraphRole) {
  return role === "owner" || role === "admin";
}

export function canManageAdmins(role: GraphRole) {
  return role === "owner";
}

export function canDeleteGraph(role: GraphRole) {
  return role === "owner";
}
