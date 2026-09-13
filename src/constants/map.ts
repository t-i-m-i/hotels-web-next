import { Bounds } from "@/utils/geo";

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 18;
export const DEFAULT_MARKER_COLOR = "#208AEF";
export const SELECTED_MARKER_COLOR = "#E0432B";

// Fallback view for /map before the map reports real bounds (roughly western
// + central Europe, where all seed hotels are).
export const DEFAULT_MAP_BOUNDS: Bounds = [-10, 35, 20, 55];
