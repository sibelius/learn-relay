// Learn Relay mark: data flowing between connected graph nodes
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox='0 0 64 64' className={className} aria-hidden='true'>
      <defs>
        <linearGradient id='lr-g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='#FF8A3D' />
          <stop offset='1' stopColor='#E85D00' />
        </linearGradient>
      </defs>
      <rect width='64' height='64' rx='14' fill='url(#lr-g)' />
      <path d='M18 20 H34 C42 20 42 32 34 32 H30 C22 32 22 44 30 44 H46' fill='none' stroke='#fff' strokeWidth='4.5' strokeLinecap='round' />
      <circle cx='18' cy='20' r='6' fill='#fff' />
      <circle cx='46' cy='44' r='6' fill='#fff' />
      <circle cx='32' cy='32' r='3.5' fill='#1a0b00' opacity='.35' />
    </svg>
  );
}
