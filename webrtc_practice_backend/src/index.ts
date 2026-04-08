import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://10.81.100.28:3000",
  },
});

const PORT = 5000;

const emailToSocketMapping = new Map<string, string>();
const socketToEmailMapping = new Map<string, string>();

io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  socket.on("join-room", (data) => {
    const { email, roomId } = data;
    if (!email || !roomId) {
      return;
    }
    emailToSocketMapping.set(email, socket.id);
    socketToEmailMapping.set(socket.id, email);
    socket.join(roomId);
    // console.log(emailToSocketMapping)

    console.log(emailToSocketMapping, "emailToSocketMapping");
    console.log(socketToEmailMapping, "socketToEmailMapping");

    console.log(
      " user joined",
      email,
      "in room",
      roomId,
      "socket id",
      socket.id,
    );

    socket.emit("joined-room", { roomId });

    socket.broadcast.to(roomId).emit("user-joined", { email });
  });

  socket.on("call-user", (data) => {
    const { email, offer } = data;
    console.log("call-user", email, offer);
    const fromEmail = socketToEmailMapping.get(socket.id);
    const toSocketId = emailToSocketMapping.get(email);

    console.log("call user ", "toSocketId", toSocketId, "fromEmail", fromEmail);
    if (!toSocketId) {
      return;
    }
    socket.to(toSocketId).emit("incomming-call", { offer, from: fromEmail });
    console.log(
      "sented call user",
      "toSocketId",
      toSocketId,
      "fromEmail",
      fromEmail,
      "offer",
      offer,
    );
  });

  socket.on("call-accepted", (data) => {
    const { email, answer } = data;
    const toSocketId = emailToSocketMapping.get(email);
    if (!toSocketId) {
      return;
    }
    socket.to(toSocketId).emit("call-accepted", { answer });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    emailToSocketMapping.delete(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
