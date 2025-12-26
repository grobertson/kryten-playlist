export type Visibility = 'private' | 'shared' | 'public';

// Aliased for spec compatibility
export type PlaylistVisibility = Visibility;

export interface PlaylistOwner {
  name: string;
  avatar_url?: string;
}

export interface PlaylistRef {
  playlist_id: string;
  name: string;
  visibility: Visibility;
  owner: string;
  item_count: number;
  total_duration_seconds?: number;
  forked_from_owner: string | null;
  created_at: string;
  updated_at: string;
}

// Extended ref for discovery pages with owner object
export interface PlaylistRefOut extends Omit<PlaylistRef, 'owner'> {
  id: string; // alias for playlist_id
  owner: PlaylistOwner;
  forked_from?: ForkedFrom | null;
}

export interface PlaylistItem {
  video_id: string;
  title: string;
  duration_seconds: number;
}

// Aliased for spec compatibility
export type PlaylistItemOut = PlaylistItem;

export interface ForkedFrom {
  id?: string; // alias used by spec
  playlist_id: string;
  name?: string;
  owner: PlaylistOwner | string;
  forked_at: string;
}

export interface PlaylistDetail {
  playlist_id: string;
  name: string;
  visibility: Visibility;
  owner: string;
  items: PlaylistItem[];
  forked_from: ForkedFrom | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Extended detail for view pages with owner object
export interface PlaylistDetailOut extends Omit<PlaylistDetail, 'owner'> {
  id: string; // alias for playlist_id
  owner: PlaylistOwner;
  item_count: number;
  total_duration_seconds?: number;
  description?: string;
}

export interface PlaylistIndexOut {
  playlists: PlaylistRef[];
  total: number;
}

export interface PlaylistCreateIn {
  name: string;
  visibility?: Visibility;
  items?: { video_id: string }[];
}

export interface PlaylistCreateOut {
  playlist_id: string;
}

export interface PlaylistUpdateIn {
  name?: string;
  visibility?: Visibility;
  items?: { video_id: string }[];
}

export interface PlaylistForkIn {
  name?: string;
}

// Catalog types
export interface CatalogItem {
  video_id: string;
  title: string;
  duration_seconds?: number | null;
  genre?: string | null;
  mood?: string | null;
  era?: string | null;
  year?: number | null;
  synopsis?: string | null;
  thumbnail_url?: string | null;
}

export interface CatalogSearchOut {
  items: CatalogItem[];
  total: number;
  snapshot_id: string;
}

export interface CategoriesOut {
  categories: string[];
}
