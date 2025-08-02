let ioInstance;
const userSocketMap = new Map();

export function setupSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(' New connection:', socket.id);

    socket.on('register-user', (userId) => {
      userSocketMap.set(userId, socket.id);
      console.log(` User ${userId} registered for socket ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log(' Disconnected:', socket.id);
      for (const [userId, sId] of userSocketMap.entries()) {
        if (sId === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
    });
  });
}

export function sendFraudAlert(userId, data) {
  if (!ioInstance) {
    console.error(' Socket.IO not initialized yet.');
    return;
  }
  const socketId = userSocketMap.get(userId);
  if (socketId) {
    ioInstance.to(socketId).emit('fraud-alert', data);
    console.log(` Fraud alert sent to ${userId}`);
  } else {
    console.log(` No socket found for ${userId}`);
  }
}
