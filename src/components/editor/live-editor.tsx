import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Markdown } from "tiptap-markdown";
import { StructuredTableNode } from "./structured-table-node";
import { SimpleTableNode } from "./simple-table-node";
import { MermaidNode } from "./mermaid-node";
import { LineHeight } from "./line-height";
import { CodeBlock } from "./code-block";
import { NodeSelection } from "@tiptap/pm/state";
import { printEditorContent } from "./print";
import "./live-editor.css";

export interface LiveEditorMethods {
  getMarkdown(): string;
  insertMarkdown(md: string): void;
  insertParsedMarkdown(md: string): void;
  applyInlineFormat(type: "bold" | "italic" | "underline" | "strike"): void;
  applyAlignment(align: "left" | "center" | "right" | "justify"): void;
  applyLineHeight(lineHeight: string): void;
  printDocument(title: string): Promise<void>;
}

interface LiveEditorProps {
  markdown: string;
  onChange: (md: string) => void;
  className?: string;
}

const LiveEditor = forwardRef<LiveEditorMethods, LiveEditorProps>(
  ({ markdown, onChange, className }, ref) => {
    const isUpdatingFromProp = useRef(false);
    const lastEmittedMarkdown = useRef("");
    // Si el usuario nunca puso el cursor en el documento, lo insertado va al final (no al inicio).
    const hasUserCursor = useRef(false);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          link: false,
        }),
        Image,
        Link.configure({
          openOnClick: false,
          autolink: true,
        }),
        Placeholder.configure({
          placeholder: "Escribe tu documento aquí...",
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        CodeBlock,
        Underline,
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right", "justify"],
        }),
        LineHeight,
        Markdown.configure({
          html: true,
          linkify: true,
          breaks: true,
          tightLists: true,
          bulletListMarker: "-",
        }),
        StructuredTableNode,
        SimpleTableNode,
        MermaidNode,
      ],
      content: markdown,
      editorProps: {
        attributes: {
          class: "doc-preview focus:outline-none",
        },
      },
      onFocus: () => {
        hasUserCursor.current = true;
      },
      onUpdate: ({ editor: ed }) => {
        if (isUpdatingFromProp.current) return;
        const md = (ed.storage as any).markdown?.getMarkdown?.() || ed.getText();
        if (md !== lastEmittedMarkdown.current) {
          lastEmittedMarkdown.current = md;
          onChange(md);
        }
      },
    });

    /**
     * Inserta contenido sin borrar nada: va después de la selección actual (si hay un bloque
     * seleccionado, como una tabla o un diagrama, se inserta debajo en lugar de reemplazarlo)
     * y deja el cursor en un párrafo tras lo insertado, listo para la siguiente inserción.
     */
    const insertSafely = (content: string) => {
      if (!editor) return;
      const { selection, doc } = editor.state;
      const position = hasUserCursor.current ? selection.to : doc.content.size;
      editor.chain().focus().insertContentAt(position, content, { updateSelection: true }).run();

      const after = editor.state.selection;
      if (after instanceof NodeSelection || !after.$to.parent.isTextblock) {
        const end = after.to;
        const next = editor.state.doc.resolve(end).nodeAfter;
        if (next?.isTextblock) {
          editor.chain().setTextSelection(end + 1).scrollIntoView().run();
        } else {
          editor
            .chain()
            .insertContentAt(end, { type: "paragraph" })
            .setTextSelection(end + 1)
            .scrollIntoView()
            .run();
        }
      }
      hasUserCursor.current = true;
    };

    useImperativeHandle(ref, () => ({
      getMarkdown: () => {
        return (editor?.storage as any)?.markdown?.getMarkdown?.() || editor?.getText() || "";
      },
      insertMarkdown: (md: string) => {
        insertSafely(md);
      },
      insertParsedMarkdown: (md: string) => {
        if (!editor) return;
        const parser = (editor?.storage as any)?.markdown?.parser;
        insertSafely(parser ? parser.parse(md) : md);
      },
      printDocument: (title: string) => {
        if (!editor) return Promise.resolve();
        return printEditorContent(editor, title);
      },
      applyInlineFormat: (type) => {
        if (!editor) return;
        const chain = editor.chain().focus();
        switch (type) {
          case "bold":
            chain.toggleBold().run();
            break;
          case "italic":
            chain.toggleItalic().run();
            break;
          case "underline":
            chain.toggleUnderline().run();
            break;
          case "strike":
            chain.toggleStrike().run();
            break;
        }
      },
      applyAlignment: (align) => {
        if (!editor) return;
        editor.chain().focus().setTextAlign(align).run();
      },
      applyLineHeight: (lineHeight) => {
        if (!editor) return;
        editor.chain().focus().setLineHeight(lineHeight).run();
      },
    }));

    useEffect(() => {
      isUpdatingFromProp.current = true;
      requestAnimationFrame(() => {
        if (editor && markdown !== lastEmittedMarkdown.current) {
          const currentMd =
            (editor.storage as any).markdown?.getMarkdown?.() || editor.getText();
          if (currentMd !== markdown) {
            editor.commands.setContent(markdown);
            lastEmittedMarkdown.current = markdown;
          }
        }
        isUpdatingFromProp.current = false;
      });
    }, [markdown, editor]);

    return (
      <div
        id="markdown-print-area"
        className={`live-editor-wrapper relative p-6 lg:p-10 ${className || ""}`}
      >
        <EditorContent editor={editor} />
      </div>
    );
  }
);

LiveEditor.displayName = "LiveEditor";

export default LiveEditor;
