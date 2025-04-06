import {
    ParseWebhookEvent,
    parseWebhookEvent,
    verifyAppKeyWithNeynar,
} from "@farcaster/frame-node";
import { NextRequest } from "next/server";

type NotificationParams = {
  title: string;
  body: string;
  tag: string;
};

type FarcasterNotificationResponse = {
  success: boolean;
  message?: string;
};

// Send notification to Farcaster with proper error handling
async function sendNotification(
  params: NotificationParams,
  notificationDetails: { url: string; token: string }
): Promise<void> {
  try {
    const { title, body, tag } = params;
    const targetUrl = process.env.NEXT_PUBLIC_URL || "";

    if (!notificationDetails.url || !notificationDetails.token || !targetUrl) {
      console.error("Missing notification configuration");
      return;
    }

    const notificationId = `${tag}-${Date.now()}`;

    const response = (await fetch(notificationDetails.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notificationId,
        title: title.substring(0, 32), // Farcaster limit: 32 chars
        body: body.substring(0, 128), // Farcaster limit: 128 chars
        targetUrl,
        tokens: [notificationDetails.token],
      }),
    }).then((res) => res.json())) as FarcasterNotificationResponse;

    if (!response.success) {
      console.error("Failed to send notification:", response.message);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_URL;

    if (!appUrl) {
      throw new Error("Required environment variables are not set");
    }

    const requestJson = await request.json();

    let data;
    try {
      data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
    } catch (e: unknown) {
      const error = e as ParseWebhookEvent.ErrorType;

      switch (error.name) {
        case "VerifyJsonFarcasterSignature.InvalidDataError":
        case "VerifyJsonFarcasterSignature.InvalidEventDataError":
          // The request data is invalid
          return Response.json(
            { success: false, error: error.message },
            { status: 400 }
          );
        case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
          // The app key is invalid
          return Response.json(
            { success: false, error: error.message },
            { status: 401 }
          );
        case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
          // Internal error verifying the app key (caller may want to try again)
          return Response.json(
            { success: false, error: error.message },
            { status: 500 }
          );
      }
    }

    const event = data.event;

    switch (event.event) {
      case "frame_added":
        if (event.notificationDetails) {
          await sendNotification(
            {
              title: "🌋 Welcome to Ember Island!",
              body: "Your journey begins! Discover Stoke Fire by @nbragg and check out @kelvinpraises' work. Visit /stokefire to keep your village warm!",
              tag: "welcomeEmberIsland",
            },
            event.notificationDetails
          );
        }
        break;

      case "notifications_enabled":
        if (event.notificationDetails) {
          await sendNotification(
            {
              title: "✨ Island Whispers Activated!",
              body: "Magic unfolds! Island secrets revealed. Adventure calls at /stokefire!",
              tag: "emberIslandNotifications",
            },
            event.notificationDetails
          );
        }
        break;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error in webhook handler:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
