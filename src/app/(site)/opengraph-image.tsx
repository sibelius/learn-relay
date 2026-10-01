import { ImageResponse } from 'next/og';

export const alt = 'Learn Relay: an interactive Relay workshop in your browser';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const Mark = ({ s = 96 }: { s?: number }) => (
  <div style={{ width: s, height: s, borderRadius: s * 0.22, display: 'flex', background: 'linear-gradient(135deg, #FF8A3D, #E85D00)' }}>
    <svg viewBox='0 0 64 64' width={s} height={s}>
      <path d='M18 20 H34 C42 20 42 32 34 32 H30 C22 32 22 44 30 44 H46' fill='none' stroke='#fff' strokeWidth='4.5' strokeLinecap='round' />
      <circle cx='18' cy='20' r='6' fill='#fff' />
      <circle cx='46' cy='44' r='6' fill='#fff' />
    </svg>
  </div>
);

const code = [
  [['#4d9375', 'const '], ['#bd976a', 'post'], ['#666', ' = '], ['#80a665', 'useFragment'], ['#666', '(']],
  [['#80a665', '  graphql'], ['#c98a7d', '`']],
  [['#4d9375', '    fragment '], ['#bd976a', 'Post_post'], ['#4d9375', ' on '], ['#5da994', 'Post'], ['#666', ' {']],
  [['#bd976a', '      content']],
  [['#bd976a', '      author'], ['#666', ' { '], ['#bd976a', 'name'], ['#666', ' }']],
  [['#666', '    }']],
  [['#c98a7d', '  `'], ['#666', ', '], ['#bd976a', 'props'], ['#666', '.'], ['#bd976a', 'post'], ['#666', ',']],
  [['#666', ');']],
];

// satori needs ttf/otf fonts: the css2 api returns ttf urls for non browser user agents
const loadFont = async (family: string, weight: number) => {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`font not found: ${family}`);
  return (await fetch(url)).arrayBuffer();
};

export default async function OpengraphImage() {
  const [regular, bold, mono] = await Promise.all([loadFont('Geist', 400), loadFont('Geist', 800), loadFont('JetBrains Mono', 400)]);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'radial-gradient(circle at 20% 0%, rgba(242,107,0,.35), transparent 55%), #0b0d12',
          padding: 72,
          fontFamily: 'Geist',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Mark s={72} />
            <div style={{ color: '#fafafa', fontSize: 36, fontWeight: 800 }}>Learn Relay</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 70, color: '#fafafa', fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            <div style={{ display: 'flex' }}>
              Learn&nbsp;<span style={{ color: '#F26B00' }}>Relay</span>
            </div>
            <div>by solving problems.</div>
          </div>
          <div style={{ marginTop: 32, color: '#a1a1aa', fontSize: 30, maxWidth: 560, lineHeight: 1.35 }}>
            Hands-on exercises that run 100% in your browser, with the real Relay compiler.
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'center',
            width: 470,
            background: '#11141b',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 20,
            padding: '28px 30px',
            fontSize: 21,
            lineHeight: 1.6,
            fontFamily: 'JetBrains Mono',
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: 99, background: 'rgba(255,255,255,.15)' }} />
            ))}
          </div>
          {code.map((line, i) => (
            <div key={i} style={{ display: 'flex', whiteSpace: 'pre' }}>
              {line.map(([color, text], j) => (
                // satori collapses spaces inside spans, so spaces become margins (JetBrains Mono advance ≈ 0.6em)
                <div
                  key={j}
                  style={{ display: 'flex', flexShrink: 0, color, marginLeft: `${(text.length - text.trimStart().length) * 0.6}em`, marginRight: `${(text.length - text.trimEnd().length) * 0.6}em` }}
                >
                  {text.trim()}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Geist', data: regular, weight: 400, style: 'normal' },
        { name: 'Geist', data: bold, weight: 800, style: 'normal' },
        { name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
      ],
    },
  );
}
