import { Node, mergeAttributes } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React from "react";
import SimpleTable from "./simple-table";

interface SimpleCell {
  value: string;
  style: { align: string; fontFamily: string; format: string };
}

// Converts an HTML <table> (e.g. from a pasted markdown table) into the
// simple-table state so that "Insertar por Markdown" produces the new table.
function buildStateFromTable(element: Element): string {
  const data: SimpleCell[][] = [];
  const rows = Array.from(element.querySelectorAll("tr"));
  rows.forEach((tr) => {
    const row: SimpleCell[] = [];
    Array.from(tr.children).forEach((cell) => {
      const tag = cell.tagName.toUpperCase();
      if (tag === "TH" || tag === "TD") {
        row.push({
          value: cell.textContent ?? "",
          style: { align: "left", fontFamily: "system", format: "text" },
        });
      }
    });
    if (row.length > 0) data.push(row);
  });
  const headerRow = !!element.querySelector("thead");
  return JSON.stringify({ data, headerRow, headerCol: false });
}

function SimpleTableNodeView(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props;
  const stateString = node.attrs.state as string | null;

  const handleChange = (newStateString: string) => {
    updateAttributes({ state: newStateString });
  };

  return React.createElement(
    NodeViewWrapper,
    { className: "simple-table-node-wrapper" },
    React.createElement(SimpleTable, {
      initialState: stateString ?? undefined,
      onChange: handleChange,
      isEditable: true,
      selected,
    })
  );
}

export const SimpleTableNode = Node.create({
  name: "simpleTable",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      state: {
        default: null,
        parseHTML: (element: Element) => {
          if (element.tagName.toUpperCase() === "TABLE") {
            return buildStateFromTable(element);
          }
          return element.getAttribute("data-state");
        },
        renderHTML: (attributes: { state?: string }) => {
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
        tag: 'div[data-type="simple-table"]',
      },
      {
        tag: "table",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "simple-table" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SimpleTableNodeView);
  },
});
