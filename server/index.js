// index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

// --------- AWS S3 Setup ---------
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// --------- Multer (memory storage) ---------
const upload = multer({ storage: multer.memoryStorage() }).single("file");

app.get("/", (req, res) => res.send("Server is running..."));

// --------- File upload endpoint ---------
app.post("/upload", async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).send({ message: err.message });
    if (!req.file) return res.status(400).send({ message: "No file uploaded" });

    try {
      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `uploads/${Date.now()}-${req.file.originalname}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      const parallelUpload = new Upload({
        client: s3Client,
        params: uploadParams,
      });

      await parallelUpload.done();

      res.send({
        message: "File uploaded successfully",
        fileUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`,
        fileType: req.file.mimetype,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).send({ message: error.message });
    }
  });
});

// --------- Socket.io ---------
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room
  socket.on("join_room", ({ username, room }) => {
    socket.join(room);
    console.log(`${username} joined room ${room}`);
  });

  // Handle sending messages
  socket.on("send_message", (data) => {
    io.to(data.room).emit("receive_message", {
      author: data.author,
      type: data.type,
      message: data.message,
      content: data.content,
      name: data.name,
      time: data.time,
    });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
