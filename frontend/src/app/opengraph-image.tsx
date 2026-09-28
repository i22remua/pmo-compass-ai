import { ImageResponse } from 'next/og';

export const alt = 'PMO Compass AI — PMO documents, risk intelligence and project Copilot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '64px 72px',
        background: '#f4f1e9',
        color: '#24251f',
        fontFamily: 'sans-serif',
        borderTop: '4px solid #b63c16',
      }}
    >
      <div style={{ display: 'flex', fontSize: 28, color: '#b63c16' }}>
        PMO / PROJECT DIRECTION SYSTEM
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, letterSpacing: -3 }}>
          PMO Compass AI
        </div>
        <div style={{ display: 'flex', fontSize: 34, color: '#404139' }}>
          Your project, in order.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, fontSize: 24 }}>
        {['01 / Context', '02 / Judgement', '03 / Document'].map((label) => (
          <div
            key={label}
            style={{
              display: 'flex',
              padding: '16px 22px',
              borderBottom: '1px solid #d2cfc4',
              borderRadius: 0,
            }}
          >
            {label}
          </div>
        ))}
      </div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 23, color: '#626358' }}
      >
        <span>Built by Álvaro Redondo Muñoz</span>
        <span>Español / English</span>
      </div>
    </div>,
    size,
  );
}
