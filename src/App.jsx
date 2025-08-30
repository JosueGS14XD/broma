import React, { useMemo, useRef, useState, useEffect } from "react";

// ================== Posición fija ==================
const UI = { leftPct: 34.3, topPct: 16.6, widthPct: 29.8, rotation: 12.6 };
// ===================================================

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export default function App({ imageUrl = "/face.jpg" }) {
  const containerRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // --- Estado juego ---
  const [cells, setCells] = useState(Array(9).fill(""));
  const [turn, setTurn] = useState("X");

  // --- Audio ---
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [metaReady, setMetaReady] = useState(false);

  // Al cargar metadata, adelantamos a 27s
  const onLoadedMetadata = () => {
    setMetaReady(true);
    const a = audioRef.current;
    if (a) a.currentTime = 27;
  };

  // Intento autoplay
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const tryPlay = async () => {
      try {
        if (a.readyState >= 1 && a.currentTime < 27) a.currentTime = 27;
        await a.play();
        setIsPlaying(true);
        setNeedsUnlock(false);
      } catch {
        setNeedsUnlock(true);
      }
    };
    tryPlay();
  }, []);

  // Si bloqueado, cualquier clic desbloquea
  useEffect(() => {
    if (!needsUnlock) return;
    const a = audioRef.current;
    if (!a) return;

    const unlock = async () => {
      try {
        if (metaReady && a.currentTime < 27) a.currentTime = 27;
        await a.play();
        setIsPlaying(true);
        setNeedsUnlock(false);
        remove();
      } catch {}
    };

    const events = ["pointerdown", "touchstart", "keydown"];
    const remove = () => events.forEach(ev => document.removeEventListener(ev, unlock));
    events.forEach(ev => document.addEventListener(ev, unlock, { once: true }));

    return remove;
  }, [needsUnlock, metaReady]);

  const toggleMusic = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      if (metaReady && a.currentTime < 27) a.currentTime = 27;
      try {
        await a.play();
        setIsPlaying(true);
      } catch {
        setNeedsUnlock(true);
      }
    }
  };

  const winner = useMemo(() => {
    for (const [a, b, c] of WIN_LINES) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
        return { p: cells[a], line: [a, b, c] };
      }
    }
    return null;
  }, [cells]);

  const isDraw = useMemo(() => !winner && cells.every(c => c !== ""), [cells, winner]);

  function play(i) {
    if (winner || cells[i]) return;
    setCells(prev => {
      const next = [...prev];
      next[i] = turn;
      return next;
    });
    setTurn(t => (t === "X" ? "O" : "X"));
  }

  function reset() { setCells(Array(9).fill("")); setTurn("X"); }

  // Posición tablero
  const boardRect = useMemo(() => {
    const w = containerRef.current?.clientWidth ?? 0;
    const h = containerRef.current?.clientHeight ?? 0;
    const size = (UI.widthPct / 100) * w;
    const left = (UI.leftPct / 100) * w;
    const top = (UI.topPct / 100) * h;
    return { left, top, size };
  }, [containerRef.current?.clientWidth, containerRef.current?.clientHeight, imgLoaded]);

  // Línea ganadora
  const cellCenters = useMemo(() => {
    const s = boardRect.size, step = s / 3, centers = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        centers.push({ x: boardRect.left + c * step + step / 2, y: boardRect.top + r * step + step / 2 });
      }
    }
    return centers;
  }, [boardRect]);

  const winLineStyle = useMemo(() => {
    if (!winner) return undefined;
    const [a, , c] = winner.line;
    const p1 = cellCenters[a];
    const p2 = cellCenters[c];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return {
      position: "absolute", left: p1.x, top: p1.y, width: length, height: 6,
      background: "rgba(255,255,255,0.95)", boxShadow: "0 0 12px rgba(0,0,0,0.6)",
      borderRadius: 9999, transform: `rotate(${angle}deg) translateY(-50%)`,
      transformOrigin: "left center", zIndex: 40,
    };
  }, [winner, cellCenters]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-900 text-white p-4">
      {/* Audio */}
      <audio
        ref={audioRef}
        src="/musica.mp3"
        loop
        preload="auto"
        playsInline
        onLoadedMetadata={onLoadedMetadata}
      />

      {/* Botones de audio */}
      <div className="fixed bottom-2 right-2 z-50 flex gap-2">
        <button
          onClick={toggleMusic}
          className="px-3 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-white/90"
        >
          {isPlaying ? "⏸️ Pausar" : "▶️ Reproducir"}
        </button>
        {needsUnlock && (
          <button
            onClick={toggleMusic}
            className="px-3 py-2 rounded-xl text-sm font-medium bg-amber-400 text-black hover:bg-amber-300"
          >
            🔓 Activar sonido
          </button>
        )}
      </div>

      <div className="w-full max-w-[900px]">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-semibold">3 en raya sobre la frente</h1>
          <button onClick={reset} className="px-3 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-white/90">
            Reiniciar
          </button>
        </header>

        <div
          ref={containerRef}
          className="relative w-full rounded-3xl overflow-hidden shadow-2xl"
          style={{ aspectRatio: "557/629" }}
        >
          <img
            src={imageUrl}
            alt="Rostro para jugar 3 en raya en la frente"
            className="w-full h-full object-cover select-none"
            onLoad={() => setImgLoaded(true)}
            draggable={false}
          />

          {/* Tablero */}
          <div
            className="absolute grid grid-cols-3 grid-rows-3"
            style={{
              left: boardRect.left,
              top: boardRect.top,
              width: boardRect.size,
              height: boardRect.size,
              transform: `rotate(${UI.rotation}deg)`,
              transformOrigin: "center",
              zIndex: 30,
            }}
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <Cell key={i} value={cells[i]} onClick={() => play(i)} />
            ))}
          </div>

          {winner && <div style={winLineStyle} />}

          <div className="absolute top-2 left-2 z-40 bg-black/60 backdrop-blur px-3 py-2 rounded-xl text-sm">
            {!winner && !isDraw && <span>Turno: <b>{turn}</b></span>}
            {winner && <span>Ganó: <b>{winner.p}</b></span>}
            {isDraw && <span>Empate 🤝</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative border border-white/70 active:scale-[0.98] transition-transform flex items-center justify-center select-none"
      style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.45))" }}
    >
      <span
        className="text-[min(11vw,68px)] sm:text-[56px] font-extrabold drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
        style={{ letterSpacing: 4 }}
      >
        {value}
      </span>
    </button>
  );
}
