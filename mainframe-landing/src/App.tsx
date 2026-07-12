import { useEffect, useRef, useState } from "react";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4";
const TYPE_TEXT =
  "Glad you stopped in. Good taste tends to find us. Now, what are we building?";
const SENSITIVITY = 0.8;

function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);

    let index = 0;
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          if (intervalId) {
            window.clearInterval(intervalId);
          }
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [startDelay, speed, text]);

  return { displayed, done };
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4.25" y="1.25" width="6.5" height="6.5" rx="1" stroke="currentColor" />
      <rect x="1.25" y="4.25" width="6.5" height="6.5" rx="1" stroke="currentColor" />
    </svg>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const { displayed, done } = useTypewriter(TYPE_TEXT);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const prevXRef = useRef<number | null>(null);
  const seekingRef = useRef(false);
  const targetTimeRef = useRef(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActionsVisible(true);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
        prevXRef.current = event.clientX;
        return;
      }

      if (prevXRef.current === null) {
        prevXRef.current = event.clientX;
        return;
      }

      const delta = event.clientX - prevXRef.current;
      prevXRef.current = event.clientX;

      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      const nextTime = Math.max(0, Math.min(video.duration, targetTimeRef.current + offset));
      targetTimeRef.current = nextTime;

      if (!seekingRef.current && Math.abs(video.currentTime - nextTime) > 0.01) {
        seekingRef.current = true;
        video.currentTime = nextTime;
      }
    };

    const handleMouseLeave = () => {
      prevXRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    seekingRef.current = false;
    if (Math.abs(video.currentTime - targetTimeRef.current) > 0.01) {
      seekingRef.current = true;
      video.currentTime = targetTimeRef.current;
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    targetTimeRef.current = Math.max(0, Math.min(video.duration, video.currentTime));
  };

  const navItems = ["Labs", "Studio", "Openings", "Shop"];

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-black">
      <video
        ref={videoRef}
        className="fixed inset-0 z-0 h-full w-full object-cover"
        style={{ objectPosition: "70% center" }}
        src={VIDEO_URL}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={handleSeeked}
      />

      <header className="fixed inset-x-0 top-0 z-10">
        <div className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
          <a className="flex items-center gap-3 text-black" href="/">
            <span
              className="text-[21px] tracking-tight sm:text-[26px]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Mainframe®
            </span>
            <span
              className="select-none text-[25px] sm:text-[30px]"
              style={{ letterSpacing: "-0.02em" }}
            >
              ✳︎
            </span>
          </a>

          <nav className="hidden text-[23px] text-black md:flex">
            {navItems.map((item, index) => (
              <span key={item}>
                <a className="transition-opacity hover:opacity-60" href={`#${item.toLowerCase()}`}>
                  {item}
                </a>
                {index < navItems.length - 1 ? ", " : ""}
              </span>
            ))}
          </nav>

          <a
            className="hidden text-[23px] text-black underline underline-offset-2 transition-opacity hover:opacity-60 md:block"
            href="mailto:hello@mainframe.co"
          >
            Get in touch
          </a>

          <button
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
            className="relative z-10 flex flex-col gap-[5px] md:hidden"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span
              className={`h-[2px] w-6 bg-black transition duration-300 ${
                menuOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`h-[2px] w-6 bg-black transition duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`h-[2px] w-6 bg-black transition duration-300 ${
                menuOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[9] flex flex-col items-start justify-center gap-8 bg-white/95 px-8 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {navItems.map((item) => (
          <a
            key={item}
            className="text-[32px] font-medium text-black transition-opacity hover:opacity-60"
            href={`#${item.toLowerCase()}`}
            onClick={() => setMenuOpen(false)}
          >
            {item}
          </a>
        ))}
        <a
          className="text-[32px] font-medium text-black underline underline-offset-2 transition-opacity hover:opacity-60"
          href="mailto:hello@mainframe.co"
          onClick={() => setMenuOpen(false)}
        >
          Get in touch
        </a>
      </div>

      <main className="relative z-[1] flex h-screen flex-col justify-end overflow-hidden px-5 pb-12 sm:px-8 md:justify-center md:px-10 md:pb-0">
        <div className="relative z-10 max-w-xl">
          <p
            className="pointer-events-none mb-5 select-none whitespace-pre-line text-black sm:mb-6"
            style={{
              fontSize: "clamp(18px, 4vw, 26px)",
              lineHeight: 1.3,
              fontWeight: 400,
              filter: "blur(4px)"
            }}
          >
            {"Hey there, meet A.R.I.A,\nMainframe's Adaptive Response Interface Agent"}
          </p>

          <p
            className="mb-5 min-h-[54px] text-black sm:mb-6"
            style={{
              fontSize: "clamp(18px, 4vw, 26px)",
              lineHeight: 1.35,
              fontWeight: 400
            }}
          >
            {displayed}
            {!done ? (
              <span
                className="ml-[2px] inline-block h-[1.1em] w-[2px] align-middle bg-black"
                style={{ animation: "blink 1s step-end infinite" }}
              />
            ) : null}
          </p>

          <div
            className={`flex flex-wrap gap-y-1 transition-[opacity,transform] duration-[400ms] ease-out ${
              actionsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            {[
              "Pitch us an idea",
              "Come work here",
              "Send a brief hello",
              "See how we operate"
            ].map((label) => (
              <a
                key={label}
                className="mx-[0.2em] mb-[0.4em] inline-flex whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-[0.3em] text-[13px] text-black transition-colors duration-200 hover:bg-black hover:text-white sm:px-5 sm:text-[15px]"
                href="#"
              >
                {label}
              </a>
            ))}

            <button
              className="mx-[0.2em] mb-[0.4em] inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white bg-transparent px-4 py-[0.3em] text-[13px] text-white transition-colors duration-200 hover:bg-white hover:text-black sm:gap-3 sm:px-5 sm:text-[15px]"
              type="button"
              onClick={() => navigator.clipboard.writeText("hello@mainframe.co")}
            >
              <span>
                Reach us:{" "}
                <span className="underline underline-offset-1">hello@mainframe.co</span>
              </span>
              <CopyIcon />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
