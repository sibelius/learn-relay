import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: 'linear-gradient(135deg, #FF8A3D, #E85D00)' }}>
        <svg viewBox='0 0 64 64' width='180' height='180'>
          <path d='M18 20 H34 C42 20 42 32 34 32 H30 C22 32 22 44 30 44 H46' fill='none' stroke='#fff' strokeWidth='4.5' strokeLinecap='round' />
          <circle cx='18' cy='20' r='6' fill='#fff' />
          <circle cx='46' cy='44' r='6' fill='#fff' />
        </svg>
      </div>
    ),
    size,
  );
}
