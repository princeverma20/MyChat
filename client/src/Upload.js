import axios from "axios";
import React, { useRef, useState } from "react";

export const uploadAndSend = async (file, sender, socket, setUploading) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    setUploading && setUploading(true);

    const SERVER_URL =
      process.env.REACT_APP_SERVER_URL || "http://localhost:9000";

    const res = await axios.post(`${SERVER_URL}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return {
      fileUrl: res.data.fileUrl,
      fileType: res.data.fileType,
      fileName: res.data.fileName || file.name,
    };
  } catch (err) {
    console.error("Upload failed:", err);
    throw err;
  } finally {
    setUploading && setUploading(false);
  }
};

const Upload = ({ socket, sender = "c1" }) => {
  const [uploading, setUploading] = useState(false);
  const docRef = useRef();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadAndSend(file, sender, socket, setUploading);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        onClick={() => docRef.current?.click()}
        style={{ cursor: "pointer", fontSize: "28px", padding: "8px" }}
      >
        📁
      </div>
      <input
        ref={docRef}
        type="file"
        accept="image/*,video/*,application/pdf,.doc,.docx"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        disabled={uploading}
      />
    </div>
  );
};

export default Upload;
