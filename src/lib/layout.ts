// Shared layout conventions — use these instead of ad-hoc values so every
// page's spacing and grid rhythm matches.

export const PAGE_CONTAINER = "max-w-7xl mx-auto px-4 md:px-8";
export const PAGE_BOTTOM_PADDING = "pb-12"; // vertical gap between page content and the footer

export const SECTION_SPACING = "mb-12"; // vertical gap between major page sections — use everywhere, not mb-10 in some places and mb-12 in others

// Grid presets by content type — pick the one matching what's being rendered,
// don't invent a new column combination per section.
export const GRID_SONG_CARDS = "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4";       // compact square cards: songs, singles
export const GRID_ARTIST_CARDS = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";     // slightly larger cards: artists, albums
export const GRID_LIST_CARDS = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3";       // wide list-style cards: playlists, rows with more text
