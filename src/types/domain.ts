export type GraphRole = "owner" | "admin" | "member";

export type RelationshipType =
  | "parent"
  | "partner"
  | "spouse"
  | "sibling";

export interface FamilyGraph {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface GraphMember {
  graph_id: string;
  user_id: string;
  role: GraphRole;
  joined_at: string;
}

export interface Person {
  id: string;
  graph_id: string;
  created_by: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  death_date: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  graph_id: string;
  from_person_id: string;
  to_person_id: string;
  type: RelationshipType;
  created_by: string;
  created_at: string;
}
