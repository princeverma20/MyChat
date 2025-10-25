import { useState, useEffect } from "react";
import "./App.css";
import io from "socket.io-client";
import Chat from "./Chat";

const socket = io.connect(
  process.env.REACT_APP_SERVER_URL || "http://localhost:9000"
);

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [userId, setUserId] = useState("");
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      setUserId(socket.id);
    });
  }, []);

  const joinRoom = () => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", { username, room });
      console.log(`${username} joined room ${room}`);
      setShowChat(true);
    }
  };

  return (
    <div className="MyChat">
      {!showChat ? (
        <div className="joinChatContainer">
          <h3>Join A Chat</h3>
          <input
            type="text"
            placeholder="John.."
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            type="text"
            placeholder="Room ID.."
            onChange={(event) => setRoom(event.target.value)}
          />
          <button onClick={joinRoom}>Join A Room</button>
        </div>
      ) : (
        <Chat socket={socket} username={username} room={room} userId={userId} />
      )}
    </div>
  );
}

export default App;
