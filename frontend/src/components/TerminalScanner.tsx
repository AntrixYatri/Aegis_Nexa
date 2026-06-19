import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const MOCK_HEX_STREAM = [
  "0x7A 0x8F 0x99 DEPLOY_VECTOR_ALPHA",
  "AWAITING Flipkart_Fleet_Handshake...",
  "OVERRIDE_AUTH: GRANTED",
  "CALCULATING SPATIOTEMPORAL DECAY...",
  "0x00 0xFF 0x1A NODE_ISOLATION_COMPLETE",
  "PIPING_DECK.GL_ARCLAYER_MATRICES"
];

export default function TerminalScanner() {
  const [stream, setStream] = useState<string[]>([]);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < MOCK_HEX_STREAM.length) {
        setStream((prev) => [...prev, MOCK_HEX_STREAM[currentIndex]]);
        currentIndex++;
      } else {
        // Reset stream to keep the terminal "alive"
        setStream([]);
        currentIndex = 0;
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-48 bg-black border-[1px] border-gray-800 p-4 font-mono text-[10px] sm:text-xs rounded-none">
      {/* Hardware-Accelerated CSS Scan Line Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-10 opacity-40 mix-blend-overlay"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400/50 blur-[2px] animate-[scan_2s_linear_infinite] z-20"></div>

      <div className="relative z-0 opacity-60 text-cyan-700 flex flex-col justify-end h-full">
        {stream.map((line, index) => (
          <motion.div
            key={`${line}-${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-1 tracking-widest"
          >
            &gt; {line}
          </motion.div>
        ))}
        <motion.div
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-2 h-3 bg-cyan-500 mt-1"
        />
      </div>
    </div>
  );
}