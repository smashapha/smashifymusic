import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "../lib/supabase";
import { Song } from "../types";

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    aiClient = new GoogleGenAI({ apiKey: key || 'missing_key' });
  }
  return aiClient;
}

export async function getAiRecommendations(userLikes: string[], availableSongs: Song[]): Promise<Song[]> {
  if (availableSongs.length === 0) return [];

  // If user has no likes, just recommend some diverse songs
  if (userLikes.length === 0) {
    return availableSongs.sort(() => 0.5 - Math.random()).slice(0, 5);
  }

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User likes these songs: ${userLikes.join(", ")}. 
      Available songs for recommendation (Metadata): ${JSON.stringify(availableSongs.map(s => ({ id: s.id, title: s.title, genre: s.genre, artist: s.artist_name })))}.
      Recommend up to 5 songs that the user might like from the available list.
      Return ONLY a JSON array of the song IDs.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const recommendedIds = JSON.parse(response.text || "[]") as string[];
    return availableSongs.filter(s => recommendedIds.includes(s.id));
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    // Fallback: random songs
    return availableSongs.sort(() => 0.5 - Math.random()).slice(0, 5);
  }
}

export async function getRadioNextSong(currentSong: Song, availableSongs: Song[]): Promise<Song | null> {
  const otherSongs = availableSongs.filter(s => s.id !== currentSong.id);
  if (otherSongs.length === 0) return null;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user just finished listening to: "${currentSong.title}" by "${currentSong.artist_name}" (Genre: ${currentSong.genre}).
      Available songs for next play: ${JSON.stringify(otherSongs.map(s => ({ id: s.id, title: s.title, genre: s.genre, artist: s.artist_name })))}.
      Pick the best ONE song that matches the vibe for an "endless radio" experience.
      Return ONLY the JSON mapping with the song ID.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING }
          },
          required: ["id"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    const nextSong = otherSongs.find(s => s.id === result.id);
    return nextSong || otherSongs[0];
  } catch (error) {
    console.error("Radio Error:", error);
    return otherSongs[0];
  }
}
