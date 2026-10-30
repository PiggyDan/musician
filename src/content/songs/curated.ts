import type { GenreId, Localized } from "@/lib/catalog/types";

export interface CuratedSong {
  slug: string;
  title: Localized;
  artist: Localized;
  year: string;
  genres: GenreId[];
  /**
   * Official YouTube upload, played only through YouTube's embed player.
   * `channel` is the uploader confirmed via YouTube's oEmbed endpoint — only
   * artist / label channels are accepted (fan uploads were rejected).
   */
  youtube?: { id: string; channel: string };
  /**
   * Official Spotify track (audio only), played through Spotify's embed player:
   * full track for signed-in Spotify listeners, a 30-second preview otherwise.
   * Verified from the track page's title and artist metadata.
   */
  spotify?: { id: string; artist: string };
}

export const SPOTIFY_VERIFIED_LABEL = "Track verified on Spotify, 2026-10-30";

export const VERIFIED_LABEL = "Official channel verified via YouTube oEmbed, 2026-10-30";

/**
 * Well-known contemporary songs, listed as factual metadata only so learners
 * can discover them. The compositions, lyrics, arrangements and recordings are
 * copyrighted by their owners: MusicPath does not stream, display, arrange or
 * offer them for download. Each entry links out to the official platforms'
 * search, and where the rights holder publishes an official video, it plays
 * through YouTube's own embed player (the rights holder controls embedding).
 */
export const CURATED_METADATA: readonly CuratedSong[] = [
  { slug: "way-maker", title: { en: "Way Maker", mn: "Way Maker" }, artist: { en: "Sinach", mn: "Sinach" }, year: "2015", genres: ["worship", "gospel"] },
  { slug: "goodness-of-god", title: { en: "Goodness of God", mn: "Goodness of God" }, artist: { en: "Bethel Music & Jenn Johnson", mn: "Bethel Music & Jenn Johnson" }, year: "2019", genres: ["worship"], youtube: { id: "n0FBb6hnwTo", channel: "Bethel Music" } },
  { slug: "10000-reasons", title: { en: "10,000 Reasons (Bless the Lord)", mn: "10,000 Reasons (Bless the Lord)" }, artist: { en: "Matt Redman", mn: "Matt Redman" }, year: "2011", genres: ["worship"] },
  { slug: "what-a-beautiful-name", title: { en: "What a Beautiful Name", mn: "What a Beautiful Name" }, artist: { en: "Hillsong Worship", mn: "Hillsong Worship" }, year: "2016", genres: ["worship"], youtube: { id: "nQWFzMvCfLE", channel: "Hillsong Worship" } },
  { slug: "oceans", title: { en: "Oceans (Where Feet May Fail)", mn: "Oceans (Where Feet May Fail)" }, artist: { en: "Hillsong United", mn: "Hillsong United" }, year: "2013", genres: ["worship"], youtube: { id: "dy9nwe9_xzw", channel: "Hillsong UNITED" } },
  { slug: "oh-happy-day", title: { en: "Oh Happy Day", mn: "Oh Happy Day" }, artist: { en: "The Edwin Hawkins Singers", mn: "The Edwin Hawkins Singers" }, year: "1968", genres: ["gospel"] },
  { slug: "total-praise", title: { en: "Total Praise", mn: "Total Praise" }, artist: { en: "Richard Smallwood", mn: "Richard Smallwood" }, year: "1996", genres: ["gospel"] },
  { slug: "shape-of-you", title: { en: "Shape of You", mn: "Shape of You" }, artist: { en: "Ed Sheeran", mn: "Ed Sheeran" }, year: "2017", genres: ["pop"], youtube: { id: "JGwWNGJdvx8", channel: "Ed Sheeran" } , spotify: { id: "7qiZfU4dY1lWllzX7mPBI3", artist: "Ed Sheeran" } },
  { slug: "blinding-lights", title: { en: "Blinding Lights", mn: "Blinding Lights" }, artist: { en: "The Weeknd", mn: "The Weeknd" }, year: "2019", genres: ["pop"], youtube: { id: "4NRXx6U8ABQ", channel: "TheWeekndVEVO" } , spotify: { id: "0VjIjW4GlUZAMYd2vXMi3b", artist: "The Weeknd" } },
  { slug: "bohemian-rhapsody", title: { en: "Bohemian Rhapsody", mn: "Bohemian Rhapsody" }, artist: { en: "Queen", mn: "Queen" }, year: "1975", genres: ["rock"], youtube: { id: "fJ9rUzIMcZQ", channel: "Queen Official" } , spotify: { id: "4u7EnebtmKWzUH433cf5Qv", artist: "Queen" } },
  { slug: "smells-like-teen-spirit", title: { en: "Smells Like Teen Spirit", mn: "Smells Like Teen Spirit" }, artist: { en: "Nirvana", mn: "Nirvana" }, year: "1991", genres: ["rock"], youtube: { id: "hTWKbfoikeg", channel: "NirvanaVEVO" } , spotify: { id: "5ghIJDpPoe3CfHMGu71E6T", artist: "Nirvana" } },
  { slug: "dynamite", title: { en: "Dynamite", mn: "Dynamite" }, artist: { en: "BTS", mn: "BTS" }, year: "2020", genres: ["kpop", "pop"], youtube: { id: "gdZLi9oWNZg", channel: "HYBE LABELS" } , spotify: { id: "4saklk6nie3yiGePpBwUoc", artist: "BTS" } },
  { slug: "how-you-like-that", title: { en: "How You Like That", mn: "How You Like That" }, artist: { en: "BLACKPINK", mn: "BLACKPINK" }, year: "2020", genres: ["kpop"], youtube: { id: "ioNng23DkIM", channel: "BLACKPINK" } , spotify: { id: "4SFknyjLcyTLJFPKD2m96o", artist: "BLACKPINK" } },
  { slug: "wolf-totem", title: { en: "Wolf Totem", mn: "Чонон сүлд" }, artist: { en: "The HU", mn: "The HU" }, year: "2019", genres: ["mongolian", "rock"], youtube: { id: "jM8dCGIm6yc", channel: "The HU" } },
  { slug: "yuve-yuve-yu", title: { en: "Yuve Yuve Yu", mn: "Юу вэ юу вэ юу" }, artist: { en: "The HU", mn: "The HU" }, year: "2018", genres: ["mongolian", "rock"], youtube: { id: "v4xZUr0BEfE", channel: "The HU" } },
];
