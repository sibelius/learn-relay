'use client';

import MonacoEditor, { type Monaco } from '@monaco-editor/react';

const configure = (monaco: Monaco) => {
  const ts = monaco.languages.typescript;
  const options = {
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    allowJs: true,
    esModuleInterop: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };
  ts.typescriptDefaults.setCompilerOptions(options);
  ts.javascriptDefaults.setCompilerOptions(options);
  // only syntax errors: the sandbox resolves modules (and Relay artifacts) at runtime
  ts.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
  ts.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });

  monaco.editor.defineTheme('learn-relay', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'string', foreground: 'fdba74' },
      { token: 'keyword', foreground: 'f472b6' },
    ],
    colors: {
      'editor.background': '#0b0d12',
      'editor.lineHighlightBackground': '#ffffff08',
      'editorLineNumber.foreground': '#3f3f46',
      'editorGutter.background': '#0b0d12',
      'editor.selectionBackground': '#F26B0033',
    },
  });
};

export default function Editor({ path, value, onChange }: { path: string; value: string; onChange: (value: string) => void }) {
  return (
    <MonacoEditor
      path={path}
      value={value}
      language={path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'javascript'}
      theme='learn-relay'
      beforeMount={configure}
      onChange={v => onChange(v ?? '')}
      options={{
        fontSize: 13,
        fontFamily: 'var(--font-geist-mono), ui-monospace, Menlo, monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 12 },
        renderLineHighlight: 'line',
        wordWrap: 'on',
      }}
    />
  );
}
