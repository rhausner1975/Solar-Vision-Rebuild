import app from "./app";
import { logger } from "./lib/logger";
import { seedDefaultAdmin, purgeExpiredSessions } from "./lib/auth";
import { startNotificationRetryWorker } from "./lib/retryWorker";
import {
  pruneNotificationLog,
  startNotificationLogCleanup,
} from "./lib/notificationLogCleanup";
import {
  pruneInAppNotifications,
  startInAppNotificationsCleanup,
} from "./lib/inAppNotificationsCleanup";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

(async () => {
  try {
    await seedDefaultAdmin();
    await purgeExpiredSessions();
    await pruneNotificationLog();
    startNotificationLogCleanup();
    await pruneInAppNotifications();
    startInAppNotificationsCleanup();
  } catch (err) {
    logger.error({ err }, "Startup tasks failed");
  }
  try {
    startNotificationRetryWorker();
  } catch (err) {
    logger.error({ err }, "Failed to start notification retry worker");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
})();
