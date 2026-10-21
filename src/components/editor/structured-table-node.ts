import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React from "react";
import StructuredTable from "./structured-table";

// This is the React Component that wraps our StructuredTable and communicates with TipTap
function StructuredTableNodeView(props: any) {
  const { node, updateAttributes, selected } = props;
  const stateString = node.attrs.state;

  const handleChange = (newStateString: string) => {
    updateAttributes({ state: newStateString });
  };

  return React.createElement(
    NodeViewWrapper,
    { className: "structured-table-node-wrapper" },
    React.createElement(StructuredTable, {
      initialState: stateString,
      onChange: handleChange,
      isEditable: true,
      selected,
    })
  );
}

export const StructuredTableNode = Node.create({
  name: "structuredTable",
  group: "block",
  atom: true, // treats the node as a single unit

  addAttributes() {
    return {
      state: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-state"),
        renderHTML: (attributes) => {
          if (!attributes.state) {
            return {};
          }
          return { "data-state": attributes.state };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="structured-table"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "structured-table" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StructuredTableNodeView);
  },
});
