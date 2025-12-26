export { useAuth } from './useAuth';
export { useToast, type Toast } from './useToast';
export { useDebounce } from './useDebounce';
export { useReducedMotion } from './useReducedMotion';
export { useCatalogSearch, useCategories } from './useCatalogSearch';
export { usePlaylists, usePlaylist } from './usePlaylists';
export {
  useCreatePlaylist,
  useUpdatePlaylist,
  useDeletePlaylist,
  useAddToPlaylist,
} from './usePlaylistMutations';

// Phase 4: Discovery and forking
export { useSharedPlaylists } from './useSharedPlaylists';
export { usePublicPlaylists } from './usePublicPlaylists';
export { useForkPlaylist } from './useForkPlaylist';

// Phase 5: Queue application
export { useApplyQueue } from './useApplyQueue';

// Phase 6: Real-time, likes, responsive, keyboard
export { useLikes } from './useLikes';
export { useLikedItems } from './useLikedItems';
export { useBreakpoint, useIsMobile, useIsTablet, useIsDesktop } from './useBreakpoint';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
