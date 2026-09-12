import http from "http";
import app from "./app.js";
import { initSocket } from "./lib/socket.js";
import { startOverdueScheduler } from "./lib/cron.js";
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
// Initialize Socket.io
initSocket(httpServer);
// Start background cron job for overdue tasks
startOverdueScheduler();
httpServer.listen(PORT, () => {
    console.log(`🚀 Real-Time Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map