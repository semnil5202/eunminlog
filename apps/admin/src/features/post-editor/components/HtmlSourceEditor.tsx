type HtmlSourceEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function HtmlSourceEditor({ value, onChange }: HtmlSourceEditorProps) {
  return (
    <textarea
      className="min-h-[450px] w-full resize-y p-4 font-mono text-sm leading-relaxed focus:outline-none"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
    />
  );
}
