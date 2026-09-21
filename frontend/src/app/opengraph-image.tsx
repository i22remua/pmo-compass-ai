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
        background: '#f7f7f2',
        color: '#282b28',
        fontFamily: 'sans-serif',
        borderTop: '4px solid #37624a',
      }}
    >
      <div style={{ display: 'flex', fontSize: 28, color: '#37624a' }}>
        AI-POWERED PMO WORKSPACE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, letterSpacing: -3 }}>
          PMO Compass AI
        </div>
        <div style={{ display: 'flex', fontSize: 34, color: '#454b44' }}>
          Your project, in order.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, fontSize: 24 }}>
        {['PMO documents', 'Risk intelligence', 'Project Copilot'].map((label) => (
          <div
            key={label}
            style={{
              display: 'flex',
              padding: '16px 22px',
              borderBottom: '1px solid #bbc0b4',
              borderRadius: 0,
            }}
          >
            {label}
          </div>
        ))}
      </div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 23, color: '#686e65' }}
      >
        <span>Built by Álvaro Redondo Muñoz</span>
        <span>Español / English</span>
      </div>
    </div>,
    size,
  );
}
