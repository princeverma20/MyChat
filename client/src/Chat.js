import React, { useEffect, useState, useRef } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import { uploadAndSend } from "./Upload";

function Chat({ socket, username, room }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const fileInputRef = useRef();

  // Send text message
  const sendTextMessage = () => {
    if (!currentMessage.trim()) return;

    const msg = {
      author: username,
      type: "text",
      message: currentMessage,
      time: new Date().toLocaleTimeString(),
      room,
    };

    socket.emit("send_message", msg);
    setCurrentMessage("");
  };

  const sendFileMessage = (fileUrl, fileName, fileType) => {
    const type = fileType.startsWith("image/") ? "image" : "file";

    const msg = {
      author: username,
      type,
      content: fileUrl,
      name: fileName,
      fileType,
      time: new Date().toLocaleTimeString(),
      room,
    };

    socket.emit("send_message", msg);
  };

  // Handle file selection
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await uploadAndSend(file, username, socket);
      if (result?.fileUrl)
        sendFileMessage(result.fileUrl, result.fileName, result.fileType);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    }

    e.target.value = "";
  };

  // Open URL in new tab
  const openInNewTab = (url) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = url.split("/").pop(); // use filename
    link.target = "_blank";
    link.click();
  };

  // Listen for messages (avoid duplicates)
  useEffect(() => {
    socket.emit("join_room", { username, room });

    const handleMessage = (data) => {
      setMessageList((list) => [...list, data]);
    };

    socket.on("receive_message", handleMessage);

    return () => socket.off("receive_message", handleMessage);
  }, [socket, username, room]);

  // Render messages
  const renderMessageContent = (msg) => {
    if (msg.type === "text") return <p id="message">{msg.message}</p>;

    if (msg.type === "image") {
      return (
        <img
          src={msg.content}
          alt={msg.name}
          style={{ maxWidth: "300px", borderRadius: "6px", cursor: "pointer" }}
          onClick={() => openInNewTab(msg.content)}
        />
      );
    }

    if (msg.type === "file") {
      return (
        <div
          style={{
            padding: "6px 10px",
            background: "#f3f3f3",
            borderRadius: "6px",
            maxWidth: "300px",
            cursor: "pointer",
            color: "blue",
          }}
          onClick={() => openInNewTab(msg.content)}
        >
          📄 {msg.name}
        </div>
      );
    }

    return <p>Unsupported file type</p>;
  };

  return (
    <div className="chat">
      <div className="chat-window">
        <div className="chat-header">
          <p>Live Chat</p>
        </div>

        <div className="chat-body">
          <ScrollToBottom className="message-container">
            {messageList.map((msg, index) => {
              const isYou = username === msg.author;
              return (
                <div
                  key={index}
                  className="messageContent"
                  id={isYou ? "you" : "other"}
                >
                  <div className="message-body">
                    <p id="author">{isYou ? "You" : msg.author}</p>
                    {renderMessageContent(msg)}
                    <span id="time">{msg.time}</span>
                  </div>
                </div>
              );
            })}
          </ScrollToBottom>
        </div>

        <div className="chat-footer">
          <input
            type="text"
            value={currentMessage}
            placeholder="Type a message..."
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendTextMessage()}
          />
          <button onClick={() => fileInputRef.current.click()}>📁</button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button onClick={sendTextMessage}>&#9658;</button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
