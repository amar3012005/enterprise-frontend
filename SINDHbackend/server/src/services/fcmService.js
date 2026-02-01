const { admin } = require('../config/firebase');
const logger = require('../config/logger');

/**
 * Send a push notification to a specific device token
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    logger.warn('FCM: No token provided, skipping notification');
    return null;
  }

  const message = {
    token: fcmToken,
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK', // Standard for mobile handlers
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'sindh_notifications',
        icon: 'stock_white_briefcase', // Matches Android drawable if configured
        color: '#3B4883'
      }
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default'
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info(`FCM: Successfully sent message to token: ${fcmToken.substring(0, 10)}... Response: ${response}`);
    return response;
  } catch (error) {
    logger.error('FCM: Error sending message:', error.message);
    
    // Handle specific error codes (e.g., token expired)
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      logger.warn('FCM: Token is no longer valid, should be removed from database');
      // In a real app, you might want to return a flag to trigger token cleanup
    }
    
    return null;
  }
}

/**
 * Send notification to multiple tokens
 */
async function sendMulticastNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return null;

  const message = {
    tokens,
    notification: { title, body },
    data,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info(`FCM: Multicast summary - Success: ${response.successCount}, Failure: ${response.failureCount}`);
    return response;
  } catch (error) {
    logger.error('FCM: Multicast error:', error.message);
    return null;
  }
}

module.exports = {
  sendPushNotification,
  sendMulticastNotification
};



