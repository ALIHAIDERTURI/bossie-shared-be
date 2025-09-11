import * as admin from "firebase-admin";
import * as serviceAccount from "./bossieKey.json";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

// Define a function to send the push notification with image support on Android
export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  image: string
) => {
  const message: any = {
    token: token,
    notification: {
      title: title,
      body: body,
    },
    android: {
      notification: {
        image: image,
      },
    },
    webpush: {
      notification: {
        image: image,
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("✅ Successfully sent message:", response);
  } catch (error) {
    console.error("❌ Error sending message:", error);
  }
};
