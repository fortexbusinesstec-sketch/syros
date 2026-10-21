import { useState } from "react";
import {
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Menu } from "@base-ui/react/menu";
import {
  Check,
  ChevronRight,
  Copy,
  Ellipsis,
  Languages,
  Palette,
  Trash2,
} from "lucide-react";
import { cn } from "./cn";
import "./code-block-themes.css";

import ada from "highlight.js/lib/languages/ada";
import dart from "highlight.js/lib/languages/dart";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import groovy from "highlight.js/lib/languages/groovy";
import haskell from "highlight.js/lib/languages/haskell";
import julia from "highlight.js/lib/languages/julia";
import latex from "highlight.js/lib/languages/latex";
import matlab from "highlight.js/lib/languages/matlab";
import prolog from "highlight.js/lib/languages/prolog";
import scala from "highlight.js/lib/languages/scala";

const lowlight = createLowlight(common);
lowlight.register({ ada, dart, dockerfile, groovy, haskell, julia, latex, matlab, prolog, scala });

export const CODE_LANGUAGES: { label: string; value: string }[] = [
  { label: "Ada", value: "ada" },
  { label: "Bash", value: "bash" },
  { label: "C++", value: "cpp" },
  { label: "C#", value: "csharp" },
  { label: "CSS", value: "css" },
  { label: "Dart", value: "dart" },
  { label: "Dockerfile", value: "dockerfile" },
  { label: "Formula (TeX)", value: "latex" },
  { label: "Go", value: "go" },
  { label: "Groovy", value: "groovy" },
  { label: "Haskell", value: "haskell" },
  { label: "HTML", value: "xml" },
  { label: "Java", value: "java" },
  { label: "Javascript", value: "javascript" },
  { label: "JSON", value: "json" },
  { label: "Julia", value: "julia" },
  { label: "Kotlin", value: "kotlin" },
  { label: "Lua", value: "lua" },
  { label: "Markdown", value: "markdown" },
  { label: "Matlab", value: "matlab" },
  { label: "Objective-C", value: "objectivec" },
  { label: "Perl", value: "perl" },
  { label: "PHP", value: "php" },
  { label: "Prolog", value: "prolog" },
  { label: "Plain text", value: "plaintext" },
  { label: "Python", value: "python" },
  { label: "R", value: "r" },
  { label: "Ruby", value: "ruby" },
  { label: "Rust", value: "rust" },
  { label: "Scala", value: "scala" },
  { label: "Shell", value: "shell" },
  { label: "SQL", value: "sql" },
  { label: "Swift", value: "swift" },
  { label: "TypeScript", value: "typescript" },
  { label: "Visual Basic.NET", value: "vbnet" },
  { label: "XML", value: "xml" },
  { label: "Yaml", value: "yaml" },
  { label: "Other", value: "plaintext" },
];

export const CODE_THEMES: { label: string; value: string }[] = [
  { label: "Auto", value: "auto" },
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "Atom One", value: "atomone" },
  { label: "Aura", value: "aura" },
  { label: "BBEdit", value: "bbedit" },
  { label: "Darcula", value: "darcula" },
  { label: "Dracula", value: "dracula" },
  { label: "GitHub Dark", value: "githubdark" },
  { label: "GitHub Light", value: "githublight" },
  { label: "Material Dark", value: "materialdark" },
  { label: "Material Light", value: "materiallight" },
  { label: "Noctis Lilac", value: "noctislilac" },
  { label: "Nord", value: "nord" },
  { label: "Sublime", value: "sublime" },
  { label: "Tokyo Night", value: "tokyonight" },
  { label: "Tokyo Night Day", value: "tokyonightday" },
  { label: "Tokyo Night Storm", value: "tokyonightstorm" },
  { label: "VS Code", value: "vscode" },
];

const languageLabel = (value: string) =>
  CODE_LANGUAGES.find((l) => l.value === value)?.label ?? value;

const themeLabel = (value: string) =>
  CODE_THEMES.find((t) => t.value === value)?.label ?? value;

function CodeBlockView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, selected } = props;
  const [copied, setCopied] = useState(false);

  const language = (node.attrs.language as string) || "plaintext";
  const theme = (node.attrs.theme as string) || "auto";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <NodeViewWrapper
      className={cn(
        "code-block-node group relative my-3",
        selected && "code-block-node--selected"
      )}
    >
      <div className="absolute top-2 right-2 z-10" contentEditable={false}>
        <Menu.Root modal={false}>
          <Menu.Trigger
            aria-label="Opciones de bloque de código"
            className="inline-flex items-center justify-center size-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 bg-white/70 shadow-sm border border-slate-200/60 transition-colors"
          >
            <Ellipsis className="h-4 w-4" />
          </Menu.Trigger>

          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={4}>
              <Menu.Popup className="min-w-[200px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl outline-none z-[9999]">
                <Menu.SubmenuRoot>
                  <Menu.SubmenuTrigger className="menu-item">
                    <Languages className="h-4 w-4" />
                    <span>Idioma</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {languageLabel(language)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Menu.SubmenuTrigger>
                  <Menu.Portal>
                    <Menu.Positioner side="right" sideOffset={4} align="start">
                      <Menu.Popup className="max-h-72 min-w-[200px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl outline-none z-[9999]">
                        {CODE_LANGUAGES.map((l) => (
                          <Menu.Item
                            key={l.label}
                            className="menu-item"
                            onClick={() => updateAttributes({ language: l.value })}
                          >
                            <span>{l.label}</span>
                            {language === l.value && (
                              <Check className="h-4 w-4 ml-auto text-blue-600" />
                            )}
                          </Menu.Item>
                        ))}
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubmenuRoot>

                <Menu.SubmenuRoot>
                  <Menu.SubmenuTrigger className="menu-item">
                    <Palette className="h-4 w-4" />
                    <span>Tema</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {themeLabel(theme)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Menu.SubmenuTrigger>
                  <Menu.Portal>
                    <Menu.Positioner side="right" sideOffset={4} align="start">
                      <Menu.Popup className="max-h-72 min-w-[200px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl outline-none z-[9999]">
                        {CODE_THEMES.map((t) => (
                          <Menu.Item
                            key={t.value}
                            className="menu-item"
                            onClick={() => updateAttributes({ theme: t.value })}
                          >
                            <span>{t.label}</span>
                            {theme === t.value && (
                              <Check className="h-4 w-4 ml-auto text-blue-600" />
                            )}
                          </Menu.Item>
                        ))}
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubmenuRoot>

                <Menu.Separator className="my-1 h-px bg-slate-200" />

                <Menu.Item className="menu-item" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>{copied ? "¡Copiado!" : "Copiar código"}</span>
                </Menu.Item>

                <Menu.Item
                  className="menu-item menu-item--danger"
                  onClick={deleteNode}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar bloque de código</span>
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>

      <pre className={`code-block-pre code-theme-${theme}`}>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

const LANG_PREFIX = "language-";

function readLanguageInfo(element: Element): string | null {
  const code = element.firstElementChild;
  if (!code) return null;
  for (const cls of Array.from(code.classList)) {
    if (cls.startsWith(LANG_PREFIX)) {
      return cls.slice(LANG_PREFIX.length);
    }
  }
  return null;
}

interface MarkdownStateLike {
  write(content: string): void;
  text(content: string, escape?: boolean): void;
  ensureNewLine(): void;
  closeBlock(node: { isBlock: boolean }): void;
}

interface MarkdownNodeLike {
  attrs: { language?: string; theme?: string };
  textContent: string;
  isBlock: boolean;
}

export const CodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    const parent = (this.parent?.() ?? {}) as {
      language?: {
        default?: string | null;
        parseHTML?: (element: Element) => string | null;
        rendered?: boolean;
      };
    };
    return {
      ...parent,
      language: {
        ...(parent.language ?? {}),
        parseHTML: (element: Element) => {
          const info = readLanguageInfo(element);
          if (!info) return null;
          return info.split(":")[0] || null;
        },
      },
      theme: {
        default: "auto",
        parseHTML: (element: Element) => {
          const dataTheme = element.getAttribute("data-theme");
          if (dataTheme) return dataTheme;
          const info = readLanguageInfo(element);
          return info ? info.split(":")[1] || "auto" : "auto";
        },
        renderHTML: (attributes: { theme?: string }) => ({
          "data-theme": attributes.theme ?? "auto",
        }),
      },
    };
  },
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownStateLike, node: MarkdownNodeLike) {
          const lang = node.attrs.language || "";
          const theme = node.attrs.theme || "auto";
          const info = theme && theme !== "auto" ? `${lang}:${theme}` : lang;
          state.write("```" + info + "\n");
          state.text(node.textContent, false);
          state.ensureNewLine();
          state.write("```");
          state.closeBlock(node);
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  defaultLanguage: "plaintext",
});
