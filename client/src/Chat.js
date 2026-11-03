import React, { useState, useEffect, useRef, useMemo } from "react";
import confetti from "canvas-confetti";
import axios from "axios";
import {
  Search,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Play,
  Pause,
  Download,
  Sparkles,
  Gift,
  CheckCheck,
  Mic,
  MessageSquare,
  Users,
  Settings,
  HelpCircle,
  FileText,
  X,
  PhoneOff,
  PhoneCall,
  Wand2,
  Plus,
  Bell,
  Lock,
  Image as ImageIcon,
  Info,
  LogOut,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Eye,
  Heart,
  Camera,
  UploadCloud,
  Edit2,
  ChevronLeft,
  Music,
} from "lucide-react";
import { uploadAndSend } from "./Upload";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:9000";

const DEFAULT_CONVERSATIONS = [
  {
    id: "friends-group",
    room: "Friends Group",
    name: "Friends Group",
    isGroup: true,
    membersCount: 5,
    avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop&q=80",
    lastMsg: "Rohan: See you soon! 😊",
    time: "10:24 AM",
    unread: 3,
    type: "group",
    online: true,
  },
  {
    id: "study-group",
    room: "Study Group",
    name: "Study Group",
    isGroup: true,
    membersCount: 8,
    avatar: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150&auto=format&fit=crop&q=80",
    lastMsg: "Neha: Great idea!",
    time: "Yesterday",
    unread: 5,
    type: "group",
    online: true,
  },
  {
    id: "project-team",
    room: "Project Team",
    name: "Project Team",
    isGroup: true,
    membersCount: 12,
    avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
    lastMsg: "Let's discuss the update...",
    time: "Yesterday",
    unread: 0,
    type: "group",
    online: false,
  },
  {
    id: "tech-enthusiasts",
    room: "Tech Enthusiasts",
    name: "Tech Enthusiasts",
    isGroup: true,
    membersCount: 42,
    avatar: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80",
    lastMsg: "Rohan: New feature is live!",
    time: "Oct 29",
    unread: 0,
    type: "group",
    online: true,
  },
  {
    id: "gaming-squad",
    room: "Gaming Squad",
    name: "Gaming Squad",
    isGroup: true,
    membersCount: 4,
    avatar: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=150&auto=format&fit=crop&q=80",
    lastMsg: "Let's play tonight?",
    time: "Oct 28",
    unread: 0,
    type: "group",
    online: false,
  },
];

const EMOJI_PALETTE = ["😊", "🔥", "🚀", "🎉", "❤️", "👍", "✨", "💯", "👋", "🙌", "😍", "💡", "⚡", "🥳", "😎", "🤩", "🤝", "💜"];

function Chat({ socket, username, currentUserAvatar, setCurrentUserAvatar, onLogout }) {
  const [conversations, setConversations] = useState(DEFAULT_CONVERSATIONS);
  const [activeChat, setActiveChat] = useState(DEFAULT_CONVERSATIONS[0]);
  const [tabFilter, setTabFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMessage, setCurrentMessage] = useState("");
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreMessagesByRoom, setHasMoreMessagesByRoom] = useState({});
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const isPrependingOlderRef = useRef(false);
  const messagesContainerRef = useRef(null);

  // Users & Contacts from Supabase
  const [contactsList, setContactsList] = useState([]);
  const [showContactsModal, setShowContactsModal] = useState(false);

  // Profile Photo Change Modal
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [newAvatarInput, setNewAvatarInput] = useState(currentUserAvatar);

  // Group Profile / Info Drawer Modal
  const [showGroupProfile, setShowGroupProfile] = useState(false);

  // Stories / Status State
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [showStoryAnalytics, setShowStoryAnalytics] = useState(false);
  const [newStoryMedia, setNewStoryMedia] = useState("");
  const [newStoryAudio, setNewStoryAudio] = useState(""); // Background music/song URL
  const [newStoryCaption, setNewStoryCaption] = useState("");
  const [uploadingStoryFile, setUploadingStoryFile] = useState(false);
  const [uploadingStoryAudio, setUploadingStoryAudio] = useState(false);

  // Story playback timeline state
  const [storyProgress, setStoryProgress] = useState(0); // 0 to 100%
  const [storyDuration, setStoryDuration] = useState(3.5); // duration in seconds (3.5s default for photo without song)
  const [storyAudioPlaying, setStoryAudioPlaying] = useState(true);

  const storyVideoRef = useRef(null);
  const storyAudioRef = useRef(null);
  const storyAudioInputRef = useRef(null);

  // Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notificationSound, setNotificationSound] = useState(true);
  const [enterToSend, setEnterToSend] = useState(true);

  // Modal for creating custom groups
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAvatar, setNewGroupAvatar] = useState(
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80"
  );

  // Calling Feature state
  const [activeCall, setActiveCall] = useState(null);
  const [callStatus, setCallStatus] = useState("ringing");
  const [incomingCall, setIncomingCall] = useState(null);

  // Extra features state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const fileInputRef = useRef(null);
  const storyFileInputRef = useRef(null);
  const avatarFileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // WebRTC refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  // Helper to detect and extract YouTube video ID (Supports regular videos, YouTube Shorts, and youtu.be links)
  const getYouTubeVideoId = (url) => {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();

    // Match YouTube Shorts: youtube.com/shorts/<id>
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i);
    if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

    // Match standard watch / embed / youtu.be:
    const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (watchMatch && watchMatch[1]) return watchMatch[1];

    return null;
  };

  const getYouTubeEmbedUrl = (url) => {
    const vidId = getYouTubeVideoId(url);
    if (!vidId) return null;
    return `https://www.youtube.com/embed/${vidId}?enablejsapi=1&autoplay=1&mute=0&rel=0&playsinline=1`;
  };

  // Helper to detect and extract Instagram Reel / Post embed URL
  const getInstagramEmbedUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();

    // Match Instagram reel, reels, p, or tv: instagram.com/(reel|reels|p|tv)/<id>
    const match = trimmed.match(/(?:instagram\.com|instagr\.am)\/(?:reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return `https://www.instagram.com/reel/${match[1]}/embed/captioned/`;
    }
    return null;
  };

  // Helper to check if URL or file is a direct video (.mp4, .webm, .mov, etc.)
  const isDirectVideoUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || url.startsWith("data:video/") || url.includes("/video");
  };

  // Determine user's own current active story (within 24 hours)
  const myCurrentStory = useMemo(() => {
    return stories.find((s) => s.author === username);
  }, [stories, username]);

  // Map author -> story to check which contacts have an active story
  const contactStoryMap = useMemo(() => {
    const map = {};
    stories.forEach((s) => {
      map[s.author] = s;
    });
    return map;
  }, [stories]);

  // 1. Fetch available rooms, contacts, and stories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, usersRes, storiesRes] = await Promise.all([
          axios.get(`${SERVER_URL}/api/rooms`),
          axios.get(`${SERVER_URL}/api/users`),
          axios.get(`${SERVER_URL}/api/stories`),
        ]);

        if (roomsRes.data && roomsRes.data.length > 0) {
          const formattedRooms = roomsRes.data.map((r) => ({
            id: r.id,
            room: r.id,
            name: r.name,
            isGroup: r.is_group,
            membersCount: 5,
            avatar: r.avatar_url || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
            lastMsg: "Tap to chat",
            time: "Active",
            unread: 0,
            type: r.is_group ? "group" : "direct",
            online: true,
          }));
          setConversations(formattedRooms);
          setActiveChat(formattedRooms[0]);
        }

        if (usersRes.data) {
          setContactsList(usersRes.data);
        }

        if (storiesRes.data) {
          const formattedStories = storiesRes.data.map((s) => ({
            ...s,
            audioUrl: s.audioUrl || s.audio_url || null,
          }));
          setStories(formattedStories);
        }
      } catch (err) {
        console.warn("Using default rooms fallback:", err.message);
      }
    };
    fetchData();
  }, []);

  // 2. Fetch Initial Chat History (latest 30 messages) whenever activeChat changes
  useEffect(() => {
    if (!activeChat) return;

    const fetchInitialMessages = async () => {
      setLoadingHistory(true);
      try {
        const res = await axios.get(
          `${SERVER_URL}/api/messages/${encodeURIComponent(activeChat.room)}?limit=30&offset=0`
        );
        const rawList = Array.isArray(res.data) ? res.data : (res.data?.messages || []);
        const hasMore = !!res.data?.hasMore;

        const mapped = rawList.map((m) => ({
          id: m.id,
          author: m.author,
          authorAvatar: m.author_avatar,
          type: m.type,
          message: m.message,
          content: m.content,
          name: m.name,
          fileSize: m.file_size,
          duration: m.duration,
          time: m.time,
          room: m.room_id,
        }));

        setMessagesByRoom((prev) => ({
          ...prev,
          [activeChat.room]: mapped,
        }));

        setHasMoreMessagesByRoom((prev) => ({
          ...prev,
          [activeChat.room]: hasMore,
        }));
      } catch (err) {
        console.warn("Could not load message history from Supabase:", err.message);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchInitialMessages();
  }, [activeChat]);

  // Load older messages for pagination (WhatsApp-style infinite history)
  const loadOlderMessages = async () => {
    if (!activeChat || loadingOlderMessages || !hasMoreMessagesByRoom[activeChat.room]) return;

    const currentList = messagesByRoom[activeChat.room] || [];
    const offset = currentList.length;

    setLoadingOlderMessages(true);
    isPrependingOlderRef.current = true;
    const container = messagesContainerRef.current;
    const prevScrollHeight = container ? container.scrollHeight : 0;

    try {
      const res = await axios.get(
        `${SERVER_URL}/api/messages/${encodeURIComponent(activeChat.room)}?limit=30&offset=${offset}`
      );

      const rawList = Array.isArray(res.data) ? res.data : (res.data?.messages || []);
      const hasMore = !!res.data?.hasMore;

      const mapped = rawList.map((m) => ({
        id: m.id,
        author: m.author,
        authorAvatar: m.author_avatar,
        type: m.type,
        message: m.message,
        content: m.content,
        name: m.name,
        fileSize: m.file_size,
        duration: m.duration,
        time: m.time,
        room: m.room_id,
      }));

      setMessagesByRoom((prev) => {
        const existing = prev[activeChat.room] || [];
        const existingIds = new Set(existing.map((m) => m.id));
        const older = mapped.filter((m) => !existingIds.has(m.id));
        return {
          ...prev,
          [activeChat.room]: [...older, ...existing],
        };
      });

      setHasMoreMessagesByRoom((prev) => ({
        ...prev,
        [activeChat.room]: hasMore,
      }));

      // Preserve user's scroll position so it doesn't jump to the bottom
      setTimeout(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        }
        isPrependingOlderRef.current = false;
      }, 30);
    } catch (err) {
      console.warn("Could not load older messages:", err.message);
      isPrependingOlderRef.current = false;
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  // Auto-scroll to bottom only when NOT prepending older paginated messages
  const scrollToBottom = () => {
    if (!isPrependingOlderRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesByRoom, activeChat]);

  // Join the active room on socket
  useEffect(() => {
    if (socket && activeChat) {
      socket.emit("join_room", {
        username,
        room: activeChat.room,
        avatar: currentUserAvatar,
      });
    }
  }, [socket, activeChat, username, currentUserAvatar]);

  // Socket.io Events
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      const targetRoom = data.room || activeChat.room;
      setMessagesByRoom((prev) => {
        const existing = prev[targetRoom] || [];
        if (data.id && existing.some((m) => m.id === data.id)) {
          return prev;
        }
        return {
          ...prev,
          [targetRoom]: [...existing, data],
        };
      });

      setConversations((prev) =>
        prev.map((c) => {
          if (c.room === targetRoom) {
            return {
              ...c,
              lastMsg:
                data.type === "image"
                  ? "📷 Photo"
                  : data.type === "file"
                  ? `📄 ${data.name}`
                  : `${data.author}: ${data.message}`,
              time: data.time || "Just now",
            };
          }
          return c;
        })
      );
    };

    const handleIncomingCall = (callData) => {
      setIncomingCall(callData);
    };

    const handleCallAccepted = () => {
      setCallStatus("connected");
    };

    const handleCallEnded = () => {
      setActiveCall(null);
      setIncomingCall(null);
      setCallStatus("ringing");
    };

    const handleUserStatusChange = ({ username: uName, status }) => {
      setContactsList((prev) =>
        prev.map((u) => (u.username === uName ? { ...u, status } : u))
      );
    };

    const handleNewStory = (story) => {
      const formatted = {
        ...story,
        audioUrl: story.audioUrl || story.audio_url || null,
      };
      setStories((prev) => [formatted, ...prev.filter((s) => s.id !== formatted.id)]);
    };

    const handleStoryViewed = ({ storyId, viewer, views }) => {
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId) {
            return { ...s, views: views || [...(s.views || []), viewer] };
          }
          return s;
        })
      );
      setActiveStory((curr) => {
        if (curr && curr.id === storyId) {
          return { ...curr, views: views || [...(curr.views || []), viewer] };
        }
        return curr;
      });
    };

    const handleStoryLiked = ({ storyId, likes }) => {
      setStories((prev) =>
        prev.map((s) => (s.id === storyId ? { ...s, likes } : s))
      );
      setActiveStory((curr) => {
        if (curr && curr.id === storyId) {
          return { ...curr, likes };
        }
        return curr;
      });
    };

    const handleProfileUpdated = ({ username: uName, avatar_url }) => {
      setContactsList((prev) =>
        prev.map((u) => (u.username === uName ? { ...u, avatar_url } : u))
      );
    };

    // WebRTC signal handlers
    const handleWebRtcOffer = async ({ offer, fromUser }) => {
      try {
        // Get media — callType comes from the incoming call notification
        const callType = incomingCall?.callType || "voice";
        const constraints = callType === "video"
          ? { video: true, audio: true }
          : { video: false, audio: true };

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (mediaErr) {
          // Fallback: audio only if camera is blocked
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        peerRef.current = pc;

        // Add local tracks so caller hears/sees us
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // When remote audio/video arrives, pipe to output element
        pc.ontrack = (e) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
            remoteVideoRef.current.play().catch(() => {});
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("webrtc_ice_candidate", {
              room: activeChat.room,
              candidate: e.candidate,
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc_answer", {
          room: activeChat.room,
          answer,
          fromUser: username,
        });
      } catch (err) {
        console.warn("WebRTC offer handling failed:", err.message);
      }
    };

    const handleWebRtcAnswer = async ({ answer }) => {
      try {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.warn("WebRTC answer handling failed:", err.message);
      }
    };

    const handleWebRtcIceCandidate = async ({ candidate }) => {
      try {
        if (peerRef.current && candidate) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.warn("WebRTC ICE candidate error:", err.message);
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_ended", handleCallEnded);
    socket.on("user_status_change", handleUserStatusChange);
    socket.on("new_story_published", handleNewStory);
    socket.on("story_viewed", handleStoryViewed);
    socket.on("story_liked", handleStoryLiked);
    socket.on("user_profile_updated", handleProfileUpdated);
    socket.on("webrtc_offer", handleWebRtcOffer);
    socket.on("webrtc_answer", handleWebRtcAnswer);
    socket.on("webrtc_ice_candidate", handleWebRtcIceCandidate);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_ended", handleCallEnded);
      socket.off("user_status_change", handleUserStatusChange);
      socket.off("new_story_published", handleNewStory);
      socket.off("story_viewed", handleStoryViewed);
      socket.off("story_liked", handleStoryLiked);
      socket.off("user_profile_updated", handleProfileUpdated);
      socket.off("webrtc_offer", handleWebRtcOffer);
      socket.off("webrtc_answer", handleWebRtcAnswer);
      socket.off("webrtc_ice_candidate", handleWebRtcIceCandidate);
    };
  }, [socket, activeChat]);

  // Handle Profile Photo Change
  const handleUpdateProfilePhoto = async (newUrl) => {
    const avatarUrl = newUrl || newAvatarInput;
    if (!avatarUrl) return;

    try {
      await axios.put(`${SERVER_URL}/api/users/${encodeURIComponent(username)}`, {
        avatar_url: avatarUrl,
      });
      setCurrentUserAvatar(avatarUrl);
      setShowProfilePhotoModal(false);
    } catch (e) {
      console.error("Profile photo update error:", e);
      setCurrentUserAvatar(avatarUrl);
      setShowProfilePhotoModal(false);
    }
  };

  // Upload Avatar File to Supabase Storage
  const handleAvatarFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadAndSend(file, username, socket);
      if (res?.fileUrl) {
        handleUpdateProfilePhoto(res.fileUrl);
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
    }
  };

  // Handle Publishing a New Story / Status
  const handlePublishStory = async (e) => {
    e?.preventDefault();
    if (!newStoryMedia) return;

    try {
      const res = await axios.post(`${SERVER_URL}/api/stories`, {
        author: username,
        authorAvatar: currentUserAvatar,
        mediaUrl: newStoryMedia,
        audioUrl: newStoryAudio || null,
        caption: newStoryCaption,
      });

      if (res.data) {
        const item = {
          ...res.data,
          audioUrl: res.data.audioUrl || res.data.audio_url || newStoryAudio || null,
        };
        setStories((prev) => [item, ...prev.filter((s) => s.id !== item.id)]);
      }
      setShowAddStoryModal(false);
      setNewStoryMedia("");
      setNewStoryAudio("");
      setNewStoryCaption("");
    } catch (err) {
      console.error("Story publish failed:", err);
      setShowAddStoryModal(false);
    }
  };

  // Upload Story Audio/Song to Supabase Storage
  const handleStoryAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingStoryAudio(true);
    try {
      const res = await uploadAndSend(file, username, socket);
      if (res?.fileUrl) {
        setNewStoryAudio(res.fileUrl);
      }
    } catch (err) {
      console.error("Story audio upload failed:", err);
    } finally {
      setUploadingStoryAudio(false);
    }
  };

  // Upload Story Media to Supabase Storage
  const handleStoryMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingStoryFile(true);
    try {
      const res = await uploadAndSend(file, username, socket);
      if (res?.fileUrl) {
        setNewStoryMedia(res.fileUrl);
      }
    } catch (err) {
      console.error("Story upload failed:", err);
    } finally {
      setUploadingStoryFile(false);
    }
  };

  // Find index of currently viewed story in the stories array
  const currentStoryIndex = useMemo(() => {
    if (!activeStory) return -1;
    return stories.findIndex((s) => s.id === activeStory.id);
  }, [stories, activeStory]);

  const hasPrevStory = currentStoryIndex > 0;
  const hasNextStory = currentStoryIndex >= 0 && currentStoryIndex < stories.length - 1;

  // Refs to guarantee event handlers & timers always access latest state
  const currentStoryIndexRef = useRef(currentStoryIndex);
  currentStoryIndexRef.current = currentStoryIndex;

  const storiesRef = useRef(stories);
  storiesRef.current = stories;

  // Navigate to Next Story
  const goToNextStory = () => {
    const idx = currentStoryIndexRef.current;
    const list = storiesRef.current;
    if (idx >= 0 && idx < list.length - 1) {
      openStoryViewer(list[idx + 1]);
    } else {
      setActiveStory(null);
    }
  };

  // Navigate to Previous Story
  const goToPrevStory = () => {
    const idx = currentStoryIndexRef.current;
    const list = storiesRef.current;
    if (idx > 0) {
      openStoryViewer(list[idx - 1]);
    } else {
      // If already at first story, restart its progress
      setStoryProgress(0);
    }
  };

  // Keyboard navigation: ArrowRight -> Next, ArrowLeft -> Previous, Escape -> Close
  useEffect(() => {
    if (!activeStory) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        goToNextStory();
      } else if (e.key === "ArrowLeft") {
        goToPrevStory();
      } else if (e.key === "Escape") {
        setActiveStory(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStory]);

  // Open Story Viewer & Register View
  const openStoryViewer = (story) => {
    setActiveStory(story);
    setShowStoryAnalytics(false);
    setStoryProgress(0);

    const isYT = !!getYouTubeVideoId(story.mediaUrl);
    const isInsta = !!getInstagramEmbedUrl(story.mediaUrl);
    const isV = isDirectVideoUrl(story.mediaUrl);
    const hasA = !!story.audioUrl;

    if (isYT || isInsta) {
      setStoryDuration(25); // 25s for YouTube Shorts / Reels (allows complete video to play)
    } else if (isV || hasA) {
      setStoryDuration(15); // Will be updated by onLoadedMetadata
    } else {
      setStoryDuration(4);  // 4s for plain photo
    }

    axios.post(`${SERVER_URL}/api/stories/${story.id}/view`, {
      viewer: username,
    });
  };

  // Story Progress Timer for YouTube, Instagram Reels, and Plain Photos
  // (Direct HTML5 videos and audio files drive their own progress via onTimeUpdate)
  useEffect(() => {
    if (!activeStory) {
      setStoryProgress(0);
      return;
    }

    const isV = isDirectVideoUrl(activeStory.mediaUrl);
    const hasA = !!activeStory.audioUrl;

    // Direct HTML5 video and audio update storyProgress directly via onTimeUpdate
    if (isV || hasA) {
      return;
    }

    setStoryProgress(0);

    const isYT = !!getYouTubeVideoId(activeStory.mediaUrl);
    const isInsta = !!getInstagramEmbedUrl(activeStory.mediaUrl);

    // 25 seconds for YouTube Shorts / Reels; 4 seconds for plain photos
    const durSec = isYT || isInsta ? 25 : 4;
    setStoryDuration(durSec);

    const intervalMs = 50;
    const step = (intervalMs / (durSec * 1000)) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          goToNextStory();
          return 100;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeStory?.id]);

  // Optional YouTube API listener: if video finishes before 25s, advance immediately
  useEffect(() => {
    if (!activeStory) return;
    const ytId = getYouTubeVideoId(activeStory.mediaUrl);
    if (!ytId) return;

    let player = null;
    let isCancelled = false;

    const attachPlayer = () => {
      if (isCancelled) return;
      const iframeEl = document.getElementById("story-yt-iframe");
      if (!iframeEl || !window.YT || !window.YT.Player) {
        return;
      }

      try {
        player = new window.YT.Player("story-yt-iframe", {
          events: {
            onStateChange: (event) => {
              if (isCancelled) return;
              // 0 = YT.PlayerState.ENDED: video actually finished
              if (event.data === 0) {
                goToNextStory();
              }
            },
          },
        });
      } catch (err) {}
    };

    const attachTimer = setTimeout(attachPlayer, 600);

    return () => {
      isCancelled = true;
      clearTimeout(attachTimer);
      if (player && typeof player.destroy === "function") {
        try { player.destroy(); } catch (e) {}
      }
    };
  }, [activeStory?.id]);

  // Video Loaded Metadata Handler -> sync timeline to actual video duration
  const handleVideoLoadedMetadata = (e) => {
    const dur = e.target.duration;
    if (dur && !isNaN(dur) && dur > 0) {
      setStoryDuration(dur);
    }
  };

  // Audio/Song Loaded Metadata Handler -> sync timeline to song length
  const handleAudioLoadedMetadata = (e) => {
    const dur = e.target.duration;
    if (dur && !isNaN(dur) && dur > 0) {
      setStoryDuration(dur);
    }
  };

  // Like or Unlike Active Story
  const toggleLikeActiveStory = () => {
    if (!activeStory) return;

    axios.post(`${SERVER_URL}/api/stories/${activeStory.id}/like`, {
      liker: username,
    }).then((res) => {
      if (res.data) {
        setActiveStory((prev) => ({
          ...prev,
          likes: res.data.likes,
        }));
      }
    });
  };

  // Calling
  const startCall = async (callType) => {
    setActiveCall(callType);
    setCallStatus("ringing");
    socket.emit("initiate_call", {
      room: activeChat.room,
      callerName: username,
      callerAvatar: currentUserAvatar,
      callType,
    });

    try {
      const constraints = callType === "video"
        ? { video: true, audio: true }
        : { video: false, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerRef.current = pc;

      // Add all local tracks so the remote peer hears/sees us
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // When remote audio/video arrives, pipe to our output element
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          // Must call play() explicitly — some browsers block autoplay
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc_ice_candidate", {
            room: activeChat.room,
            candidate: e.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc_offer", {
        room: activeChat.room,
        offer,
        fromUser: username,
      });
    } catch (err) {
      console.warn("WebRTC startCall failed:", err.message);
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    const callType = incomingCall.callType;
    const room = incomingCall.room;

    // Tell caller we accepted
    socket.emit("accept_call", { room, userName: username });
    setActiveCall(callType);
    setCallStatus("connected");
    setIncomingCall(null);

    // Start capturing mic/camera NOW so the answerer's audio/video is sent to caller
    try {
      const constraints = callType === "video"
        ? { video: true, audio: true }
        : { video: false, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerRef.current = pc;

      // Add all tracks (audio + optional video)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // When remote tracks arrive, pipe to audio/video output
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      // Relay ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc_ice_candidate", { room, candidate: e.candidate });
        }
      };
    } catch (err) {
      console.warn("acceptIncomingCall getUserMedia failed:", err.message);
    }
  };

  const endCall = () => {
    const room = incomingCall ? incomingCall.room : activeChat.room;
    socket.emit("end_call", {
      room,
      userName: username,
    });

    // Tear down WebRTC
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus("ringing");
  };

  // Send message
  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const msgObj = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      author: username,
      authorAvatar: currentUserAvatar,
      type: "text",
      message: currentMessage.trim(),
      time: timeStr,
      room: activeChat.room,
    };

    socket.emit("send_message", msgObj);
    setCurrentMessage("");
    setShowEmojiPicker(false);
  };

  // Create Customizable Group
  const handleCreateCustomGroup = async (e) => {
    e?.preventDefault();
    if (!newGroupName.trim()) return;

    const newRoomObj = {
      id: newGroupName.trim(),
      name: newGroupName.trim(),
      is_group: true,
      avatar_url: newGroupAvatar,
    };

    try {
      await axios.post(`${SERVER_URL}/api/rooms`, newRoomObj);
      socket.emit("create_room", newRoomObj);

      const localItem = {
        id: newRoomObj.id,
        room: newRoomObj.name,
        name: newRoomObj.name,
        isGroup: true,
        membersCount: 1,
        avatar: newRoomObj.avatar_url,
        lastMsg: "Group created",
        time: "Just now",
        unread: 0,
        type: "group",
        online: true,
      };

      setConversations((prev) => [localItem, ...prev]);
      setActiveChat(localItem);
      setShowCreateGroupModal(false);
      setNewGroupName("");
    } catch (err) {
      console.error("Error creating group:", err);
      setShowCreateGroupModal(false);
    }
  };

  // Direct Chat from Contacts
  const startDirectChatWithContact = (contact) => {
    if (contact.username === username) return;

    const directRoomId = [username, contact.username].sort().join("_");
    const directConv = {
      id: directRoomId,
      room: directRoomId,
      name: contact.username,
      isGroup: false,
      membersCount: 2,
      avatar: contact.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      lastMsg: "Direct message",
      time: "Now",
      unread: 0,
      type: "direct",
      online: contact.status === "online",
    };

    setConversations((prev) => {
      if (prev.some((c) => c.room === directRoomId)) return prev;
      return [directConv, ...prev];
    });

    setActiveChat(directConv);
    setShowContactsModal(false);
  };

  // File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const res = await uploadAndSend(file, username, socket);
      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const isImg = file.type.startsWith("image/");
      const msgObj = {
        id: "msg_" + Date.now(),
        author: username,
        authorAvatar: currentUserAvatar,
        type: isImg ? "image" : "file",
        content: res?.fileUrl || URL.createObjectURL(file),
        name: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB • ${file.name.split(".").pop().toUpperCase()}`,
        time: timeStr,
        room: activeChat.room,
      };

      socket.emit("send_message", msgObj);
    } catch (err) {
      console.error(err);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const isImg = file.type.startsWith("image/");
      const localMsg = {
        id: "msg_" + Date.now(),
        author: username,
        authorAvatar: currentUserAvatar,
        type: isImg ? "image" : "file",
        content: URL.createObjectURL(file),
        name: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB • ${file.name.split(".").pop().toUpperCase()}`,
        time: timeStr,
        room: activeChat.room,
      };
      socket.emit("send_message", localMsg);
    }

    e.target.value = "";
  };

  // Gift Confetti
  const handleGiftCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.8 },
      colors: ["#8b5cf6", "#ec4899", "#a855f7", "#3b82f6", "#f59e0b"],
    });

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const giftMsg = {
      id: "gift_" + Date.now(),
      author: username,
      authorAvatar: currentUserAvatar,
      type: "text",
      message: "🎁 Sent a celebration gift with confetti! 🎉✨",
      time: timeStr,
      room: activeChat.room,
    };
    socket.emit("send_message", giftMsg);
  };

  // Voice Recording simulation
  const handleRecordVoiceNote = () => {
    setIsRecordingVoice(true);
    setTimeout(() => {
      setIsRecordingVoice(false);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const voiceMsg = {
        id: "voice_" + Date.now(),
        author: username,
        authorAvatar: currentUserAvatar,
        type: "audio",
        duration: "0:16",
        time: timeStr,
        room: activeChat.room,
      };
      socket.emit("send_message", voiceMsg);
    }, 2000);
  };

  // AI Assistant action
  const handleAiAction = (actionType) => {
    setAiGenerating(true);
    setTimeout(() => {
      setAiGenerating(false);
      setShowAiModal(false);

      let aiResponse = "";
      if (actionType === "summarize") {
        aiResponse = "🤖 [AI Summary]: Group discussions are active and verified.";
      } else if (actionType === "polish") {
        if (!currentMessage) {
          setCurrentMessage("Sounds wonderful! I am completely on board with these changes. Looking forward to our discussion!");
          return;
        } else {
          setCurrentMessage(`✨ ${currentMessage} (polished for clarity and professional tone)`);
          return;
        }
      } else if (actionType === "translate") {
        setCurrentMessage("Hola a todos, ¡los veo pronto! (Translated to Spanish)");
        return;
      }

      if (aiResponse) {
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const aiMsg = {
          id: "ai_" + Date.now(),
          author: "MyChat AI",
          authorAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
          type: "text",
          message: aiResponse,
          time: timeStr,
          room: activeChat.room,
        };
        socket.emit("send_message", aiMsg);
      }
    }, 900);
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (tabFilter === "direct") return matchesSearch && !item.isGroup;
      if (tabFilter === "groups") return matchesSearch && item.isGroup;
      return matchesSearch;
    });
  }, [conversations, searchQuery, tabFilter]);

  const currentMessages = messagesByRoom[activeChat.room] || [];

  return (
    <div className="main-chat-container">
      {/* 1. LEFT ICON NAVIGATION BAR */}
      <aside className="left-nav-bar">
        <div>
          {/* Logo Brand */}
          <div className="nav-top-brand">
            <div className="brand-icon-box">
              <MessageSquare size={22} />
            </div>
            <span className="brand-title">MyChat</span>
          </div>

          {/* Navigation Links */}
          <nav className="nav-menu-list">
            <div
              className={`nav-menu-item ${!showContactsModal && !showSettingsModal ? "active" : ""}`}
              onClick={() => {
                setShowContactsModal(false);
                setShowSettingsModal(false);
              }}
            >
              <div className="nav-menu-item-left">
                <MessageSquare size={18} />
                <span>Chats</span>
              </div>
              <span className="nav-badge">{conversations.length}</span>
            </div>

            <div
              className={`nav-menu-item ${showContactsModal ? "active" : ""}`}
              onClick={() => {
                setShowContactsModal(true);
                setShowSettingsModal(false);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="nav-menu-item-left">
                <Users size={18} />
                <span>Contacts</span>
              </div>
              <span className="nav-badge">{contactsList.length}</span>
            </div>

            <div
              className="nav-menu-item"
              onClick={() => setShowAddStoryModal(true)}
              style={{ cursor: "pointer" }}
            >
              <div className="nav-menu-item-left">
                <Camera size={18} color="#ec4899" />
                <span style={{ color: "#ec4899" }}>Add Story</span>
              </div>
            </div>

            <div
              className="nav-menu-item"
              onClick={() => setShowCreateGroupModal(true)}
              style={{ cursor: "pointer" }}
            >
              <div className="nav-menu-item-left">
                <Plus size={18} color="#a855f7" />
                <span style={{ color: "#a855f7" }}>New Group</span>
              </div>
            </div>

            <div
              className="nav-menu-item"
              onClick={() => setShowAiModal(true)}
              style={{ cursor: "pointer" }}
            >
              <div className="nav-menu-item-left">
                <Sparkles size={18} color="#c084fc" />
                <span style={{ color: "#c084fc" }}>AI Assistant</span>
              </div>
            </div>

            <div
              className={`nav-menu-item ${showSettingsModal ? "active" : ""}`}
              onClick={() => {
                setShowSettingsModal(true);
                setShowContactsModal(false);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="nav-menu-item-left">
                <Settings size={18} />
                <span>Settings</span>
              </div>
            </div>
          </nav>

          {/* AI Banner Widget */}
          <div className="ai-sidebar-card">
            <div className="ai-card-title">
              <Sparkles size={16} color="#e9d5ff" />
              <span>Status & Stories 24h</span>
            </div>
            <p className="ai-card-desc">
              Stories expire in 24h. Click any profile with a purple ring to view their story!
            </p>
            <button className="ai-card-btn" onClick={() => setShowAddStoryModal(true)}>
              <Camera size={13} /> Add Status
            </button>
          </div>
        </div>

        {/* User Profile Bar at bottom - Dark Ring if User has an active story */}
        <div
          className="sidebar-user-footer"
          onClick={() => {
            if (myCurrentStory) {
              openStoryViewer(myCurrentStory);
            } else {
              setShowProfilePhotoModal(true);
            }
          }}
          title={myCurrentStory ? "Click to view your Story" : "Click to change your Profile Photo"}
        >
          <div className="user-profile-info">
            <div className={`profile-avatar-wrapper ${myCurrentStory ? "avatar-with-story-ring" : ""}`}>
              <img
                src={currentUserAvatar}
                alt={username}
                className="profile-avatar"
              />
              <span className="online-dot"></span>
            </div>
            <div>
              <div className="profile-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{username}</span>
                <Edit2
                  size={12}
                  color="#9f96b8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfilePhotoModal(true);
                  }}
                  title="Edit Avatar"
                />
              </div>
              <div className="profile-status">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }}></span>
                {myCurrentStory ? "Active Story (24h)" : "Online"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. CHAT CHANNELS LIST PANEL WITH STORIES CAROUSEL */}
      <section className="chat-list-panel">
        <div className="chat-list-header">
          {/* Search Row */}
          <div className="search-bar-row">
            <div className="search-input-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="icon-action-btn"
              title="Create Custom Group"
              onClick={() => setShowCreateGroupModal(true)}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="tab-filter-row">
            <div className="tab-buttons">
              <button
                className={`tab-btn ${tabFilter === "all" ? "active" : ""}`}
                onClick={() => setTabFilter("all")}
              >
                All
              </button>
              <button
                className={`tab-btn ${tabFilter === "direct" ? "active" : ""}`}
                onClick={() => setTabFilter("direct")}
              >
                Direct
              </button>
              <button
                className={`tab-btn ${tabFilter === "groups" ? "active" : ""}`}
                onClick={() => setTabFilter("groups")}
              >
                Groups
              </button>
            </div>
          </div>
        </div>

        {/* HORIZONTAL STATUS CAROUSEL (MY STATUS + CONTACTS WITH DARK ROUND RING) */}
        <div className="stories-horizontal-bar">
          {/* Your Story item: If posted, click directly opens story; if not, click opens add modal */}
          <div
            className="story-circle-item"
            onClick={() => {
              if (myCurrentStory) {
                openStoryViewer(myCurrentStory);
              } else {
                setShowAddStoryModal(true);
              }
            }}
          >
            <div className={myCurrentStory ? "story-ring-active" : "story-ring-add"}>
              <img src={currentUserAvatar} alt="My Status" className="story-circle-avatar" />
              {!myCurrentStory && <span className="story-add-badge">+</span>}
            </div>
            <span className="story-circle-name">
              {myCurrentStory ? "My Story" : "My Status"}
            </span>
          </div>

          {/* Stories from all contacts (dark purple ring) */}
          {stories.map((story) => (
            <div
              key={story.id}
              className="story-circle-item"
              onClick={() => openStoryViewer(story)}
            >
              <div className="story-ring-active">
                <img
                  src={story.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                  alt={story.author}
                  className="story-circle-avatar"
                />
              </div>
              <span className="story-circle-name">{story.author}</span>
            </div>
          ))}
        </div>

        {/* Conversations Scrollable List */}
        <div className="chat-conversations-list">
          {filteredConversations.map((conv) => {
            const isActive = activeChat.id === conv.id;
            const hasStory = !conv.isGroup && contactStoryMap[conv.name];

            return (
              <div
                key={conv.id}
                className={`conversation-item ${isActive ? "active" : ""}`}
                onClick={() => setActiveChat(conv)}
              >
                {/* Clicking avatar with Dark Round Ring directly opens their story! */}
                <div
                  className={`conv-avatar-box ${hasStory ? "avatar-with-story-ring" : ""}`}
                  onClick={(e) => {
                    if (hasStory) {
                      e.stopPropagation();
                      openStoryViewer(hasStory);
                    }
                  }}
                  title={hasStory ? `Click to view ${conv.name}'s story!` : conv.name}
                  style={{ cursor: hasStory ? "pointer" : "inherit" }}
                >
                  <img src={conv.avatar} alt={conv.name} />
                  {conv.online && <span className="conv-online-badge"></span>}
                </div>

                <div className="conv-details">
                  <div className="conv-top-line">
                    <span className="conv-title">{conv.name}</span>
                    <span className="conv-time">{conv.time}</span>
                  </div>
                  <div className="conv-bottom-line">
                    <span className="conv-last-msg">{conv.lastMsg}</span>
                    {conv.unread > 0 && (
                      <span className="conv-unread-count">{conv.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. ACTIVE CHAT MAIN WINDOW */}
      <main className="main-chat-window">
        {/* Top Header */}
        <header className="chat-header-bar">
          <div
            className="active-chat-user-info"
            onClick={() => {
              const activeContactStory = !activeChat.isGroup && contactStoryMap[activeChat.name];
              if (activeContactStory) {
                openStoryViewer(activeContactStory);
              } else {
                setShowGroupProfile(true);
              }
            }}
            title="Click to view Group / Contact Info"
          >
            <div
              className={`active-avatar-wrap ${
                !activeChat.isGroup && contactStoryMap[activeChat.name] ? "avatar-with-story-ring" : ""
              }`}
            >
              <img src={activeChat.avatar} alt={activeChat.name} />
              <span className="online-dot"></span>
            </div>
            <div>
              <div className="active-user-name">{activeChat.name}</div>
              <div className="active-user-sub">
                {activeChat.isGroup ? (
                  <span>
                    {activeChat.membersCount || 5} members •{" "}
                    <span className="online-highlight">Online (click for info)</span>
                  </span>
                ) : (
                  <span className="online-highlight">
                    {!activeChat.isGroup && contactStoryMap[activeChat.name]
                      ? "Story available (click to view)"
                      : "Online (click for info)"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="chat-header-actions">
            <button
              className="header-action-btn"
              title="Voice Call"
              onClick={() => startCall("voice")}
            >
              <Phone size={18} />
            </button>
            <button
              className="header-action-btn"
              title="Video Call"
              onClick={() => startCall("video")}
            >
              <Video size={18} />
            </button>
            <button
              className="header-action-btn"
              title="Group / Contact Info"
              onClick={() => setShowGroupProfile(true)}
            >
              <Info size={18} />
            </button>
            <button
              className="header-action-btn"
              title="More Options"
              onClick={() => setShowSettingsModal(true)}
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </header>

        {/* Message Feed Area with Paginated History */}
        <div
          className="chat-messages-container"
          ref={messagesContainerRef}
          onScroll={(e) => {
            if (
              e.currentTarget.scrollTop < 40 &&
              hasMoreMessagesByRoom[activeChat.room] &&
              !loadingOlderMessages &&
              !loadingHistory
            ) {
              loadOlderMessages();
            }
          }}
        >
          {/* Load Earlier Messages Pill */}
          {hasMoreMessagesByRoom[activeChat.room] && (
            <div className="load-older-wrap">
              <button
                type="button"
                className="load-older-btn"
                onClick={loadOlderMessages}
                disabled={loadingOlderMessages}
              >
                {loadingOlderMessages ? "Loading earlier messages..." : "↑ Load earlier messages"}
              </button>
            </div>
          )}

          {loadingHistory && (
            <div style={{ textAlign: "center", color: "#9f96b8", fontSize: 13, padding: 10 }}>
              Loading messages from Supabase...
            </div>
          )}

          {currentMessages.map((msg, index) => {
            const isSelf = msg.author === username;

            return (
              <div
                key={msg.id || index}
                className={`message-row ${isSelf ? "sent" : "received"}`}
              >
                {!isSelf && (
                  <img
                    src={
                      msg.authorAvatar ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                    }
                    alt={msg.author}
                    className="msg-avatar"
                  />
                )}

                <div className="msg-bubble">
                  {!isSelf && (
                    <div className="msg-author-tag">{msg.author}</div>
                  )}

                  {/* Text Message */}
                  {msg.type === "text" && <div>{msg.message}</div>}

                  {/* Image Message */}
                  {msg.type === "image" && (
                    <div
                      className="msg-image-content"
                      onClick={() => window.open(msg.content, "_blank")}
                    >
                      <img src={msg.content} alt={msg.name || "Sent Image"} />
                    </div>
                  )}

                  {/* Document / PDF Message */}
                  {msg.type === "file" && (
                    <div className="msg-file-card">
                      <div className="pdf-icon-badge">PDF</div>
                      <div className="file-info-col">
                        <div className="file-info-name">{msg.name}</div>
                        <div className="file-info-sub">{msg.fileSize || "File attachment"}</div>
                      </div>
                      <button
                        className="file-download-btn"
                        onClick={() => window.open(msg.content, "_blank")}
                        title="Download file"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  )}

                  {/* Voice Note / Audio Player */}
                  {msg.type === "audio" && (
                    <div className="audio-player-card">
                      <button
                        className="audio-play-btn"
                        onClick={() =>
                          setPlayingAudioId(
                            playingAudioId === msg.id ? null : msg.id
                          )
                        }
                      >
                        {playingAudioId === msg.id ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} style={{ marginLeft: 2 }} />
                        )}
                      </button>
                      <div className="audio-waveform-bars">
                        {[12, 18, 8, 22, 14, 20, 10, 16, 24, 12, 18, 9, 20, 15].map(
                          (height, i) => (
                            <span
                              key={i}
                              className={`wave-bar ${
                                playingAudioId === msg.id && i % 2 === 0
                                  ? "active"
                                  : ""
                              }`}
                              style={{ height: `${height}px` }}
                            ></span>
                          )
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                        {msg.duration || "0:14"}
                      </span>
                      <Mic size={14} color="#a855f7" />
                    </div>
                  )}

                  {/* Timestamp & Double Checkmarks */}
                  <div className="msg-meta-row">
                    <span>{msg.time}</span>
                    {isSelf && <CheckCheck size={14} color="#c084fc" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Emoji Picker Popover */}
        {showEmojiPicker && (
          <div className="emoji-popover">
            {EMOJI_PALETTE.map((emoji, idx) => (
              <button
                key={idx}
                className="emoji-cell"
                onClick={() => {
                  setCurrentMessage((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* AI Assistant Quick Tool Modal */}
        {showAiModal && (
          <div className="ai-smart-modal">
            <div className="ai-modal-header">
              <div className="ai-chip">
                <Sparkles size={16} />
                <span>MyChat AI Copilot</span>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                style={{ background: "none", border: "none", color: "#9f96b8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="ai-action-list">
              <button
                className="ai-action-btn"
                disabled={aiGenerating}
                onClick={() => handleAiAction("summarize")}
              >
                <FileText size={15} color="#c084fc" />
                <span>{aiGenerating ? "Summarizing..." : "Summarize unread messages"}</span>
              </button>
              <button
                className="ai-action-btn"
                disabled={aiGenerating}
                onClick={() => handleAiAction("polish")}
              >
                <Wand2 size={15} color="#ec4899" />
                <span>Polish drafted message</span>
              </button>
              <button
                className="ai-action-btn"
                disabled={aiGenerating}
                onClick={() => handleAiAction("translate")}
              >
                <HelpCircle size={15} color="#3b82f6" />
                <span>Translate to Spanish</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Message Input Bar */}
        <footer className="chat-bottom-bar">
          <div className="input-container-pill">
            <button
              className="pill-tool-btn"
              title="Emoji"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={20} />
            </button>

            <button
              className="pill-tool-btn"
              title="Attach File / Photo"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={20} />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileUpload}
              accept="image/*,video/*,application/pdf,.doc,.docx"
            />

            <input
              type="text"
              className="chat-input-text"
              placeholder={
                isRecordingVoice ? "Recording audio note..." : "Type a message..."
              }
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => {
                if (enterToSend && e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            {/* Smart AI Prompt Button */}
            <button
              className="pill-tool-btn"
              title="AI Assistant"
              onClick={() => setShowAiModal(!showAiModal)}
            >
              <Sparkles size={18} color="#c084fc" />
            </button>

            {/* Mic / Voice Note Button */}
            <button
              className="pill-tool-btn"
              title="Send Voice Note"
              onClick={handleRecordVoiceNote}
              style={{ color: isRecordingVoice ? "#ef4444" : undefined }}
            >
              <Mic size={18} />
            </button>

            {/* Celebration Gift Button */}
            <button
              className="pill-tool-btn"
              title="Send Celebration Gift"
              onClick={handleGiftCelebration}
            >
              <Gift size={18} color="#ec4899" />
            </button>
          </div>

          {/* Send Button */}
          <button
            className="send-action-btn"
            title="Send"
            onClick={handleSendMessage}
          >
            <Send size={18} />
          </button>
        </footer>
      </main>

      {/* ================= STORY VIEWER MODAL ================= */}
      {activeStory && (
        <div className="call-modal-overlay">
          <div className="story-viewer-modal">
            {/* Dynamic Top Progress Indicator Bar Segments for each story */}
            <div className="story-progress-bar-wrap">
              {stories.map((s, idx) => {
                let fillWidth = "0%";
                if (idx < currentStoryIndex) {
                  fillWidth = "100%";
                } else if (idx === currentStoryIndex) {
                  fillWidth = `${storyProgress}%`;
                }

                return (
                  <div
                    key={s.id || idx}
                    style={{
                      flex: 1,
                      height: 3,
                      background: "rgba(255, 255, 255, 0.3)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="story-progress-fill"
                      style={{
                        width: fillWidth,
                        transition: idx === currentStoryIndex ? "width 0.05s linear" : "none",
                      }}
                    ></div>
                  </div>
                );
              })}
            </div>

            {/* Left Tap Zone for previous story */}
            <div
              style={{
                position: "absolute",
                top: 60,
                bottom: 60,
                left: 0,
                width: "25%",
                zIndex: 14,
                cursor: "pointer",
              }}
              onClick={goToPrevStory}
              title={hasPrevStory ? "Previous Story" : "Restart"}
            />

            {/* Right Tap Zone for next story */}
            <div
              style={{
                position: "absolute",
                top: 60,
                bottom: 60,
                right: 0,
                width: "25%",
                zIndex: 14,
                cursor: "pointer",
              }}
              onClick={goToNextStory}
              title={hasNextStory ? "Next Story" : "Close"}
            />

            {/* Previous Story Arrow Button (Only if previous available) */}
            {hasPrevStory && (
              <button
                className="story-nav-btn story-nav-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevStory();
                }}
                title="Previous Story"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Next Story Arrow Button (Only if next available) */}
            {hasNextStory && (
              <button
                className="story-nav-btn story-nav-next"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextStory();
                }}
                title="Next Story"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Header with Author and Close */}
            <div className="story-viewer-header">
              <div className="story-author-info">
                <img
                  src={activeStory.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                  alt={activeStory.author}
                  className="story-author-avatar"
                />
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                    {activeStory.author} {activeStory.author === username ? "(You)" : ""}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{activeStory.time || "Recently"}</span>
                    {activeStory.audioUrl && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#ec4899" }}>
                        <Music size={11} /> Song Playing
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveStory(null)}
                style={{ background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Background Song / Audio if attached */}
            {activeStory.audioUrl && (
              <audio
                ref={storyAudioRef}
                src={activeStory.audioUrl}
                autoPlay
                onLoadedMetadata={handleAudioLoadedMetadata}
                onTimeUpdate={(e) => {
                  const dur = e.target.duration;
                  const cur = e.target.currentTime;
                  if (dur > 0) {
                    setStoryDuration(dur);
                    setStoryProgress(Math.min(100, (cur / dur) * 100));
                  }
                }}
                onEnded={goToNextStory}
              />
            )}

            {/* Story Media (Supports YouTube Shorts, Instagram Reels, Direct Video, or Image) */}
            {(() => {
              const ytEmbedUrl = getYouTubeEmbedUrl(activeStory.mediaUrl);
              const instaEmbedUrl = getInstagramEmbedUrl(activeStory.mediaUrl);
              const isVid = isDirectVideoUrl(activeStory.mediaUrl);

              if (ytEmbedUrl) {
                return (
                  <iframe
                    id="story-yt-iframe"
                    src={ytEmbedUrl}
                    title="YouTube Video / Shorts Story"
                    className="story-media-view"
                    style={{ border: "none" }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                );
              } else if (instaEmbedUrl) {
                return (
                  <iframe
                    src={instaEmbedUrl}
                    title="Instagram Reel Story"
                    className="story-media-view"
                    style={{ border: "none", background: "#000" }}
                    allow="autoplay; encrypted-media; clipboard-write"
                    allowFullScreen
                  />
                );
              } else if (isVid) {
                return (
                  <video
                    ref={storyVideoRef}
                    src={activeStory.mediaUrl}
                    className="story-media-view"
                    controls
                    autoPlay
                    playsInline
                    onTimeUpdate={(e) => {
                      const dur = e.target.duration;
                      const cur = e.target.currentTime;
                      if (dur > 0) {
                        setStoryDuration(dur);
                        setStoryProgress(Math.min(100, (cur / dur) * 100));
                      }
                    }}
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onEnded={goToNextStory}
                  />
                );
              } else {
                return (
                  <img
                    src={activeStory.mediaUrl}
                    alt="Story content"
                    className="story-media-view"
                  />
                );
              }
            })()}

            {/* Caption */}
            {activeStory.caption && (
              <div className="story-caption-overlay">
                {activeStory.caption}
              </div>
            )}

            {/* Bottom Bar: Views Counter & Like Button (ONLY AUTHOR SEES FULL ANALYTICS DRAWER) */}
            <div className="story-viewer-bottom-bar">
              <div
                className="story-viewers-pill"
                onClick={() => {
                  // Both can see view count, but author gets full who-saw drawer
                  setShowStoryAnalytics(!showStoryAnalytics);
                }}
                title={activeStory.author === username ? "Click to view who saw your story" : "Total Views"}
              >
                <Eye size={16} color="#c084fc" />
                <span>
                  {(activeStory.views || []).length} Views
                  {activeStory.author === username && " (See who)"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                  {(activeStory.likes || []).length}
                </span>
                <button
                  className="story-like-btn"
                  onClick={toggleLikeActiveStory}
                  title="Like story"
                >
                  <Heart
                    size={20}
                    color={(activeStory.likes || []).includes(username) ? "#ec4899" : "#fff"}
                    fill={(activeStory.likes || []).includes(username) ? "#ec4899" : "transparent"}
                  />
                </button>
              </div>
            </div>

            {/* Story Analytics Drawer (Who Saw & Who Liked) */}
            {showStoryAnalytics && (
              <div className="story-analytics-drawer">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 10 }}>
                  <h4 style={{ color: "#fff", fontSize: 16 }}>
                    {activeStory.author === username ? "Your Story Analytics" : "Story Reactions"}
                  </h4>
                  <button
                    onClick={() => setShowStoryAnalytics(false)}
                    style={{ background: "none", border: "none", color: "#9f96b8", cursor: "pointer" }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Single "Viewed By" list — eye if only viewed, heart if also liked */}
                <div>
                  <div className="drawer-section-title" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Eye size={14} color="#c084fc" />
                    <span>Viewed By ({(activeStory.views || []).length})</span>
                    {(activeStory.likes || []).length > 0 && (
                      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "#ec4899", fontSize: 12 }}>
                        <Heart size={12} color="#ec4899" fill="#ec4899" />
                        {(activeStory.likes || []).length} liked
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                    {(activeStory.views || []).length === 0 ? (
                      <span style={{ color: "#9f96b8", fontSize: 12 }}>No views yet.</span>
                    ) : (
                      (activeStory.views || []).map((viewer, idx) => {
                        const didLike = (activeStory.likes || []).includes(viewer);
                        return (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              background: didLike ? "rgba(236,72,153,0.07)" : "rgba(255,255,255,0.03)",
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: didLike ? "1px solid rgba(236,72,153,0.25)" : "1px solid transparent",
                            }}
                          >
                            {/* Name takes all remaining space */}
                            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, flex: 1 }}>
                              {viewer}{viewer === username ? " (You)" : ""}
                            </span>
                            {/* Right-side icon: heart if liked, eye if only viewed */}
                            {didLike ? (
                              <Heart size={15} color="#ec4899" fill="#ec4899" title="Liked" />
                            ) : (
                              <Eye size={15} color="#10b981" title="Viewed" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ADD NEW STORY MODAL ================= */}
      {showAddStoryModal && (
        <div className="call-modal-overlay">
          <div className="call-modal-box" style={{ maxWidth: 440, width: "90%" }}>
            <h3 style={{ fontSize: 20, color: "#fff", marginBottom: 6 }}>
              Add to Status Story (24h)
            </h3>
            <p style={{ color: "#9f96b8", fontSize: 13, marginBottom: 14 }}>
              Upload a photo/video or paste a <strong>YouTube Shorts, Reel, or video URL</strong>!
            </p>

            <form
              onSubmit={handlePublishStory}
              style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}
            >
              {/* Media Preview (Supports YouTube Shorts, Instagram Reels, Direct Video, or Photo) */}
              {newStoryMedia && (
                <div style={{ width: "100%", height: 180, borderRadius: 14, overflow: "hidden", border: "1px solid var(--accent-purple)", background: "#000" }}>
                  {(() => {
                    const yt = getYouTubeEmbedUrl(newStoryMedia);
                    const insta = getInstagramEmbedUrl(newStoryMedia);
                    const isVid = isDirectVideoUrl(newStoryMedia);
                    if (yt) {
                      return (
                        <iframe
                          src={yt}
                          title="YouTube Preview"
                          style={{ width: "100%", height: "100%", border: "none" }}
                          allow="accelerometer; autoplay; encrypted-media"
                        />
                      );
                    } else if (insta) {
                      return (
                        <iframe
                          src={insta}
                          title="Instagram Reel Preview"
                          style={{ width: "100%", height: "100%", border: "none", background: "#000" }}
                          allow="autoplay; encrypted-media"
                        />
                      );
                    } else if (isVid) {
                      return (
                        <video
                          src={newStoryMedia}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          controls
                        />
                      );
                    } else {
                      return (
                        <img
                          src={newStoryMedia}
                          alt="Preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      );
                    }
                  })()}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn-primary-gradient"
                  style={{ flex: 1, padding: 10 }}
                  onClick={() => storyFileInputRef.current?.click()}
                  disabled={uploadingStoryFile}
                >
                  <UploadCloud size={16} />
                  <span>{uploadingStoryFile ? "Uploading..." : "Upload Photo / Video"}</span>
                </button>
                <input
                  type="file"
                  ref={storyFileInputRef}
                  style={{ display: "none" }}
                  accept="image/*,video/*"
                  onChange={handleStoryMediaUpload}
                />
              </div>

              <div className="input-field-group">
                <label>Or Paste URL (YouTube Shorts, Video, or Photo link)</label>
                <input
                  type="text"
                  placeholder="e.g. https://youtube.com/shorts/... or https://youtu.be/..."
                  value={newStoryMedia}
                  onChange={(e) => setNewStoryMedia(e.target.value)}
                  required
                />
              </div>

              <div className="input-field-group">
                <label>Optional Background Song / Audio (MP3 or Audio file)</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="icon-action-btn"
                    style={{ height: 42, width: 42, borderRadius: 10, flexShrink: 0 }}
                    onClick={() => storyAudioInputRef.current?.click()}
                    title="Upload Song MP3"
                  >
                    <Music size={18} color="#ec4899" />
                  </button>
                  <input
                    type="file"
                    ref={storyAudioInputRef}
                    style={{ display: "none" }}
                    accept="audio/*"
                    onChange={handleStoryAudioUpload}
                  />
                  <input
                    type="text"
                    placeholder={uploadingStoryAudio ? "Uploading audio..." : "Audio / Song URL or click music icon"}
                    value={newStoryAudio}
                    onChange={(e) => setNewStoryAudio(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label>Caption</label>
                <input
                  type="text"
                  placeholder="e.g. Check out this reel! 🔥"
                  value={newStoryCaption}
                  onChange={(e) => setNewStoryCaption(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="icon-action-btn"
                  style={{ flex: 1, height: 44, borderRadius: 12 }}
                  onClick={() => setShowAddStoryModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-gradient"
                  style={{ flex: 2, height: 44, borderRadius: 12 }}
                >
                  Post Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CHANGE PROFILE PHOTO MODAL ================= */}
      {showProfilePhotoModal && (
        <div className="call-modal-overlay">
          <div className="call-modal-box" style={{ maxWidth: 420, width: "90%" }}>
            <h3 style={{ fontSize: 20, color: "#fff", marginBottom: 6 }}>
              Change Profile Photo
            </h3>
            <p style={{ color: "#9f96b8", fontSize: 13, marginBottom: 14 }}>
              Update your avatar across all chat rooms and groups!
            </p>

            <img
              src={newAvatarInput || currentUserAvatar}
              alt="Preview"
              style={{ width: 90, height: 90, borderRadius: "50%", border: "3px solid var(--accent-purple)", objectFit: "cover" }}
            />

            <div style={{ width: "100%", display: "flex", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn-primary-gradient"
                style={{ flex: 1, padding: 10 }}
                onClick={() => avatarFileInputRef.current?.click()}
              >
                <UploadCloud size={16} />
                <span>Upload From Device</span>
              </button>
              <input
                type="file"
                ref={avatarFileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleAvatarFileUpload}
              />
            </div>

            <div className="input-field-group" style={{ width: "100%", marginTop: 10 }}>
              <label>Or Paste Avatar URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={newAvatarInput}
                onChange={(e) => setNewAvatarInput(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 10 }}>
              <button
                type="button"
                className="icon-action-btn"
                style={{ flex: 1, height: 44, borderRadius: 12 }}
                onClick={() => setShowProfilePhotoModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary-gradient"
                style={{ flex: 2, height: 44, borderRadius: 12 }}
                onClick={() => handleUpdateProfilePhoto(newAvatarInput)}
              >
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP-LIKE GROUP PROFILE / INFO DRAWER MODAL */}
      {showGroupProfile && (
        <div className="call-modal-overlay">
          <div className="drawer-modal-box">
            <div className="drawer-header">
              <h3 style={{ fontSize: 18, color: "#fff" }}>
                {activeChat.isGroup ? "Group Info" : "Contact Info"}
              </h3>
              <button
                onClick={() => setShowGroupProfile(false)}
                style={{ background: "none", border: "none", color: "#9f96b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-profile-top">
              <img src={activeChat.avatar} alt={activeChat.name} className="drawer-avatar-lg" />
              <h2 style={{ fontSize: 20, color: "#fff" }}>{activeChat.name}</h2>
              <p style={{ color: "#9f96b8", fontSize: 13 }}>
                {activeChat.isGroup ? `Group • ${activeChat.membersCount || 5} members` : "Direct Contact"}
              </p>
            </div>

            {/* Quick Actions Bar */}
            <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: "8px 0" }}>
              <div
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}
                onClick={() => {
                  setShowGroupProfile(false);
                  startCall("voice");
                }}
              >
                <div className="header-action-btn"><Phone size={18} /></div>
                <span style={{ fontSize: 12, color: "#9f96b8" }}>Audio</span>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}
                onClick={() => {
                  setShowGroupProfile(false);
                  startCall("video");
                }}
              >
                <div className="header-action-btn"><Video size={18} /></div>
                <span style={{ fontSize: 12, color: "#9f96b8" }}>Video</span>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}
                onClick={() => {
                  setShowGroupProfile(false);
                  setShowCreateGroupModal(true);
                }}
              >
                <div className="header-action-btn"><Plus size={18} /></div>
                <span style={{ fontSize: 12, color: "#9f96b8" }}>Add</span>
              </div>
            </div>

            {/* Group Members List */}
            {activeChat.isGroup && (
              <div>
                <div className="drawer-section-title">Group Members ({contactsList.length || 5})</div>
                <div className="drawer-members-list" style={{ marginTop: 8 }}>
                  {contactsList.length > 0 ? (
                    contactsList.map((contact, idx) => (
                      <div key={idx} className="drawer-member-item">
                        <div className="drawer-member-left">
                          <img
                            src={
                              contact.avatar_url ||
                              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                            }
                            alt={contact.username}
                            className="member-avatar-sm"
                          />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                              {contact.username} {contact.username === username ? "(You)" : ""}
                            </div>
                            <div style={{ fontSize: 11, color: contact.status === "online" ? "#10b981" : "#6e6488" }}>
                              {contact.status === "online" ? "Online" : "Offline"}
                            </div>
                          </div>
                        </div>
                        {idx === 0 && <span className="member-admin-pill">Group Admin</span>}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#9f96b8", fontSize: 13 }}>All registered users are members.</div>
                  )}
                </div>
              </div>
            )}

            {/* WhatsApp-like Group Settings Options */}
            <div className="drawer-section-title">Settings & Privacy</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="settings-option-item">
                <div className="settings-option-left">
                  <Bell size={18} color="#c084fc" />
                  <span>Mute notifications</span>
                </div>
                <ChevronRight size={16} color="#6e6488" />
              </div>
              <div className="settings-option-item">
                <div className="settings-option-left">
                  <Lock size={18} color="#10b981" />
                  <span>End-to-end encryption</span>
                </div>
                <ShieldCheck size={16} color="#10b981" />
              </div>
              <div className="settings-option-item">
                <div className="settings-option-left">
                  <ImageIcon size={18} color="#ec4899" />
                  <span>Media visibility</span>
                </div>
                <ChevronRight size={16} color="#6e6488" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTACTS MODAL - START DIRECT CHATS */}
      {showContactsModal && (
        <div className="call-modal-overlay">
          <div className="drawer-modal-box">
            <div className="drawer-header">
              <h3 style={{ fontSize: 18, color: "#fff" }}>Registered Contacts ({contactsList.length})</h3>
              <button
                onClick={() => setShowContactsModal(false)}
                style={{ background: "none", border: "none", color: "#9f96b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ color: "#9f96b8", fontSize: 13 }}>
              Click any contact to start a direct 1-on-1 private chat!
            </p>

            <div className="drawer-members-list">
              {contactsList.map((contact, idx) => (
                <div
                  key={idx}
                  className="drawer-member-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => startDirectChatWithContact(contact)}
                >
                  <div className="drawer-member-left">
                    <img
                      src={
                        contact.avatar_url ||
                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={contact.username}
                      className="member-avatar-sm"
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                        {contact.username} {contact.username === username ? "(You)" : ""}
                      </div>
                      <div style={{ fontSize: 11, color: contact.status === "online" ? "#10b981" : "#6e6488" }}>
                        {contact.status === "online" ? "● Online" : "○ Offline"}
                      </div>
                    </div>
                  </div>
                  <UserCheck size={16} color="#c084fc" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="call-modal-overlay">
          <div className="drawer-modal-box">
            <div className="drawer-header">
              <h3 style={{ fontSize: 18, color: "#fff" }}>Application Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ background: "none", border: "none", color: "#9f96b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="settings-option-item" onClick={() => setShowProfilePhotoModal(true)}>
                <div className="settings-option-left">
                  <Camera size={18} color="#ec4899" />
                  <span>Change Profile Photo</span>
                </div>
                <ChevronRight size={16} color="#6e6488" />
              </div>

              <div className="settings-option-item" onClick={() => setNotificationSound(!notificationSound)}>
                <div className="settings-option-left">
                  <Bell size={18} color="#c084fc" />
                  <span>Sound notifications</span>
                </div>
                <span style={{ color: notificationSound ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: 13 }}>
                  {notificationSound ? "ON" : "OFF"}
                </span>
              </div>

              <div className="settings-option-item" onClick={() => setEnterToSend(!enterToSend)}>
                <div className="settings-option-left">
                  <Send size={18} color="#3b82f6" />
                  <span>Enter key to send message</span>
                </div>
                <span style={{ color: enterToSend ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: 13 }}>
                  {enterToSend ? "ON" : "OFF"}
                </span>
              </div>

              <div className="settings-option-item">
                <div className="settings-option-left">
                  <Lock size={18} color="#10b981" />
                  <span>Supabase Database Status</span>
                </div>
                <span style={{ color: "#10b981", fontSize: 12, fontWeight: 700 }}>CONNECTED</span>
              </div>

              <div
                className="settings-option-item"
                onClick={() => {
                  setShowSettingsModal(false);
                  if (onLogout) onLogout();
                  else window.location.reload();
                }}
                style={{ borderColor: "rgba(239, 68, 68, 0.4)", marginTop: 10 }}
              >
                <div className="settings-option-left" style={{ color: "#ef4444" }}>
                  <LogOut size={18} color="#ef4444" />
                  <span>Log out / Switch User</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customizable Group Creation Modal */}
      {showCreateGroupModal && (
        <div className="call-modal-overlay">
          <div className="call-modal-box" style={{ maxWidth: 420, width: "90%" }}>
            <h3 style={{ fontSize: 20, color: "#fff", marginBottom: 8 }}>
              Create Custom Group
            </h3>
            <p style={{ color: "#9f96b8", fontSize: 13, marginBottom: 16 }}>
              Set your custom group name and start chatting with everyone!
            </p>

            <form
              onSubmit={handleCreateCustomGroup}
              style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div className="input-field-group">
                <label>Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Developers Hub"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>

              <div className="input-field-group">
                <label>Group Avatar Icon URL</label>
                <input
                  type="text"
                  placeholder="Image URL"
                  value={newGroupAvatar}
                  onChange={(e) => setNewGroupAvatar(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="icon-action-btn"
                  style={{ flex: 1, height: 44, borderRadius: 12 }}
                  onClick={() => setShowCreateGroupModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-gradient"
                  style={{ flex: 2, height: 44, borderRadius: 12 }}
                >
                  Create & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INCOMING CALL NOTIFICATION POPUP */}
      {incomingCall && (
        <div className="call-modal-overlay">
          <div className="call-modal-box">
            <img
              src={
                incomingCall.callerAvatar ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
              }
              alt={incomingCall.callerName}
              className="call-avatar"
            />
            <h3 style={{ fontSize: 20, color: "#fff" }}>
              Incoming {incomingCall.callType === "video" ? "Video" : "Voice"} Call...
            </h3>
            <p style={{ color: "#9f96b8", fontSize: 14 }}>
              <strong>{incomingCall.callerName}</strong> is inviting you to call in {incomingCall.room}
            </p>
            <div className="call-action-btns-row">
              <button
                className="call-end-btn"
                onClick={endCall}
                title="Decline Call"
              >
                <PhoneOff size={24} />
              </button>
              <button
                className="call-accept-btn"
                onClick={acceptIncomingCall}
                title="Accept Call"
              >
                <PhoneCall size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OUTGOING / ONGOING CALL MODAL */}
      {activeCall && !incomingCall && (
        <>
          {activeCall === "video" ? (
            <div className="video-call-screen">
              {/* Remote video — full screen background (NOT muted so we hear their audio) */}
              <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
              {/* Local video — small PIP in corner (muted to avoid echo) */}
              <video ref={localVideoRef} autoPlay playsInline muted className="local-video-pip" />
              {/* Top bar */}
              <div className="call-top-bar">
                <img src={activeChat.avatar} alt={activeChat.name} className="call-top-avatar" />
                <div>
                  <div className="call-top-name">{activeChat.name}</div>
                  <div className="call-top-status" style={{ color: callStatus === "connected" ? "#10b981" : "#9f96b8" }}>
                    {callStatus === "connected" ? "Connected" : "Ringing..."}
                  </div>
                </div>
              </div>
              {/* Bottom controls */}
              <div className="call-controls-bar">
                <button className="call-ctrl-btn" title="Mute" onClick={() => {
                  if (localStreamRef.current) {
                    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
                  }
                }}><Mic size={22} /></button>
                <button className="call-ctrl-btn" title="Camera" onClick={() => {
                  if (localStreamRef.current) {
                    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
                  }
                }}><Video size={22} /></button>
                <button className="call-ctrl-btn end" onClick={endCall} title="End Call"><PhoneOff size={26} /></button>
              </div>
            </div>
          ) : (
            <div className="voice-call-screen">
              {/* Hidden audio element to play remote voice (critical!) */}
              <audio ref={remoteVideoRef} autoPlay playsInline style={{ display: "none" }} />
              <img src={activeChat.avatar} alt={activeChat.name} className="voice-call-avatar" />
              <div className="voice-call-name">{activeChat.name}</div>
              <div className="voice-call-status">
                {callStatus === "connected" ? "🟢 Connected" : "📡 Ringing..."}
              </div>
              <div className="call-controls-bar" style={{ position: "relative", bottom: "auto", background: "none", marginTop: 32 }}>
                <button className="call-ctrl-btn" title="Mute" onClick={() => {
                  if (localStreamRef.current) {
                    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
                  }
                }}><Mic size={22} /></button>
                <button className="call-ctrl-btn end" onClick={endCall} title="End Call"><PhoneOff size={26} /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Chat;
