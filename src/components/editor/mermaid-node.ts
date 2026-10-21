import { Node, mergeAttributes } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React from "react";
import MermaidBlock from "./mermaid-block";

function MermaidNodeView(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props;
  const code = (node.attrs.code as string) ?? "";

  const handleChange = (newCode: string) => {
    updateAttributes({ code: newCode });
  };

  return React.createElement(
    NodeViewWrapper,
    { className: "mermaid-node-wrapper" },
    React.createElement(MermaidBlock, {
      code,
      onChange: handleChange,
      isEditable: true,
      selected,
    })
  );
}

export const MermaidNode = Node.create({
  name: "mermaid",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: {
        default: "",
        parseHTML: (element) => {
          const raw = element.getAttribute("data-code");
          if (!raw) return "";
          try {
            return JSON.parse(raw) as string;
          } catch {
            return raw;
          }
        },
        renderHTML: (attributes) => {
          if (!attributes.code) {
            return {};
          }
          return { "data-code": JSON.stringify(attributes.code) };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "mermaid" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },
});
