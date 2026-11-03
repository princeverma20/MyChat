import { useState, useEffect } from "react";
import "./App.css";
import io from "socket.io-client";
import Chat from "./Chat";
import { MessageSquare, ArrowRight } from "lucide-react";

const SERVER_ENDPOINT = process.env.REACT_APP_SERVER_URL
  ? process.env.REACT_APP_SERVER_URL
  : window.location.hostname === "localhost"
  ? "http://localhost:9000"
  : "http://192.168.1.38:9000";

const socket = io.connect(SERVER_ENDPOINT, {
  transports: ["websocket"],
});

const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
];

function App() {
  const [username, setUsername] = useState("Shailendra Kori");
  const [room, setRoom] = useState("Friends Group");
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to socket:", socket.id);
    });
  }, []);

  const joinRoom = (e) => {
    e?.preventDefault();
    if (username.trim() !== "") {
      socket.emit("join_room", { username, room: room || "Friends Group", avatar: selectedAvatar });
      setShowChat(true);
    }
  };

  const handleLogout = () => {
    setShowChat(false);
  };

  return (
    <div className="app-root">
      {!showChat ? (
        <div className="join-screen-wrapper">
          <form className="join-card" onSubmit={joinRoom}>
            <div className="join-brand-badge">
              <div className="join-logo-icon">
                <MessageSquare size={26} />
              </div>
              <h1>MyChat</h1>
            </div>
            <p>Enter your profile to start messaging in real-time</p>

            {/* Avatar choice */}
            <div className="input-field-group">
              <label>Choose your Avatar</label>
              <div className="avatar-selector">
                {DEFAULT_AVATARS.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Avatar ${idx}`}
                    className={`avatar-opt ${selectedAvatar === url ? "active" : ""}`}
                    onClick={() => setSelectedAvatar(url)}
                  />
                ))}
              </div>
            </div>

            {/* Username */}
            <div className="input-field-group">
              <label>Your Display Name</label>
              <input
                type="text"
                value={username}
                placeholder="e.g. Shailendra Kori"
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>

            {/* Default Room / Channel */}
            <div className="input-field-group">
              <label>Default Room or Channel</label>
              <input
                type="text"
                value={room}
                placeholder="e.g. Friends Group"
                onChange={(event) => setRoom(event.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary-gradient">
              <span>Start Chatting</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      ) : (
        <Chat
          socket={socket}
          username={username}
          currentUserAvatar={selectedAvatar}
          setCurrentUserAvatar={setSelectedAvatar}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
