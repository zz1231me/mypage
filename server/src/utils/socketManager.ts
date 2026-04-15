import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logInfo, logWarning } from './logger';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JWT_ALGORITHM } from '../config/constants';

// Store per-user socket connections
const userSockets = new Map<string, Set<string>>(); // userId → socketId[]
let io: SocketIOServer | null = null;

interface SocketWithUser {
  userId?: string;
}

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        env.NODE_ENV === 'development'
          ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']
          : false,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    // Authenticate via cookie sent with handshake
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      next(new Error('Authentication required'));
      return;
    }

    // Parse access_token from cookie header
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...val] = c.trim().split('=');
        return [key.trim(), decodeURIComponent(val.join('='))];
      })
    );

    const token = cookies['access_token'];
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: [JWT_ALGORITHM],
      }) as { id: string };
      (socket as typeof socket & SocketWithUser).userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', socket => {
    const userId = (socket as typeof socket & SocketWithUser).userId;
    if (!userId) return;

    // Register socket for this user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    logInfo('소켓 연결', { userId, socketId: socket.id });

    void socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      logInfo('소켓 연결 해제', { userId, socketId: socket.id });
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) {
    logWarning('Socket.IO가 초기화되지 않았습니다');
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToAll(event: string, data: unknown): void {
  if (!io) return;
  io.emit(event, data);
}
