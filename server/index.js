import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cors from "cors";
import * as path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// message 저장소
let messages = [];

io.on("connection", (socket) => {
  // 여기서부터 채팅방 연결 ----------------------------------------------------------------
  const randNum = Math.floor(Math.random() * 1000) + 1;
  socket.currentRoom = null;

  const loginMessage = {
    room: "room0",
    id: `${socket.id}-${randNum}`,
    content: "",
    sender: `사용자 ${randNum}`,
    timestamp: new Date().toLocaleString(),
  };

  // 서버 로그
  console.log(`사용자 ${loginMessage.id}가 연결되었습니다`);

  // 여기서부터 채팅방 입장 ----------------------------------------------------------------
  socket.on("JOIN_ROOM", (room) => {
    // 채팅방 이미 입장 상태일 경우
    if (socket.currentRoom) {
      console.log(
        `${loginMessage.id}님은 이미 ${socket.currentRoom} 방에 입장해 있습니다.`
      );
    } else {
      // 채팅방 입장
      socket.join(room);
      socket.currentRoom = room;

      // 메시지를 보낸 클라를 제외한 모든 클라에게 채팅방 입장 메시지 전송
      loginMessage.content = `${loginMessage.id}님이 입장하였습니다.`;
      socket.broadcast
        .to(room)
        .emit("SEND_MESSAGE", JSON.stringify(loginMessage));

      // 서버 로그
      console.log(`${loginMessage.id}님이 채팅방 ${room}을 입장하셨습니다.`);
    }
  });

  // 여기서부터 채팅방 나가기 ----------------------------------------------------------------
  socket.on("LEAVE_ROOM", (room) => {
    // 채팅방을 이미 나간 상태일 경우
    if (socket.currentRoom !== room) {
      console.log(
        `${loginMessage.id}님은 채팅방 ${room}에 입장해 있지 않습니다.`
      );
    } else {
      // 채팅방 나가기
      socket.leave(room);

      // 메시지를 보낸 클라를 제외한 모든 클라에게 채팅방 나갈시 메시지 전송
      loginMessage.content = `${loginMessage.id}님이 나가셨습니다.`;
      socket.broadcast
        .to(room)
        .emit("SEND_MESSAGE", JSON.stringify(loginMessage));

      // 서버 로그
      console.log(`${loginMessage.id}님이 채팅방 ${room}을 나가셨습니다.`);
    }
  });

  // 여기서부터 채팅 ----------------------------------------------------------------
  // 클라로부터 메시지 수신
  socket.on("SEND_MESSAGE", ({ room, msg }) => {
    // 채팅방을 입장하지 않은 경우 채팅 이용 불가능
    if (socket.currentRoom !== room) {
      console.log(
        `${loginMessage.id}님은 채팅방 ${room}에 입장해 있지 않아서 메시지를 보낼 수 없습니다.`
      );
    } else {
      const message = {
        room: room,
        id: `${socket.id}-${randNum}`,
        content: msg,
        sender: `사용자 ${randNum}`,
        timestamp: new Date().toLocaleString(),
      };

      // 서버 로그
      console.log(`${socket.id}: `, msg);

      // message 에 채팅 데이터 저장
      messages.push(message);

      // 메시지를 보낸 클라를 포함한 모든 클라에게 메시지 전송
      io.to(room).emit("SEND_MESSAGE", JSON.stringify(message.msg));
    }
  });

  // 여기서부터 채팅방 연결 해제 ----------------------------------------------------------------
  socket.on("disconnect", () => {
    const logOutMessage = {
      room: "room0",
      id: `${socket.id}-${randNum}`,
      content: "사용자가 연결을 끊었습니다",
      sender: `사용자 ${randNum}`,
      timestamp: new Date().toLocaleString(),
    };

    // 서버 로그
    console.log(`사용자 ${logOutMessage.id}연결을 끊었습니다`);
  });
});

// 채팅 기록 조회
app.get("/messages", (req, res) => {
  res.status(200).json(JSON.stringify(messages));
});

app.use(express.static(path.join(path.resolve(), "public")));
app.get("/*", (req, res) => {
  res.sendFile(path.join(path.resolve(), "public", "index.html"));
});

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});
