"use client";

import { ActivityEventRow } from "@/components/activity-event-row";
import { ActivityEvent, useActivityFeed } from "@/hooks/use-activity-feed";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";

const musicFiles = [
  "/music/stranger-things-124008.mp3",
  "/music/jungle-ish-beat-for-video-games-314073.mp3",
  "/music/pixelate-pixelated-dreams-313358.mp3",
  "/music/on-the-road-to-the-eighties_30sec-177565.mp3",
  "/music/pixel-fight-8-bit-arcade-music-background-music-for-video-208775.mp3",
  "/music/funny-bgm-240795.mp3",
];

// Modify the global loadProfileImagesForPiP function to use an image cache
// Add at the top, outside of the component
const imageCache = new Map<string, HTMLImageElement>();

export default function ActivityIndex() {
  const { events, isLoading, mutate } = useActivityFeed();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [pipAttempting, setPipAttempting] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showControls, setShowControls] = useState(false);

  // Simple refs to track state without re-renders
  const eventsRef = useRef<ActivityEvent[] | undefined>(events);
  const currentTrackRef = useRef<number>(currentTrack);
  const isMounted = useRef(true);

  // Add state to track track loading
  const [isTrackLoading, setIsTrackLoading] = useState(false);

  // Update refs when state changes
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Basic setup effect
  useEffect(() => {
    isMounted.current = true;
    setIsPiPSupported(document.pictureInPictureEnabled);

    return () => {
      isMounted.current = false;
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(console.error);
      }
    };
  }, []);

  // Setup PiP video and canvas once on mount
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    // Improve quality by increasing dimensions
    canvas.width = 640; // Double the size for better quality
    canvas.height = 480;

    // Draw initial canvas
    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: false, // Better quality
      willReadFrequently: false,
    });
    if (!ctx) return;

    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw static content
    drawActivityFeedToCanvas(ctx, eventsRef.current, currentTrackRef.current);

    // Create a persistent stream with higher quality
    const stream = canvas.captureStream(5); // Higher framerate for better quality

    // Add silent audio to keep stream alive - use a proper silent audio track
    try {
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Create a silent buffer instead of an oscillator
      const frameCount = audioCtx.sampleRate * 2.0; // 2 seconds of silence
      const silentBuffer = audioCtx.createBuffer(
        1, // Single channel
        frameCount,
        audioCtx.sampleRate
      );

      // Fill the buffer with zeros (complete silence)
      const outputBuffer = silentBuffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        outputBuffer[i] = 0.0;
      }

      // Create a buffer source node
      const silentSource = audioCtx.createBufferSource();
      silentSource.buffer = silentBuffer;
      silentSource.loop = true; // Loop the silent buffer

      // Create media stream destination
      const audioDestination = audioCtx.createMediaStreamDestination();
      silentSource.connect(audioDestination);

      // Start the silent source
      silentSource.start();

      // Add the silent audio track to stream
      const audioTrack = audioDestination.stream.getAudioTracks()[0];
      stream.addTrack(audioTrack);
    } catch (e) {
      console.warn("Couldn't add silent audio track:", e);
    }

    // Assign stream to video
    video.srcObject = stream;
    video.muted = true;
    video.play().catch(console.error);

    // Handle PiP changes
    video.addEventListener("enterpictureinpicture", () => {
      setIsPiPActive(true);
    });

    video.addEventListener("leavepictureinpicture", () => {
      setIsPiPActive(false);
    });

    // Active polling for new data when in PiP mode
    const updateInterval = setInterval(() => {
      if (ctx && isMounted.current && isPiPActive) {
        // Actively fetch new events when in PiP mode
        mutate().then(() => {
          // After mutate completes, redraw with the latest data
          drawActivityFeedToCanvas(
            ctx,
            eventsRef.current,
            currentTrackRef.current
          );
        });
      } else if (ctx && isMounted.current) {
        // Just redraw with current data when not in PiP
        drawActivityFeedToCanvas(
          ctx,
          eventsRef.current,
          currentTrackRef.current
        );
      }
    }, 10000); // Check for updates every 10 seconds

    return () => {
      clearInterval(updateInterval);

      if (video.srcObject) {
        const videoStream = video.srcObject as MediaStream;
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mutate, isPiPActive]);

  // Auto-enter PiP when user leaves the page
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "hidden" &&
        isPiPSupported &&
        !isPiPActive &&
        !pipAttempting &&
        videoRef.current
      ) {
        try {
          setPipAttempting(true);
          // Make sure video is playing
          if (videoRef.current.paused) {
            await videoRef.current.play();
          }
          await videoRef.current.requestPictureInPicture();
        } catch (error) {
          console.error("Auto PiP error:", error);
        } finally {
          setPipAttempting(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPiPSupported, isPiPActive, pipAttempting]);

  // Simple function to draw activity feed to canvas
  const drawActivityFeedToCanvas = (
    ctx: CanvasRenderingContext2D,
    currentEvents?: ActivityEvent[],
    currentTrack = 0
  ) => {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    // Higher quality rendering with better scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Scaling factor for higher resolution
    const scale = width / 320; // Base on original 320px width

    // Clear and fill background
    ctx.fillStyle = "#27213C";
    ctx.fillRect(0, 0, width, height);

    // Draw title
    ctx.fillStyle = "#FF6B35";
    ctx.font = `bold ${20 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Activity Feed", width / 2, 25 * scale);

    // Draw divider
    ctx.fillRect(20 * scale, 35 * scale, width - 40 * scale, 2 * scale);

    // Draw now playing - more compact
    const trackName = musicFiles[currentTrack]
      .split("/")
      .pop()
      ?.replace(".mp3", "");
    ctx.fillStyle = "#ffffff";
    ctx.font = `${12 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("Now Playing:", 20 * scale, 55 * scale);
    ctx.fillStyle = "#FF6B35";
    ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(trackName || "", 20 * scale, 70 * scale);

    // Draw activity section title - more compact
    ctx.fillStyle = "#ffffff";
    ctx.font = `${12 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("Recent Activity:", 20 * scale, 90 * scale);

    // Draw activities - show more and more compact
    if (currentEvents && currentEvents.length > 0) {
      const recentEvents = currentEvents.slice(0, 6); // Show 6 instead of 3
      recentEvents.forEach((event, i) => {
        // Reduce vertical spacing (40px per item instead of 55px)
        const yPos = (105 + i * 40) * scale;

        // Profile circle - smaller
        ctx.beginPath();
        ctx.arc(28 * scale, yPos - 2 * scale, 12 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#FF6B35";
        ctx.fill();

        // Draw username - smaller
        ctx.fillStyle = "#FF6B35";
        ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
        ctx.fillText(`@${event.player.username}`, 48 * scale, yPos);

        // Draw description - smaller but more content
        ctx.fillStyle = "#ffffff";
        ctx.font = `${9 * scale}px system-ui, -apple-system, sans-serif`;
        // Show more characters before truncation (50 instead of 25)
        const desc =
          event.description.length > 50
            ? event.description.substring(0, 50) + "..."
            : event.description;
        ctx.fillText(desc, 48 * scale, yPos + 14 * scale);

        // Draw time - smaller
        const timeAgo = dayjs.unix(event.eventTime).fromNow();
        ctx.fillStyle = "#aaaaaa";
        ctx.font = `${8 * scale}px system-ui, -apple-system, sans-serif`;
        ctx.fillText(timeAgo, 48 * scale, yPos + 25 * scale);

        // Draw divider - thinner
        ctx.strokeStyle = "#FF6B35";
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 0.5 * scale;
        ctx.beginPath();
        ctx.moveTo(20 * scale, yPos + 31 * scale);
        ctx.lineTo(width - 20 * scale, yPos + 31 * scale);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Try to load profile image if available - smaller size
        if (event.player.pfp) {
          loadAndDrawHQProfileImage(ctx, event.player.pfp, yPos, scale, true);
        }
      });
    } else {
      // Draw empty state
      const yPos = 150 * scale;
      ctx.fillStyle = "#ffffff";
      ctx.font = `${12 * scale}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        isLoading ? "Loading activity stream..." : "No recent activities",
        width / 2,
        yPos
      );
    }
  };

  // Improved helper for high-quality profile images
  const loadAndDrawHQProfileImage = (
    ctx: CanvasRenderingContext2D,
    pfpUrl: string,
    yPos: number,
    scale: number = 1,
    compact: boolean = false
  ) => {
    // Check cache first
    if (imageCache.has(pfpUrl)) {
      const img = imageCache.get(pfpUrl)!;
      drawHQProfileImage(ctx, img, yPos, scale, compact);
      return;
    }

    // Load new image with higher quality
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(pfpUrl, img);
      drawHQProfileImage(ctx, img, yPos, scale, compact);
    };
    img.src = pfpUrl;
  };

  // Higher quality profile image drawing
  const drawHQProfileImage = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    yPos: number,
    scale: number = 1,
    compact: boolean = false
  ) => {
    try {
      // Different sizes for compact mode
      const circleX = compact ? 28 * scale : 30 * scale;
      const circleY = compact ? yPos - 2 * scale : yPos - 5 * scale;
      const radius = compact ? 12 * scale : 16 * scale;
      const innerRadius = compact ? 11 * scale : 15 * scale;
      const imgX = compact ? 16 * scale : 15 * scale;
      const imgY = compact ? yPos - 14 * scale : yPos - 20 * scale;
      const imgSize = compact ? 24 * scale : 30 * scale;

      // Draw a better circular avatar with anti-aliasing
      ctx.save();

      // Draw circle background first
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#FF6B35";
      ctx.fill();

      // Then clip and draw the image
      ctx.beginPath();
      ctx.arc(circleX, circleY, innerRadius, 0, Math.PI * 2);
      ctx.clip();

      // Draw the image with proper dimensions
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);

      // Add a subtle border for better visibility
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.arc(circleX, circleY, innerRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    } catch (e) {
      console.error("Error drawing profile image to canvas:", e);
    }
  };

  // Simple clean PiP toggle
  const togglePiP = async () => {
    try {
      if (pipAttempting) return;
      setPipAttempting(true);

      const video = videoRef.current;
      if (!video) return;

      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else {
        // Make sure video is playing before requesting PiP
        if (video.paused) {
          await video.play();
        }

        // Request PiP directly from user gesture
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP error:", error);
    } finally {
      setPipAttempting(false);
    }
  };

  const playPauseAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsTrackLoading(true);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsTrackLoading(false);
        })
        .catch((err) => {
          console.error("Audio play error:", err);
          setIsPlaying(false);
          setIsTrackLoading(false);
        });
    }
  };

  // Wrap changeTrack with useCallback to prevent recreation on each render
  const changeTrack = useCallback(
    async (next = true) => {
      if (!audioRef.current || isTrackLoading) return;

      try {
        setIsTrackLoading(true);

        // Pause current track properly
        const wasPlaying = !audioRef.current.paused;
        audioRef.current.pause();

        // Calculate new track index
        const newTrack = next
          ? (currentTrack + 1) % musicFiles.length
          : (currentTrack - 1 + musicFiles.length) % musicFiles.length;

        // Update state
        setCurrentTrack(newTrack);

        // Change the source
        audioRef.current.src = musicFiles[newTrack];

        // If it was playing before, play the new track after a small delay
        if (wasPlaying) {
          // Wait for src to be properly loaded
          audioRef.current.load();

          // Wait a moment for the browser to process the new source
          await new Promise((resolve) => setTimeout(resolve, 100));

          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (e) {
            console.error("Failed to auto-play next track:", e);
            setIsPlaying(false);
          }
        }
      } catch (error) {
        console.error("Error changing tracks:", error);
      } finally {
        setIsTrackLoading(false);
      }
    },
    [currentTrack, isTrackLoading, musicFiles.length]
  );

  // Set up audio listeners for continuous playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log("Setting up audio event listeners for continuous playback");

    // Handle track ended - move to next track
    const handleTrackEnded = () => {
      console.log("Track ended event fired, moving to next track");
      
      // Force play next track regardless of current state
      const nextTrackIndex = (currentTrack + 1) % musicFiles.length;
      setCurrentTrack(nextTrackIndex);
      
      // Small timeout to ensure state is updated
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = musicFiles[nextTrackIndex];
          audioRef.current.load();
          
          // Force play after a short delay
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => {
                  console.error("Auto-play failed after track ended:", e);
                  setIsPlaying(false);
                });
            }
          }, 150);
        }
      }, 50);
    };

    // Handle audio errors
    const handleAudioError = (e: ErrorEvent) => {
      console.error("Audio error occurred:", e);

      // Try to recover by moving to next track after a delay
      setTimeout(() => {
        if (isPlaying) {
          const nextTrackIndex = (currentTrack + 1) % musicFiles.length;
          setCurrentTrack(nextTrackIndex);
          
          if (audioRef.current) {
            audioRef.current.src = musicFiles[nextTrackIndex];
            audioRef.current.load();
            audioRef.current.play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          }
        }
      }, 1000);
    };

    // Add event listeners
    audio.addEventListener("ended", handleTrackEnded);
    audio.addEventListener("error", handleAudioError as EventListener);

    return () => {
      // Clean up
      audio.removeEventListener("ended", handleTrackEnded);
      audio.removeEventListener("error", handleAudioError as EventListener);
    };
  }, [currentTrack, isPlaying, musicFiles]); // Include dependencies for the inline functions

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  return (
    <div className="h-full bg-[#27213C] text-white p-4" ref={containerRef}>
      {/* Hidden video element for PiP */}
      <video
        ref={videoRef}
        className="hidden"
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={() => console.log("Video metadata loaded")}
      />

      {/* Hidden canvas for drawing PiP content */}
      <canvas ref={canvasRef} width="320" height="240" className="hidden" />

      <div className="mb-6 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-[#FF6B35]">Activity Feed</h1>
        <p className="text-sm text-gray-300 mt-1">
          Listen to music while browsing activities
        </p>
      </div>

      {/* PiP and Music Controls */}
      <div className="bg-[#1E1A2E] rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#FF6B35]">Music Player</h2>
          <button
            onClick={() => setShowControls(!showControls)}
            className="text-white hover:text-[#FF6B35] text-sm"
          >
            {showControls ? "Hide Controls" : "Show Controls"}
          </button>
        </div>

        {showControls && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <button
                onClick={() => changeTrack(false)}
                className="bg-[#333] hover:bg-[#444] text-white p-2 rounded"
              >
                ⏮ Prev
              </button>

              <button
                onClick={playPauseAudio}
                className="bg-[#FF6B35] hover:bg-[#FF8255] text-white px-4 py-2 rounded"
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>

              <button
                onClick={() => changeTrack(true)}
                className="bg-[#333] hover:bg-[#444] text-white p-2 rounded"
              >
                Next ⏭
              </button>
            </div>

            <div className="flex items-center">
              <span className="mr-2 text-sm">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full"
                style={{ accentColor: "#FF6B35" }}
              />
            </div>

            <div className="text-center text-sm text-gray-400 mt-2">
              Now playing:{" "}
              {musicFiles[currentTrack].split("/").pop()?.replace(".mp3", "")}
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={togglePiP}
            disabled={!isPiPSupported || pipAttempting}
            className={`px-4 py-2 rounded-lg flex items-center justify-center mx-auto ${
              !isPiPSupported
                ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                : pipAttempting
                ? "bg-[#FF8255] text-white cursor-wait"
                : "bg-[#FF6B35] hover:bg-[#FF8255] text-white"
            }`}
          >
            {pipAttempting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                <span>Starting PiP...</span>
              </>
            ) : isPiPActive ? (
              "Exit Picture-in-Picture"
            ) : (
              "Open in Picture-in-Picture"
            )}
          </button>

          {!isPiPSupported && (
            <p className="text-xs text-gray-400 mt-2">
              Your browser doesn't support Picture-in-Picture mode
            </p>
          )}
        </div>

        {/* Audio element */}
        <audio
          ref={audioRef}
          src={musicFiles[currentTrack]}
          preload="auto"
          className="hidden"
        />
      </div>

      {/* Activity Feed */}
      <div className="bg-[#1E1A2E] rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#FF6B35]">
            Recent Activities
          </h2>
          {isLoading && (
            <div className="inline-flex items-center">
              <div className="animate-spin h-4 w-4 border-2 border-[#FF6B35] rounded-full border-t-transparent mr-2"></div>
              <span className="text-xs text-gray-400">Updating...</span>
            </div>
          )}
        </div>

        <div className="space-y-1 max-h-[calc(100vh-360px)] overflow-y-auto">
          {events && events.length > 0 ? (
            events.map((event, index) => (
              <ActivityEventRow index={index} key={index} event={event} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-[#2A2440] flex items-center justify-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#FF6B35]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-center">
                {isLoading
                  ? "Loading activity stream..."
                  : "No recent activities to display yet"}
              </p>
              <p className="text-gray-600 text-xs mt-2 text-center">
                Activities will appear here as they happen
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Engagement Suggestions */}
      <div className="mt-6 bg-[#1E1A2E] rounded-lg p-4">
        <h2 className="text-xl font-bold text-[#FF6B35] mb-2">Suggestions</h2>
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
          <li>
            Keep the Activity Feed open in PiP while you browse other sites
          </li>
          <li>Share your favorite activities with friends</li>
          <li>Create a custom playlist for different moods</li>
          <li>Check back daily for new activities</li>
        </ul>
      </div>
    </div>
  );
}
