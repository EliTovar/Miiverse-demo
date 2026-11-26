/*
 * Modelos de la API /miiverse del backend (mismos nombres de campos que devuelve).
 */

export interface MiiversePost {
  id: number;
  user_id: number | null;
  username: string;
  mii_avatar_url: string;
  content_text: string | null;
  drawing_url: string | null;
  screenshot_url: string | null;
  game_title: string | null;
  yeahs: number;
  created_at: string;
  is_seed: boolean;
  is_spoiler: boolean;
  comments_count: number;
}

/** Comentario de un post. */
export interface MiiverseComment {
  id: number;
  post_id: number;
  user_id: number | null;
  username: string;
  mii_avatar_url: string | null;
  content_text: string;
  is_spoiler: boolean;
  created_at: string;
  updated_at: string | null;
  yeahs: number;
  /** Si el usuario con sesión ya le dio Yeah (false para invitados). */
  yeahed: boolean;
}

/** Fila de la vista de moderación: un post o un comentario. */
export interface MiiverseModerationItem {
  kind: 'post' | 'comment';
  id: number;
  /** El propio id si es un post; el del post comentado si es un comentario. */
  post_id: number;
  username: string;
  mii_avatar_url: string | null;
  content_text: string | null;
  drawing_url: string | null;
  screenshot_url: string | null;
  game_title: string | null;
  is_spoiler: boolean;
  created_at: string;
  yeahs: number;
  comments_count: number | null;
  post_text: string | null;
  post_username: string | null;
  /** Resultados de toda la búsqueda (no solo de esta página). */
  total: number;
}

/** Filtros de la vista de moderación. Los vacíos no se envían. */
export interface ModerationFilters {
  type: 'all' | 'post' | 'comment';
  q: string;
  user: string;
  community: string;
  date: string;   // AAAA-MM-DD
  month: string;  // AAAA-MM
  hour: string;   // '' o '0'..'23'
}

/** Orden de las listas de posts en comunidades y perfiles. */
export type PostSort = 'recent' | 'oldest' | 'popular';

/** Comunidad derivada de `game_title` en el backend. */
export interface MiiverseCommunity {
  name: string;
  posts_count: number;
  last_post_at: string;
}

export interface MiiverseCommunityDetail {
  name: string;
  posts_count: number;
  yeahs_count: number;
  posts: MiiversePost[];
}

export interface MiiverseUserProfile {
  username: string;
  avatar_url: string | null;
  posts_count: number;
  yeahs_received: number;
  communities_count: number;
  first_post_at: string;
  posts: MiiversePost[];
}

/** Resultado de la búsqueda de usuarios. */
export interface MiiverseUserSummary {
  username: string;
  avatar_url: string | null;
  posts_count: number;
}
