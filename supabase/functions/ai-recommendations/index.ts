const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log("AI Function: Request received", req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
    if (!GEMINI_API_KEY) {
      console.error("AI Function: GEMINI_API_KEY is missing")
      return new Response(JSON.stringify({ 
        error: "GEMINI_API_KEY is not set in Supabase Secrets. Please add it in the Supabase Dashboard." 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const { action, data } = await req.json()
    console.log("AI Function: Action:", action)

    const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    const apiUrl = `${baseUrl}?key=${GEMINI_API_KEY}`

    let prompt = "";
    if (action === 'recommendations') {
      const { userLikes, availableSongs } = data
      const limitedSongs = (availableSongs || [])
        .slice(0, 50)
        .map((s: any) => ({
          id: s.id,
          title: s.title,
          genre: s.genre,
          artist_name: s.artist_name || s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
          language: s.language,
          bpm: s.bpm
        }));

      prompt = `User likes these songs: ${userLikes.join(", ")}. 
      Available songs (Metadata): ${JSON.stringify(limitedSongs)}.
      Recommend up to 5 songs that the user might like from the available list.
      Return ONLY a JSON array of the song IDs like ["id1", "id2"].`
    } else if (action === 'radio') {
      const { currentSong, otherSongs } = data
      const strippedCurrentSong = {
        id: currentSong.id,
        title: currentSong.title,
        genre: currentSong.genre,
        artist_name: currentSong.artist_name || currentSong.profiles?.stage_name || currentSong.profiles?.full_name || 'Artist',
        language: currentSong.language,
        bpm: currentSong.bpm
      };

      const limitedOtherSongs = (otherSongs || [])
        .slice(0, 50)
        .map((s: any) => ({
          id: s.id,
          title: s.title,
          genre: s.genre,
          artist_name: s.artist_name || s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
          language: s.language,
          bpm: s.bpm
        }));

      prompt = `The user just finished listening to: "${strippedCurrentSong.title}" by "${strippedCurrentSong.artist_name}" (Genre: ${strippedCurrentSong.genre}).
      Available songs for next play: ${JSON.stringify(limitedOtherSongs)}.
      Pick the best ONE song that matches the vibe for an "endless radio" experience.
      Return ONLY the JSON mapping with the song ID like: {"id": "song_id_here"}`
    }

    console.log("AI Function: Calling Gemini API...")
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    })

    const resultData = await response.json()
    
    if (!response.ok) {
      console.error("Gemini API Error:", resultData)
      throw new Error(resultData.error?.message || "AI Generation failed")
    }

    const text = resultData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    console.log("AI Function: Raw AI response:", text)
    const result = JSON.parse(text.trim())

    console.log("AI Function: Success")
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("AI Function Error:", error)
    
    let message = error.message;
    let status = 400;

    if (message.includes("403") || message.includes("permission")) {
      message = "Gemini API Permission Denied. Please ensure your API key is valid and has 'Generative Language API' enabled.";
      status = 403;
    } else if (message.includes("429") || message.includes("quota")) {
      message = "Gemini API Quota Exceeded. Please try again later.";
      status = 429;
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    })
  }
})
