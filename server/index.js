const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const supabase = require("./supabaseClient");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://192.168.1.38:3000",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get("/", (req, res) => res.send("Server is running with Supabase..."));

// Helper to format a Supabase story row → client shape
const formatStoryRow = (d) => ({
  id: d.id,
  author: d.author,
  authorAvatar: d.author_avatar,
  mediaUrl: d.media_url,
  audioUrl: d.audio_url || null,
  caption: d.caption,
  views: d.views || [],
  likes: d.likes || [],
  time: d.time || "Recently",
  createdAt: d.created_at,
});

// Helper to filter out stories older than 24 hours (86,400,000 ms)
const filterValid24hStories = (storyList) => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return storyList.filter((s) => {
    const storyTime = new Date(s.createdAt || s.created_at || Date.now()).getTime();
    return storyTime > cutoff;
  });
};

// --- REST API ENDPOINTS ---

// 1. Fetch all rooms
app.get("/api/rooms", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Error fetching rooms:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. Create or customize new group / room
app.post("/api/rooms", async (req, res) => {
  try {
    const { id, name, is_group, avatar_url } = req.body;
    const roomId = id || name;

    const { data, error } = await supabase
      .from("rooms")
      .upsert(
        [
          {
            id: roomId,
            name,
            is_group: is_group !== undefined ? is_group : true,
            avatar_url:
              avatar_url ||
              "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
          },
        ],
        { onConflict: "id" }
      )
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error("Error creating room:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 3. Fetch all users / contacts
app.get("/api/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("last_seen", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 4. Update User Profile Photo / Info
app.put("/api/users/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { avatar_url } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({ avatar_url })
      .eq("username", username)
      .select();

    if (error) throw error;
    io.emit("user_profile_updated", { username, avatar_url });
    res.json(data[0] || { username, avatar_url });
  } catch (err) {
    console.error("Error updating user profile:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5. Fetch messages for a specific room with pagination (default: latest 30 messages)
app.get("/api/messages/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 30);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    // Fetch batch ordered by created_at DESC to get latest messages first
    const { data, count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact" })
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Reverse the slice so it's chronologically oldest -> newest for the chat feed
    const messages = (data || []).reverse();
    const total = count || 0;
    const hasMore = total > offset + (data || []).length;

    res.json({
      messages,
      hasMore,
      total,
      offset,
      limit,
    });
  } catch (err) {
    console.error("Error fetching messages:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 6. Stories / Status Endpoints with Automatic 24-Hour Expiration

// GET /api/stories — always read from Supabase; return filtered 24h list
app.get("/api/stories", async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .gte("created_at", cutoff)           // DB-side 24h filter (fast)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase GET stories error:", error.message);
      // Return empty rather than stale in-memory data
      return res.json([]);
    }

    return res.json((data || []).map(formatStoryRow));
  } catch (err) {
    console.error("GET /api/stories crash:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stories — insert into Supabase first; fail loudly if it doesn't save
app.post("/api/stories", async (req, res) => {
  try {
    const { author, authorAvatar, mediaUrl, audioUrl, caption } = req.body;
    if (!author || !mediaUrl) {
      return res.status(400).json({ error: "author and mediaUrl are required" });
    }

    const nowIso = new Date().toISOString();
    const storyId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const insertPayload = {
      id: storyId,
      author,
      author_avatar: authorAvatar || null,
      media_url: mediaUrl,
      audio_url: audioUrl || null,
      caption: caption || "",
      views: [author],      // author auto-viewed their own story
      likes: [],
      time: "Just now",
      created_at: nowIso,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("stories")
      .insert([insertPayload])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase INSERT story error:", insertError.message);
      return res.status(500).json({ error: "Failed to save story: " + insertError.message });
    }

    const newStory = formatStoryRow(inserted);
    io.emit("new_story_published", newStory);
    return res.json(newStory);
  } catch (err) {
    console.error("POST /api/stories crash:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// View Story (tracks who saw the story)
app.post("/api/stories/:id/view", async (req, res) => {
  const { id } = req.params;
  const { viewer } = req.body;

  try {
    // Read current views from Supabase (source of truth)
    const { data, error } = await supabase
      .from("stories")
      .select("views")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase view fetch error:", error.message);
      return res.json({ success: false, views: [] });
    }

    let currentViews = data.views || [];
    if (viewer && !currentViews.includes(viewer)) {
      currentViews = [...currentViews, viewer];
      await supabase.from("stories").update({ views: currentViews }).eq("id", id);
    }

    io.emit("story_viewed", { storyId: id, viewer, views: currentViews });
    return res.json({ success: true, views: currentViews });
  } catch (err) {
    console.error("POST /api/stories/:id/view crash:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Like / React Story (tracks who liked the story)
app.post("/api/stories/:id/like", async (req, res) => {
  const { id } = req.params;
  const { liker } = req.body;

  try {
    // Read current likes from Supabase (source of truth)
    const { data, error } = await supabase
      .from("stories")
      .select("likes")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase like fetch error:", error.message);
      return res.json({ success: false, likes: [], liked: false });
    }

    let currentLikes = data.likes || [];
    let liked = false;
    if (liker) {
      if (currentLikes.includes(liker)) {
        currentLikes = currentLikes.filter((u) => u !== liker);
        liked = false;
      } else {
        currentLikes = [...currentLikes, liker];
        liked = true;
      }
      await supabase.from("stories").update({ likes: currentLikes }).eq("id", id);
    }

    io.emit("story_liked", { storyId: id, liker, likes: currentLikes });
    return res.json({ success: true, likes: currentLikes, liked });
  } catch (err) {
    console.error("POST /api/stories/:id/like crash:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 7. Supabase File Upload
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send({ message: "No file uploaded" });

    const cleanFilename = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    const filePath = `uploads/${Date.now()}_${cleanFilename}`;
    const bucketName = "chat-files";

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      return res.status(500).send({ message: uploadError.message });
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return res.status(200).send({
      message: "File uploaded successfully to Supabase Storage",
      fileUrl: publicUrlData.publicUrl,
      fileType: req.file.mimetype,
      fileName: cleanFilename,
    });
  } catch (error) {
    console.error("Supabase file upload failed:", error);
    return res.status(500).send({ message: error.message });
  }
});

// Socket.io Real-time Handling
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});

const socketUserMap = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join_room", async ({ username, room, avatar }) => {
    socket.join(room);
    socketUserMap.set(socket.id, { username, room });
    console.log(`${username} joined room ${room}`);

    try {
      await supabase.from("users").upsert(
        [
          {
            username,
            avatar_url: avatar || null,
            status: "online",
            last_seen: new Date().toISOString(),
          },
        ],
        { onConflict: "username" }
      );
    } catch (e) {
      console.warn("Could not sync user presence:", e.message);
    }

    io.to(room).emit("user_status_change", { username, status: "online", room });
  });

  socket.on("create_room", async (roomData) => {
    try {
      await supabase.from("rooms").upsert(
        [
          {
            id: roomData.id || roomData.name,
            name: roomData.name,
            is_group: roomData.is_group !== undefined ? roomData.is_group : true,
            avatar_url: roomData.avatar_url,
          },
        ],
        { onConflict: "id" }
      );
      io.emit("new_room_created", roomData);
    } catch (e) {
      console.warn("Could not save room:", e.message);
    }
  });

  socket.on("send_message", async (data) => {
    io.to(data.room).emit("receive_message", data);

    try {
      await supabase.from("messages").insert([
        {
          id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          room_id: data.room,
          author: data.author,
          author_avatar: data.authorAvatar || null,
          type: data.type || "text",
          message: data.message || null,
          content: data.content || null,
          name: data.name || null,
          file_size: data.fileSize || null,
          duration: data.duration || null,
          time: data.time || new Date().toLocaleTimeString(),
        },
      ]);
    } catch (e) {
      console.warn("Could not persist message:", e.message);
    }
  });

  // Call Signaling
  socket.on("initiate_call", ({ room, callerName, callerAvatar, callType }) => {
    console.log(`Call initiated in room ${room} by ${callerName} (${callType})`);
    socket.to(room).emit("incoming_call", {
      room,
      callerName,
      callerAvatar,
      callType,
      callId: `call_${Date.now()}`,
    });
  });

  socket.on("accept_call", ({ room, userName }) => {
    console.log(`${userName} accepted call in ${room}`);
    io.to(room).emit("call_accepted", { room, userName });
  });

  socket.on("end_call", ({ room, userName }) => {
    console.log(`Call ended in ${room} by ${userName}`);
    io.to(room).emit("call_ended", { room, userName });
  });

  // WebRTC Signaling Relay
  socket.on("webrtc_offer", ({ room, offer, fromUser }) => {
    socket.to(room).emit("webrtc_offer", { offer, fromUser });
  });
  socket.on("webrtc_answer", ({ room, answer, fromUser }) => {
    socket.to(room).emit("webrtc_answer", { answer, fromUser });
  });
  socket.on("webrtc_ice_candidate", ({ room, candidate }) => {
    socket.to(room).emit("webrtc_ice_candidate", { candidate });
  });

  socket.on("disconnect", async () => {
    const userInfo = socketUserMap.get(socket.id);
    if (userInfo && userInfo.username) {
      try {
        await supabase
          .from("users")
          .update({
            status: "offline",
            last_seen: new Date().toISOString(),
          })
          .eq("username", userInfo.username);
      } catch (e) {
        console.warn("Could not update offline status:", e.message);
      }
      io.emit("user_status_change", {
        username: userInfo.username,
        status: "offline",
      });
      socketUserMap.delete(socket.id);
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
