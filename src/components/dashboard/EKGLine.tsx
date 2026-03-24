export function EKGLine() {
  const ekgPath =
    'M0 65 L45 65 Q60 58 75 65 L105 65 L125 65 L140 18 L155 78 L185 65 Q210 55 230 65 L250 65 ' +
    'M250 65 L295 65 Q310 58 325 65 L355 65 L375 65 L390 18 L405 78 L435 65 Q460 55 480 65 L500 65 ' +
    'M500 65 L545 65 Q560 58 575 65 L605 65 L625 65 L640 18 L655 78 L685 65 Q710 55 730 65 L750 65 ' +
    'M750 65 L795 65 Q810 58 825 65 L855 65 L875 65 L890 18 L905 78 L935 65 Q960 55 980 65 L1000 65';

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes ekg-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-25%); }
        }
      `}</style>
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        style={{ filter: 'drop-shadow(0 0 4px #00e5ff)' }}
      >
        <g
          style={{
            animation: 'ekg-scroll var(--beat-duration, 0.6s) linear infinite',
            transformOrigin: 'center',
            willChange: 'transform',
          }}
        >
          <path d={ekgPath} fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.15" />
        </g>
      </svg>
    </div>
  );
}
