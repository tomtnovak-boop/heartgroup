import React from 'react';

interface SessionCodeOverlayProps {
  sessionCode: string | null;
  sessionStarted: boolean;
  participantCount: number;
}

export const SessionCodeOverlay: React.FC<SessionCodeOverlayProps> = ({
  sessionCode,
  sessionStarted,
  participantCount,
}) => {
  if (sessionStarted || !sessionCode) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at center, rgba(255,68,37,0.18) 0%, rgba(255,68,37,0.06) 30%, transparent 60%)',
        animation: 'sessionCodeFadeIn 0.6s ease-out',
      }}
    >
      <style>{`
        @keyframes sessionCodeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '6px',
          color: '#aaa',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}
      >
        Session Code
      </div>
      <div
        style={{
          fontSize: 'clamp(140px, 18vw, 280px)',
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.15em',
          lineHeight: 1,
          textShadow:
            '0 0 40px rgba(255,68,37,0.4), 0 0 80px rgba(255,68,37,0.2)',
          marginBottom: '24px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {sessionCode}
      </div>
      <div style={{ fontSize: '18px', color: '#888', fontWeight: 400 }}>
        Share this code with participants
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '32px',
          fontSize: '13px',
          color: '#555',
          letterSpacing: '1px',
        }}
      >
        {participantCount === 0
          ? 'Start a session to record history'
          : `${participantCount} ${
              participantCount === 1 ? 'participant' : 'participants'
            } in lobby`}
      </div>
    </div>
  );
};
