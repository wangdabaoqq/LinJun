import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  Volume2,
  VolumeX,
  ArrowRight,
  Activity,
  Terminal,
  Shield,
} from "lucide-react";
import { useTranslations } from "@renderer/stores/settings";
import guideAudio from "@renderer/assets/guide.mp3";

interface IntroPageProps {
  onComplete: () => void;
}

// Animated gradient background as fallback
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/50 to-slate-900" />

      {/* Animated gradient blobs */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{
          x: ["-20%", "10%", "-20%"],
          y: ["-10%", "20%", "-10%"],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute right-0 w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(147,197,253,0.5) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
        animate={{
          x: ["10%", "-20%", "10%"],
          y: ["20%", "-10%", "20%"],
          scale: [1.2, 1, 1.2],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 w-[700px] h-[700px] rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
        animate={{
          x: ["-10%", "20%", "-10%"],
          y: ["10%", "-20%", "10%"],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Ocean wave effect lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(147,197,253,0)" />
            <stop offset="50%" stopColor="rgba(147,197,253,0.3)" />
            <stop offset="100%" stopColor="rgba(147,197,253,0)" />
          </linearGradient>
        </defs>
        {[...Array(5)].map((_, i) => (
          <motion.path
            key={i}
            d={`M 0 ${300 + i * 80} Q 400 ${250 + i * 80} 800 ${300 + i * 80} T 1600 ${300 + i * 80}`}
            stroke="url(#waveGradient)"
            strokeWidth="2"
            fill="none"
            animate={{
              d: [
                `M 0 ${300 + i * 80} Q 400 ${250 + i * 80} 800 ${300 + i * 80} T 1600 ${300 + i * 80}`,
                `M 0 ${300 + i * 80} Q 400 ${350 + i * 80} 800 ${300 + i * 80} T 1600 ${300 + i * 80}`,
                `M 0 ${300 + i * 80} Q 400 ${250 + i * 80} 800 ${300 + i * 80} T 1600 ${300 + i * 80}`,
              ],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function IntroPage({ onComplete }: IntroPageProps) {
  const t = useTranslations();
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // Controls when the content starts showing (after video solo play)
  const CONTENT_START_DELAY = 3.0;

  // Dynamically import video - gracefully fallback if file doesn't exist
  useEffect(() => {
    import("@renderer/assets/guide.mp4")
      .then((mod) => {
        setVideoSrc(mod.default);
      })
      .catch(() => {
        console.log("Video file not found, using fallback animation");
        setVideoError(true);
      });
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (muted) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log("Auto-play prevented:", error);
            setMuted(true);
          });
        }
      }
    }
  }, [muted]);

  const toggleMute = () => {
    setMuted(!muted);
  };

  const handleVideoLoaded = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = () => {
    console.error("Video failed to load");
    setVideoError(true);
  };

  const hasVideo = videoSrc !== null && !videoError;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-black text-white"
    >
      {/* Background - Video or Animated Fallback */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        {hasVideo ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: videoLoaded ? 1 : 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={handleVideoLoaded}
              onError={handleVideoError}
              className="w-full h-full object-cover scale-105"
            >
              <source src={videoSrc ?? undefined} type="video/mp4" />
            </video>
          </motion.div>
        ) : (
          <AnimatedBackground />
        )}

        {/* Gradient Overlays (temporarily disabled) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
        {/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" /> */}
      </div>

      {/* Main Content - Sequential Animation from Top to Bottom */}
      <div className="relative z-10 flex flex-col items-center max-w-4xl px-8 text-center">
        {/* 1. Title (LinJun) - Top position */}
        <motion.div
          initial={{ y: -60, opacity: 0, filter: "blur(10px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{
            duration: 1.2,
            delay: 3,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="mb-8"
        >
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-100 via-white to-blue-100 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            {t.app.name}
          </h1>
        </motion.div>

        {/* 2. Introduction / Description */}
        <motion.p
          initial={{ y: -40, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{
            duration: 1.0,
            delay: 6,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="text-base md:text-lg text-blue-100/80 tracking-wide font-light max-w-xl leading-relaxed mb-10"
        >
          {t.about.tagline}
        </motion.p>

        {/* 3. Feature Icons */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.9,
            delay: 9,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="flex space-x-12 py-4 mb-12"
        >
          {[
            { Icon: Terminal, label: "Proxy Core" },
            { Icon: Shield, label: "Secure" },
            { Icon: Activity, label: "Ready" },
          ].map(({ Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-3 group">
              <div className="p-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 group-hover:bg-white/10 transition-colors duration-300">
                <Icon size={20} className="text-blue-200/70" />
              </div>
              <span className="text-xs uppercase tracking-widest text-blue-200/50">
                {label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* 4. Start Button - Bottom position */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.8,
            delay: 12,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <button
            onClick={onComplete}
            className="group relative px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-full backdrop-blur-md transition-all duration-500 flex items-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <span className="relative z-10 text-base font-medium tracking-wider text-white">
              进入
            </span>
            <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform text-blue-200" />
          </button>
        </motion.div>
      </div>

      {/* Audio Controls (Bottom Right) */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={toggleMute}
        className="absolute bottom-10 right-10 p-4 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white/70 hover:text-white transition-all border border-white/5 hover:border-white/20 z-20"
        title={muted ? "Unmute background music" : "Mute background music"}
      >
        {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </motion.button>

      {/* Audio Element */}
      <audio ref={audioRef} loop src={guideAudio} className="hidden" />

      {/* Hint for adding video */}
      {!hasVideo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5 }}
          className="absolute bottom-10 left-10 text-xs text-white/30 max-w-xs"
        >
          <p>
            Tip: Add a beach/ocean video to src/renderer/assets/guide-beach.mp4
            for enhanced experience
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
