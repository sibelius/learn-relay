// @workshop/ui - a tiny design system used inside exercises (replaces rebass + material-ui of the original workshop)
import React, { useEffect, useState } from 'react';

export const theme = {
  relayOrange: '#F26B00',
  relayDark: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
  background: '#f6f7f9',
};

const CSS = `
.wui-root, .wui-root * { box-sizing: border-box; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: ${theme.relayDark}; background: ${theme.background}; font-size: 14px; }
.wui-content { max-width: 640px; margin: 0 auto; padding: 16px; }
.wui-card { background: #fff; border: 1px solid ${theme.border}; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
.wui-card-actions { display: flex; align-items: center; gap: 4px; }
.wui-button { appearance: none; border: 0; background: ${theme.relayOrange}; color: #fff; font-weight: 600; font-size: 14px; padding: 9px 16px; border-radius: 8px; cursor: pointer; transition: filter .15s, opacity .15s; font-family: inherit; }
.wui-button:hover { filter: brightness(1.08); }
.wui-button:disabled { opacity: .5; cursor: not-allowed; }
.wui-button.secondary { background: #fff; color: ${theme.relayDark}; border: 1px solid ${theme.border}; }
.wui-icon-button { appearance: none; border: 0; background: transparent; width: 36px; height: 36px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: ${theme.relayDark}; }
.wui-icon-button:hover { background: #f3f4f6; }
.wui-icon-button:disabled { opacity: .4; cursor: not-allowed; }
.wui-input { width: 100%; border: 1px solid ${theme.border}; border-radius: 8px; padding: 9px 12px; font-size: 14px; font-family: inherit; outline: none; background: #fff; }
.wui-input:focus { border-color: ${theme.relayOrange}; box-shadow: 0 0 0 3px rgba(242,107,0,.15); }
.wui-avatar { width: 36px; height: 36px; border-radius: 999px; background: linear-gradient(135deg, #F26B00, #ffa94d); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.wui-divider { height: 1px; background: ${theme.border}; border: 0; margin: 0; width: 100%; }
.wui-spinner { width: 28px; height: 28px; border-radius: 999px; border: 3px solid #fde3cc; border-top-color: ${theme.relayOrange}; animation: wui-spin .8s linear infinite; margin: 24px auto; }
@keyframes wui-spin { to { transform: rotate(360deg); } }
.wui-toasts { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; z-index: 9999; }
.wui-toast { background: ${theme.relayDark}; color: #fff; padding: 10px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.2); font-size: 14px; animation: wui-in .2s ease-out; }
@keyframes wui-in { from { opacity: 0; transform: translateY(8px); } }
.wui-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 8px; }
`;

let injected = false;
export const injectStyles = () => {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
};

type StyleProps = {
  m?: any; mt?: any; mb?: any; ml?: any; mr?: any; mx?: any; my?: any;
  p?: any; pt?: any; pb?: any; pl?: any; pr?: any; px?: any; py?: any;
  flex?: any; flexDirection?: any; alignItems?: any; justifyContent?: any; flexGrow?: any; flexWrap?: any; gap?: any;
  width?: any; height?: any; color?: any; backgroundColor?: any; bg?: any; fontSize?: any; fontWeight?: any; borderRadius?: any;
  textAlign?: any;
};

const STYLE_KEYS: Record<string, string | string[]> = {
  m: 'margin', mt: 'marginTop', mb: 'marginBottom', ml: 'marginLeft', mr: 'marginRight', mx: ['marginLeft', 'marginRight'], my: ['marginTop', 'marginBottom'],
  p: 'padding', pt: 'paddingTop', pb: 'paddingBottom', pl: 'paddingLeft', pr: 'paddingRight', px: ['paddingLeft', 'paddingRight'], py: ['paddingTop', 'paddingBottom'],
  flex: 'flex', flexDirection: 'flexDirection', alignItems: 'alignItems', justifyContent: 'justifyContent', flexGrow: 'flexGrow', flexWrap: 'flexWrap', gap: 'gap',
  width: 'width', height: 'height', color: 'color', backgroundColor: 'backgroundColor', bg: 'backgroundColor', fontSize: 'fontSize', fontWeight: 'fontWeight', borderRadius: 'borderRadius',
  textAlign: 'textAlign',
};

const SPACE = [0, 4, 8, 16, 32, 64];
const toCss = (key: string, value: any) => {
  if (typeof value === 'number' && key !== 'flex' && key !== 'flexGrow' && key !== 'fontWeight') {
    return /^(m|p)/.test(key) && Number.isInteger(value) && value < SPACE.length ? SPACE[value] : value;
  }
  return value;
};

const splitStyleProps = <T extends Record<string, any>>(props: T) => {
  const style: Record<string, any> = {};
  const rest: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    const cssKey = STYLE_KEYS[key];
    if (cssKey) {
      for (const k of Array.isArray(cssKey) ? cssKey : [cssKey]) style[k] = toCss(key, value);
    } else {
      rest[key] = value;
    }
  }
  return { style, rest };
};

type DivProps = React.HTMLAttributes<HTMLDivElement> & StyleProps;

export const Box = (props: DivProps) => {
  injectStyles();
  const { style, rest } = splitStyleProps(props);
  return <div {...rest} style={{ ...style, ...props.style }} />;
};

export const Flex = (props: DivProps) => {
  injectStyles();
  const { style, rest } = splitStyleProps(props);
  return <div {...rest} style={{ display: 'flex', ...style, ...props.style }} />;
};

export const Text = (props: React.HTMLAttributes<HTMLSpanElement> & StyleProps & { as?: any }) => {
  injectStyles();
  const { as: As = 'div', ...others } = props;
  const { style, rest } = splitStyleProps(others);
  return <As {...rest} style={{ ...style, ...props.style }} />;
};

export const Content = ({ children, ...props }: DivProps) => {
  injectStyles();
  const { style, rest } = splitStyleProps(props);
  return (
    <div className='wui-root wui-content' {...rest} style={style}>
      {children}
    </div>
  );
};

export const Card = ({ className = '', ...props }: DivProps) => {
  injectStyles();
  const { style, rest } = splitStyleProps(props);
  return <div {...rest} className={`wui-card ${className}`} style={{ ...style, ...props.style }} />;
};

export const CardActions = (props: DivProps) => {
  const { style, rest } = splitStyleProps(props);
  return <div {...rest} className='wui-card-actions' style={{ ...style, ...props.style }} />;
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & StyleProps & { variant?: 'primary' | 'secondary' };
export const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => {
  injectStyles();
  const { style, rest } = splitStyleProps(props);
  return <button {...rest} className={`wui-button ${variant === 'secondary' ? 'secondary' : ''} ${className}`} style={{ ...style, ...props.style }} />;
};

export const IconButton = (props: ButtonProps) => {
  injectStyles();
  const { style, rest } = splitStyleProps(props);
  return <button type='button' {...rest} className='wui-icon-button' style={{ ...style, ...props.style }} />;
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & StyleProps;
export const TextField = (props: InputProps) => {
  injectStyles();
  const { style, rest } = splitStyleProps(props);
  return <input {...rest} className='wui-input' style={{ ...style, ...props.style }} />;
};
// alias used in the original workshop
export const TextFieldMaterial = TextField;

export const Divider = () => <hr className='wui-divider' />;

export const Avatar = ({ children, ...props }: DivProps) => {
  injectStyles();
  return (
    <div className='wui-avatar' {...props}>
      {children}
    </div>
  );
};

export const Loading = () => {
  injectStyles();
  return <div className='wui-spinner' role='progressbar' aria-label='loading' />;
};

export const ErrorMessage = ({ children }: { children: React.ReactNode }) => <div className='wui-error'>{children}</div>;

const svg = (path: React.ReactNode) => {
  const Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor' {...props}>
      {path}
    </svg>
  );
  return Icon;
};

export const FavoriteIcon = svg(<path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' />);
export const FavoriteBorderIcon = svg(
  <path d='M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z' />,
);
export const SendIcon = svg(<path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' />);
export const DeleteIcon = svg(<path d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z' />);
export const RefreshIcon = svg(
  <path d='M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z' />,
);

// toasts (replaces notistack)
type Toast = { id: number; message: React.ReactNode };
let toasts: Toast[] = [];
let toastId = 0;
const toastListeners = new Set<(t: Toast[]) => void>();
const notify = () => toastListeners.forEach(l => l(toasts));

export const toast = (message: React.ReactNode, { duration = 4000 } = {}) => {
  const id = ++toastId;
  toasts = [...toasts, { id, message }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, duration);
  return id;
};

export const Toaster = () => {
  injectStyles();
  const [items, setItems] = useState<Toast[]>(toasts);
  useEffect(() => {
    toastListeners.add(setItems);
    return () => {
      toastListeners.delete(setItems);
    };
  }, []);
  return (
    <div className='wui-toasts' role='status'>
      {items.map(t => (
        <div key={t.id} className='wui-toast'>
          {t.message}
        </div>
      ))}
    </div>
  );
};

export const SnackbarProvider = ({ children }: { children: React.ReactNode }) => (
  <>
    {children}
    <Toaster />
  </>
);

export const useSnackbar = () => ({
  enqueueSnackbar: (message: React.ReactNode) => toast(message),
  closeSnackbar: () => {},
});

export const getTheme = () => theme;
