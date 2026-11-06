import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    setDark(root.classList.contains("dark"));
    const observer = new MutationObserver(() => setDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export function SqlEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const dark = useIsDark();
  return (
    <div className="overflow-hidden rounded-xl border border-border text-sm [&_.cm-editor]:text-[13px]">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[sql()]}
        theme={dark ? oneDark : "light"}
        editable={!disabled}
        height="200px"
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: true,
        }}
        aria-label="SQL editor"
      />
    </div>
  );
}
