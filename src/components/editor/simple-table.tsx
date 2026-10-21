import { useCallback, useEffect, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "./cn";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bold,
  Check,
  ChevronRight,
  Columns3,
  EllipsisVertical,
  FunctionSquare,
  Italic,
  Rows3,
  Trash2,
  Underline,
} from "lucide-react";
import "./simple-table.css";

/* ── Types ── */
type Align = "left" | "center" | "right" | "justify";
type FontFamily = "system" | "mono" | "serif" | "round";
type Format = "text" | "number" | "percent" | "formula";

interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: Align;
  fontFamily?: FontFamily;
  format?: Format;
}

interface Cell {
  value: string;
  formula?: string;
  style: CellStyle;
}

interface SimpleTableState {
  data: Cell[][];
  headerRow: boolean;
  headerCol: boolean;
  colWidths?: number[];
  rowHeights?: number[];
}

const DEFAULT_ROWS = 4;
const DEFAULT_COLS = 4;
const DEFAULT_CELL_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 36;

const FONT_STACK: Record<FontFamily, string> = {
  system:
    'var(--font-geist-sans), "Montserrat", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  serif: 'Georgia, Cambria, "Times New Roman", serif',
  round: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, sans-serif',
};

function createEmptyCell(): Cell {
  return { value: "", style: { align: "left", fontFamily: "system", format: "text" } };
}

function createDefaultState(): SimpleTableState {
  return {
    data: Array.from({ length: DEFAULT_ROWS }, () =>
      Array.from({ length: DEFAULT_COLS }, createEmptyCell)
    ),
    headerRow: false,
    headerCol: false,
    colWidths: Array.from({ length: DEFAULT_COLS }, () => DEFAULT_CELL_WIDTH),
    rowHeights: Array.from({ length: DEFAULT_ROWS }, () => DEFAULT_ROW_HEIGHT),
  };
}

/* ── Cell reference helpers (A1, B3, AA12, …) ── */
function colLetterToIndex(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.toUpperCase().charCodeAt(i) - 64);
  }
  return result - 1;
}

function indexToColLetter(index: number): string {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function cellRefLabel(row: number, col: number): string {
  return indexToColLetter(col) + (row + 1);
}

function parseRef(ref: string): { row: number; col: number } {
  const m = ref.trim().toUpperCase().match(/([A-Z]+)(\d+)/);
  if (!m) return { row: 0, col: 0 };
  return { row: parseInt(m[2], 10) - 1, col: colLetterToIndex(m[1]) };
}

/* ── Safe arithmetic evaluator (no eval) ── */
function evaluateArithmetic(expr: string, data: Cell[][]): number {
  const withValues = expr.replace(/[A-Za-z]+\d+/g, (match) => {
    const { row, col } = parseRef(match);
    const num = parseFloat(data[row]?.[col]?.value ?? "");
    return isNaN(num) ? "0" : String(num);
  });

  if (!/^[\d+\-*/().\s]+$/.test(withValues)) {
    throw new Error("invalid expression");
  }

  const tokens = withValues.match(/\d+(\.\d+)?|[+\-*/()]/g) || [];
  let pos = 0;

  function peek() {
    return tokens[pos];
  }
  function consume() {
    return tokens[pos++];
  }

  function parseExpr(): number {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = consume();
      const rhs = parseFactor();
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }

  function parseFactor(): number {
    if (peek() === "-") {
      consume();
      return -parseFactor();
    }
    if (peek() === "+") {
      consume();
      return parseFactor();
    }
    if (peek() === "(") {
      consume();
      const v = parseExpr();
      if (peek() === ")") consume();
      return v;
    }
    const token = consume();
    if (token === undefined) return 0;
    return parseFloat(token);
  }

  return parseExpr();
}

const FUNCTIONS = [
  "SUM",
  "MIN",
  "MAX",
  "AVERAGE",
  "COUNT",
  "COUNTA",
  "INT",
  "MODE",
  "PRODUCT",
  "ROUND",
  "SIGN",
  "PI",
  "SQRT2",
];

function evaluateFormula(formula: string, data: Cell[][]): string {
  const expr = formula.trim().replace(/^=/, "");

  const funcMatch = expr.match(/^(\w+)\(([^)]*)\)$/);
  if (funcMatch) {
    const funcName = funcMatch[1].toUpperCase();
    const args = funcMatch[2].split(",").map((s) => s.trim());

    const numbers: number[] = [];
    args.forEach((arg) => {
      if (!arg) return;
      if (arg.includes(":")) {
        const [start, end] = arg.split(":");
        const s = parseRef(start);
        const e = parseRef(end);
        for (let r = Math.min(s.row, e.row); r <= Math.max(s.row, e.row); r++) {
          for (let c = Math.min(s.col, e.col); c <= Math.max(s.col, e.col); c++) {
            const num = parseFloat(data[r]?.[c]?.value ?? "");
            if (!isNaN(num)) numbers.push(num);
          }
        }
      } else {
        const { row, col } = parseRef(arg);
        const num = parseFloat(data[row]?.[col]?.value ?? "");
        if (!isNaN(num)) numbers.push(num);
      }
    });

    switch (funcName) {
      case "SUM":
        return formatResult(numbers.reduce((a, b) => a + b, 0));
      case "MIN":
        return numbers.length ? formatResult(Math.min(...numbers)) : "0";
      case "MAX":
        return numbers.length ? formatResult(Math.max(...numbers)) : "0";
      case "AVERAGE":
        return numbers.length
          ? formatResult(numbers.reduce((a, b) => a + b, 0) / numbers.length)
          : "0";
      case "COUNT":
        return String(numbers.length);
      case "COUNTA":
        return String(
          data.reduce(
            (acc, row) => acc + row.filter((c) => c.value.trim() !== "").length,
            0
          )
        );
      case "INT":
        return String(Math.floor(numbers[0] || 0));
      case "MODE": {
        const freq: Record<string, number> = {};
        numbers.forEach((n) => {
          const k = String(n);
          freq[k] = (freq[k] || 0) + 1;
        });
        let maxFreq = 0;
        let mode = 0;
        for (const [num, count] of Object.entries(freq)) {
          if (count > maxFreq) {
            maxFreq = count;
            mode = parseFloat(num);
          }
        }
        return formatResult(mode);
      }
      case "PRODUCT":
        return formatResult(numbers.reduce((a, b) => a * b, 1));
      case "ROUND":
        return String(Math.round(numbers[0] || 0));
      case "SIGN":
        return String(Math.sign(numbers[0] || 0));
      case "PI":
        return String(Math.PI);
      case "SQRT2":
        return String(Math.SQRT2);
      default:
        return "#NOMBRE?";
    }
  }

  try {
    return formatResult(evaluateArithmetic(expr, data));
  } catch {
    return "#ERROR";
  }
}

function formatResult(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1e6) / 1e6);
}

const MENU_ITEM_CLASS =
  "st-menu-item flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-[13px] text-slate-700 outline-none cursor-pointer select-none";

interface AutoTextareaProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  style?: React.CSSProperties;
}

function AutoTextarea({ value, disabled, onChange, onKeyDown, onFocus, style }: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value);
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      placeholder=""
      style={style}
      className="block w-full pl-2 pr-7 py-1 bg-transparent text-[13px] text-slate-800 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 rounded-none resize-none overflow-hidden leading-snug"
    />
  );
}

interface SimpleTableProps {
  initialState?: string;
  onChange?: (state: string) => void;
  isEditable?: boolean;
  selected?: boolean;
}

export default function SimpleTable({
  initialState,
  onChange,
  isEditable = true,
  selected = false,
}: SimpleTableProps) {
  const [state, setState] = useState<SimpleTableState>(() => {
    if (initialState) {
      try {
        const parsed = JSON.parse(initialState);
        if (Array.isArray(parsed.data)) {
          const cols = parsed.data[0]?.length ?? 0;
          const rows = parsed.data.length ?? 0;
          return {
            data: parsed.data,
            headerRow: !!parsed.headerRow,
            headerCol: !!parsed.headerCol,
            colWidths: Array.isArray(parsed.colWidths)
              ? parsed.colWidths
              : Array.from({ length: cols }, () => DEFAULT_CELL_WIDTH),
            rowHeights: Array.isArray(parsed.rowHeights)
              ? parsed.rowHeights
              : Array.from({ length: rows }, () => DEFAULT_ROW_HEIGHT),
          };
        }
      } catch {
        // fall through to default
      }
    }
    return createDefaultState();
  });

  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState("");
  const [rangeSelection, setRangeSelection] = useState<{
    r1: number;
    c1: number;
    r2: number;
    c2: number;
  } | null>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startRow: number; startCol: number; curRow: number; curCol: number } | null>(null);
  const resizeRef = useRef<{
    type: "col" | "row";
    index: number;
    startX: number;
    startY: number;
    startSize: number;
  } | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const selectedData = selectedCell
    ? state.data[selectedCell.row]?.[selectedCell.col]
    : undefined;
  const isFormulaCellSelected = selectedData?.style.format === "formula";

  const commit = (next: SimpleTableState) => {
    setState(next);
    onChange?.(JSON.stringify(next));
  };

  /* ── Table modification ── */
  const addRow = (afterRow: number) => {
    const cols = state.data[0]?.length || 1;
    const newRow = Array.from({ length: cols }, createEmptyCell);
    const data = [...state.data];
    data.splice(afterRow + 1, 0, newRow);
    const rowHeights = [...(state.rowHeights ?? [])];
    rowHeights.splice(afterRow + 1, 0, DEFAULT_ROW_HEIGHT);
    commit({ ...state, data, rowHeights });
  };

  const addColumn = (afterCol: number) => {
    const data = state.data.map((row) => {
      const newRow = [...row];
      newRow.splice(afterCol + 1, 0, createEmptyCell());
      return newRow;
    });
    const colWidths = [...(state.colWidths ?? [])];
    colWidths.splice(afterCol + 1, 0, DEFAULT_CELL_WIDTH);
    commit({ ...state, data, colWidths });
  };

  const moveRow = (row: number, dir: -1 | 1) => {
    const target = row + dir;
    if (target < 0 || target >= state.data.length) return;
    const data = [...state.data];
    [data[row], data[target]] = [data[target], data[row]];
    const rowHeights = [...(state.rowHeights ?? [])];
    [rowHeights[row], rowHeights[target]] = [rowHeights[target], rowHeights[row]];
    commit({ ...state, data, rowHeights });
    setSelectedCell((prev) => (prev && prev.row === row ? { ...prev, row: target } : prev));
  };

  const moveColumn = (col: number, dir: -1 | 1) => {
    const target = col + dir;
    if (target < 0 || target >= (state.data[0]?.length || 0)) return;
    const data = state.data.map((row) => {
      const newRow = [...row];
      [newRow[col], newRow[target]] = [newRow[target], newRow[col]];
      return newRow;
    });
    const colWidths = [...(state.colWidths ?? [])];
    [colWidths[col], colWidths[target]] = [colWidths[target], colWidths[col]];
    commit({ ...state, data, colWidths });
    setSelectedCell((prev) => (prev && prev.col === col ? { ...prev, col: target } : prev));
  };

  const deleteRow = (row: number) => {
    if (state.data.length <= 1) return;
    const data = [...state.data];
    data.splice(row, 1);
    const rowHeights = [...(state.rowHeights ?? [])];
    rowHeights.splice(row, 1);
    commit({ ...state, data, rowHeights });
    setSelectedCell((prev) => {
      if (!prev) return prev;
      if (prev.row === row) return null;
      if (prev.row > row) return { ...prev, row: prev.row - 1 };
      return prev;
    });
  };

  const deleteColumn = (col: number) => {
    if ((state.data[0]?.length || 0) <= 1) return;
    const data = state.data.map((row) => {
      const newRow = [...row];
      newRow.splice(col, 1);
      return newRow;
    });
    const colWidths = [...(state.colWidths ?? [])];
    colWidths.splice(col, 1);
    commit({ ...state, data, colWidths });
    setSelectedCell((prev) => {
      if (!prev) return prev;
      if (prev.col === col) return null;
      if (prev.col > col) return { ...prev, col: prev.col - 1 };
      return prev;
    });
  };

  const updateCellValue = (row: number, col: number, value: string) => {
    const data = state.data.map((r, ri) =>
      ri === row
        ? r.map((c, ci) => (ci === col ? { ...c, value } : c))
        : r
    );
    commit({ ...state, data });
  };

  const applyFormat = (row: number, col: number, key: keyof CellStyle, value: unknown) => {
    const data = state.data.map((r, ri) =>
      ri === row
        ? r.map((c, ci) =>
            ci === col ? { ...c, style: { ...c.style, [key]: value } } : c
          )
        : r
    );
    commit({ ...state, data });
  };

  const setCellFormat = (row: number, col: number, format: Format) => {
    const data = state.data.map((r, ri) =>
      ri === row
        ? r.map((c, ci) =>
            ci === col
              ? {
                  ...c,
                  style: { ...c.style, format },
                  formula: format === "formula" ? c.formula : undefined,
                }
              : c
          )
        : r
    );
    commit({ ...state, data });
  };

  /* ── Formula bar (Excel-like, only for formula cells) ── */
  const selectCell = (row: number, col: number) => {
    setSelectedCell({ row, col });
    const c = state.data[row]?.[col];
    setFormulaBarValue(c?.style.format === "formula" && c.formula !== undefined ? "=" + c.formula : c?.value ?? "");
  };

  const insertTextAtCursor = useCallback((text: string) => {
    const input = formulaInputRef.current;
    if (!input) return;
    const value = input.value;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    setFormulaBarValue(next);
    requestAnimationFrame(() => {
      const el = formulaInputRef.current;
      if (el) {
        el.focus();
        const pos = start + text.length;
        el.setSelectionRange(pos, pos);
      }
    });
  }, []);

  const startDrag = (row: number, col: number) => {
    dragRef.current = { startRow: row, startCol: col, curRow: row, curCol: col };
    setRangeSelection({ r1: row, c1: col, r2: row, c2: col });
  };

  const updateDrag = (row: number, col: number) => {
    const d = dragRef.current;
    if (!d) return;
    d.curRow = row;
    d.curCol = col;
    setRangeSelection({
      r1: Math.min(d.startRow, row),
      c1: Math.min(d.startCol, col),
      r2: Math.max(d.startRow, row),
      c2: Math.max(d.startCol, col),
    });
  };

  const finishDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    setRangeSelection(null);
    const r1 = Math.min(d.startRow, d.curRow);
    const r2 = Math.max(d.startRow, d.curRow);
    const c1 = Math.min(d.startCol, d.curCol);
    const c2 = Math.max(d.startCol, d.curCol);
    const startRef = cellRefLabel(r1, c1);
    const endRef = cellRefLabel(r2, c2);
    insertTextAtCursor(startRef === endRef ? startRef : startRef + ":" + endRef);
  }, [insertTextAtCursor]);

  // Finish drag on global mouseup
  useEffect(() => {
    const onMouseUp = () => finishDrag();
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [finishDrag]);

  /* ── Row / column resizing ── */
  const startColResize = (e: React.MouseEvent, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startSize = state.colWidths?.[col] ?? DEFAULT_CELL_WIDTH;
    resizeRef.current = { type: "col", index: col, startX: e.clientX, startY: 0, startSize };
  };

  const startRowResize = (e: React.MouseEvent, row: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startSize = state.rowHeights?.[row] ?? DEFAULT_ROW_HEIGHT;
    resizeRef.current = { type: "row", index: row, startX: 0, startY: e.clientY, startSize };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      if (r.type === "col") {
        const size = Math.max(40, r.startSize + (e.clientX - r.startX));
        setState((prev) => {
          const colWidths = [...(prev.colWidths ?? [])];
          colWidths[r.index] = size;
          const next = { ...prev, colWidths };
          stateRef.current = next;
          return next;
        });
      } else {
        const size = Math.max(24, r.startSize + (e.clientY - r.startY));
        setState((prev) => {
          const rowHeights = [...(prev.rowHeights ?? [])];
          rowHeights[r.index] = size;
          const next = { ...prev, rowHeights };
          stateRef.current = next;
          return next;
        });
      }
    };
    const onUp = () => {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      onChange?.(JSON.stringify(stateRef.current));
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [onChange]);

  // Clear selection when clicking outside the table (but not inside menus)
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-st-menu]")) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setSelectedCell(null);
        setFormulaBarValue("");
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const isFormulaEditing = () =>
    isFormulaCellSelected &&
    formulaBarValue.startsWith("=") &&
    formulaInputRef.current === document.activeElement;

  const handleCellMouseDown = (e: React.MouseEvent, row: number, col: number) => {
    if (isFormulaEditing()) {
      e.preventDefault();
      startDrag(row, col);
    }
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (dragRef.current) {
      updateDrag(row, col);
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (isFormulaEditing()) return;
    selectCell(row, col);
  };

  const confirmFormula = () => {
    if (!selectedCell) return;
    const raw = formulaBarValue;
    const { row, col } = selectedCell;
    const data = state.data.map((r, ri) =>
      ri === row
        ? r.map((c, ci) => {
            if (ci !== col) return c;
            if (raw.startsWith("=") && raw.length > 1) {
              const expr = raw.slice(1).trim();
              return {
                ...c,
                value: evaluateFormula(raw, state.data),
                formula: expr,
                style: { ...c.style, format: "formula" as Format },
              };
            }
            return { ...c, value: raw, formula: undefined };
          })
        : r
    );
    commit({ ...state, data });
    setFormulaBarValue(raw.startsWith("=") && raw.length > 1 ? evaluateFormula(raw, state.data) : raw);
  };

  const handleFormulaBarKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFormulaCellSelected) return;
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      confirmFormula();
    } else if (e.key === "Escape") {
      const c = state.data[selectedCell?.row ?? -1]?.[selectedCell?.col ?? -1];
      setFormulaBarValue(c?.style.format === "formula" && c.formula !== undefined ? "=" + c.formula : c?.value ?? "");
      formulaInputRef.current?.blur();
    }
  };

  const startFormulaEditing = (row: number, col: number) => {
    const c = state.data[row]?.[col];
    const base = c?.formula !== undefined ? "=" + c.formula : "=";
    setCellFormat(row, col, "formula");
    setSelectedCell({ row, col });
    setFormulaBarValue(base);
    requestAnimationFrame(() => {
      const input = formulaInputRef.current;
      if (input) {
        input.focus();
        input.setSelectionRange(base.length, base.length);
      }
    });
  };

  const handleInlineChange = (row: number, col: number, value: string) => {
    updateCellValue(row, col, value);
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setFormulaBarValue(value);
    }
  };

  const cellBackground = (row: number, col: number) =>
    (state.headerRow && row === 0) || (state.headerCol && col === 0)
      ? "#f1f5f9"
      : undefined;

  const menuItem = (extra?: string) => cn(MENU_ITEM_CLASS, extra);

  const cellTextStyle = (cell: Cell): React.CSSProperties => {
    const isNumberish = cell.style.format === "number" || cell.style.format === "percent";
    const textAlign = cell.style.align === "left" && isNumberish ? "right" : cell.style.align;
    return {
      fontWeight: cell.style.bold ? 700 : 400,
      fontStyle: cell.style.italic ? "italic" : "normal",
      textDecoration: cell.style.underline ? "underline" : "none",
      textAlign: textAlign || "left",
      fontFamily: FONT_STACK[cell.style.fontFamily || "system"],
    };
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "simple-table-node group/st my-3 relative text-slate-800 text-sm",
        selected && "ring-2 ring-blue-400 rounded-xl"
      )}
    >
      {/* Formula bar (only for formula cells) */}
      {isEditable && isFormulaCellSelected && (
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white shadow-sm px-1.5 py-1 mb-1.5">
          <span className="w-12 shrink-0 text-center text-[11px] font-mono text-slate-500 border-r border-slate-200 pr-1.5">
            {selectedCell ? cellRefLabel(selectedCell.row, selectedCell.col) : ""}
          </span>
          <span className="shrink-0 text-xs font-semibold italic text-slate-400 px-1">
            fx
          </span>
          <input
            ref={formulaInputRef}
            type="text"
            value={formulaBarValue}
            onChange={(e) => setFormulaBarValue(e.target.value)}
            onKeyDown={handleFormulaBarKeyDown}
            onBlur={() => {
              if (formulaBarValue.startsWith("=")) {
                confirmFormula();
              }
            }}
            placeholder="Escribe una fórmula (ej. =SUM(A1:B3))"
            className="flex-1 min-w-0 bg-transparent text-[13px] font-mono py-1 focus:outline-none text-slate-800"
          />
        </div>
      )}

      {/* Function buttons (shown while editing a formula) */}
      {isEditable && isFormulaCellSelected && formulaBarValue.startsWith("=") && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {FUNCTIONS.map((func) => (
            <button
              key={func}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertTextAtCursor(func + "(")}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-slate-600 transition-colors cursor-pointer"
            >
              {func}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto w-full border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="border-collapse w-max min-w-full">
          <colgroup>
            {state.data[0]?.map((_, ci) => (
              <col key={ci} style={{ width: `${state.colWidths?.[ci] ?? DEFAULT_CELL_WIDTH}px` }} />
            ))}
          </colgroup>
          <tbody>
            {state.data.map((row, ri) => {
              const rowHeight = state.rowHeights?.[ri] ?? DEFAULT_ROW_HEIGHT;
              return (
              <tr key={ri} className="border-b border-slate-200 last:border-b-0" style={{ height: `${rowHeight}px` }}>
                {row.map((cell, ci) => {
                  const isSelected = selectedCell?.row === ri && selectedCell?.col === ci;
                  const isFormulaCell = cell.style.format === "formula";
                  const inRange =
                    !!rangeSelection &&
                    ri >= rangeSelection.r1 &&
                    ri <= rangeSelection.r2 &&
                    ci >= rangeSelection.c1 &&
                    ci <= rangeSelection.c2;
                  return (
                    <td
                      key={ci}
                      onMouseDown={(e) => handleCellMouseDown(e, ri, ci)}
                      onMouseEnter={() => handleCellMouseEnter(ri, ci)}
                      onClick={() => handleCellClick(ri, ci)}
                      className={cn(
                        "relative border-r border-slate-200 last:border-r-0 p-0",
                        isSelected && "bg-blue-50"
                      )}
                      style={{ backgroundColor: isSelected ? undefined : cellBackground(ri, ci), verticalAlign: "middle" }}
                    >
                      <div className="flex w-full" style={{ alignItems: "center", minHeight: `${rowHeight}px` }}>
                        {isFormulaCell ? (
                          <span
                            className="block w-full pl-2 pr-7 py-1 text-[13px] leading-snug whitespace-pre-wrap break-words cursor-cell"
                            style={cellTextStyle(cell)}
                          >
                            {cell.value}
                          </span>
                        ) : (
                          <AutoTextarea
                            value={cell.value}
                            disabled={!isEditable}
                            onChange={(v) => handleInlineChange(ri, ci, v)}
                            onKeyDown={(e) => e.stopPropagation()}
                            onFocus={() => selectCell(ri, ci)}
                            style={cellTextStyle(cell)}
                          />
                        )}
                      </div>

                      {isSelected && (
                        <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-blue-400" />
                      )}

                      {inRange && (
                        <span className="pointer-events-none absolute inset-0 bg-blue-200/60" />
                      )}

                      {isEditable && ri === 0 && (
                        <div
                          onMouseDown={(e) => startColResize(e, ci)}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-0 -right-[3px] z-10 h-full w-[6px] cursor-col-resize hover:bg-blue-400/50 active:bg-blue-500 transition-colors"
                        />
                      )}

                      {isEditable && ci === 0 && (
                        <div
                          onMouseDown={(e) => startRowResize(e, ri)}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute -bottom-[3px] left-0 z-10 w-full h-[6px] cursor-row-resize hover:bg-blue-400/50 active:bg-blue-500 transition-colors"
                        />
                      )}

                      {isEditable && (
                        <Menu.Root modal={false}>
                          <Menu.Trigger
                            aria-label="Opciones de celda"
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute top-1 right-1 z-10 inline-flex items-center justify-center size-5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 opacity-40 hover:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            <EllipsisVertical className="h-3.5 w-3.5" />
                          </Menu.Trigger>

                          <Menu.Portal>
                            <Menu.Positioner side="bottom" align="end" sideOffset={4}>
                                      <Menu.Popup data-st-menu="" className="min-w-[210px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl outline-none z-[9999]">
                                {/* 1. Modificación de la tabla */}
                                <Menu.SubmenuRoot>
                                  <Menu.SubmenuTrigger className={menuItem()}>
                                    <Rows3 className="h-4 w-4 text-slate-400" />
                                    <span>Modificación de la tabla</span>
                                    <ChevronRight className="h-4 w-4 ml-auto text-slate-400" />
                                  </Menu.SubmenuTrigger>
                                  <Menu.Portal>
                                    <Menu.Positioner side="right" sideOffset={4} align="start">
                              <Menu.Popup data-st-menu="" className="min-w-[210px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl outline-none z-[9999]">
                                        <Menu.Item className={menuItem()} onClick={() => addRow(ri)}>
                                          <ArrowDown className="h-4 w-4 text-slate-400" />
                                          Agregar fila
                                        </Menu.Item>
                                        <Menu.Item className={menuItem()} onClick={() => addColumn(ci)}>
                                          <Columns3 className="h-4 w-4 text-slate-400" />
                                          Agregar columna
                                        </Menu.Item>
                                        <Menu.Item
                                          className={menuItem()}
                                          disabled={ri === 0}
                                          onClick={() => moveRow(ri, -1)}
                                        >
                                          <ArrowUp className="h-4 w-4 text-slate-400" />
                                          Mover fila hacia arriba
                                        </Menu.Item>
                                        <Menu.Item
                                          className={menuItem()}
                                          disabled={ri === state.data.length - 1}
                                          onClick={() => moveRow(ri, 1)}
                                        >
                                          <ArrowDown className="h-4 w-4 text-slate-400" />
                                          Mover fila hacia abajo
                                        </Menu.Item>
                                        <Menu.Item
                                          className={menuItem()}
                                          disabled={ci === 0}
                                          onClick={() => moveColumn(ci, -1)}
                                        >
                                          <ArrowLeft className="h-4 w-4 text-slate-400" />
                                          Mover columna a la izquierda
                                        </Menu.Item>
                                        <Menu.Item
                                          className={menuItem()}
                                          disabled={ci === (state.data[0]?.length || 0) - 1}
                                          onClick={() => moveColumn(ci, 1)}
                                        >
                                          <ArrowRight className="h-4 w-4 text-slate-400" />
                                          Mover columna a la derecha
                                        </Menu.Item>
                                        <Menu.Separator className="my-1 h-px bg-slate-200" />
                                        <Menu.Item
                                          className={menuItem("st-menu-item--danger")}
                                          onClick={() => deleteRow(ri)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Eliminar fila
                                        </Menu.Item>
                                        <Menu.Item
                                          className={menuItem("st-menu-item--danger")}
                                          onClick={() => deleteColumn(ci)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Eliminar columna
                                        </Menu.Item>
                                      </Menu.Popup>
                                    </Menu.Positioner>
                                  </Menu.Portal>
                                </Menu.SubmenuRoot>

                                {/* 2. Encabezamiento */}
                                <Menu.SubmenuRoot>
                                  <Menu.SubmenuTrigger className={menuItem()}>
                                    <Rows3 className="h-4 w-4 text-slate-400" />
                                    <span>Encabezamiento</span>
                                    <ChevronRight className="h-4 w-4 ml-auto text-slate-400" />
                                  </Menu.SubmenuTrigger>
                                  <Menu.Portal>
                                    <Menu.Positioner side="right" sideOffset={4} align="start">
                                      <Menu.Popup data-st-menu="" className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl outline-none z-[9999]">
                                        <Menu.CheckboxItem
                                          className={menuItem()}
                                          checked={state.headerRow}
                                          onCheckedChange={(checked) => commit({ ...state, headerRow: checked })}
                                        >
                                          <span>Fila de encabezamiento</span>
                                          {state.headerRow && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.CheckboxItem>
                                        <Menu.CheckboxItem
                                          className={menuItem()}
                                          checked={state.headerCol}
                                          onCheckedChange={(checked) => commit({ ...state, headerCol: checked })}
                                        >
                                          <span>Columna de encabezamiento</span>
                                          {state.headerCol && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.CheckboxItem>
                                      </Menu.Popup>
                                    </Menu.Positioner>
                                  </Menu.Portal>
                                </Menu.SubmenuRoot>

                                {/* 3. Formato */}
                                <Menu.SubmenuRoot>
                                  <Menu.SubmenuTrigger className={menuItem()}>
                                    <Bold className="h-4 w-4 text-slate-400" />
                                    <span>Formato</span>
                                    <ChevronRight className="h-4 w-4 ml-auto text-slate-400" />
                                  </Menu.SubmenuTrigger>
                                  <Menu.Portal>
                                    <Menu.Positioner side="right" sideOffset={4} align="start">
                                      <Menu.Popup data-st-menu="" className="min-w-[210px] max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl outline-none z-[9999]">
                                        <Menu.Item
                                          className={menuItem()}
                                          onClick={() => applyFormat(ri, ci, "bold", !cell.style.bold)}
                                        >
                                          <Bold className="h-4 w-4 text-slate-400" />
                                          Negrita
                                          {cell.style.bold && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>
                                        <Menu.Item
                                          className={menuItem()}
                                          onClick={() => applyFormat(ri, ci, "italic", !cell.style.italic)}
                                        >
                                          <Italic className="h-4 w-4 text-slate-400" />
                                          Cursiva
                                          {cell.style.italic && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>
                                        <Menu.Item
                                          className={menuItem()}
                                          onClick={() => applyFormat(ri, ci, "underline", !cell.style.underline)}
                                        >
                                          <Underline className="h-4 w-4 text-slate-400" />
                                          Subrayado
                                          {cell.style.underline && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>

                                        <Menu.Separator className="my-1 h-px bg-slate-200" />

                                        <Menu.Item className={menuItem()} onClick={() => applyFormat(ri, ci, "align", "left")}>
                                          <AlignLeft className="h-4 w-4 text-slate-400" /> Alineación izquierda
                                        </Menu.Item>
                                        <Menu.Item className={menuItem()} onClick={() => applyFormat(ri, ci, "align", "center")}>
                                          <AlignCenter className="h-4 w-4 text-slate-400" /> Alineación centro
                                        </Menu.Item>
                                        <Menu.Item className={menuItem()} onClick={() => applyFormat(ri, ci, "align", "right")}>
                                          <AlignRight className="h-4 w-4 text-slate-400" /> Alineación derecha
                                        </Menu.Item>
                                        <Menu.Item className={menuItem()} onClick={() => applyFormat(ri, ci, "align", "justify")}>
                                          <AlignJustify className="h-4 w-4 text-slate-400" /> Alineación justificada
                                        </Menu.Item>

                                        <Menu.Separator className="my-1 h-px bg-slate-200" />

                                        <Menu.Item className={menuItem()} onClick={() => applyFormat(ri, ci, "fontFamily", "system")}>
                                          Fuente System
                                          {cell.style.fontFamily === "system" && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>
                                        <Menu.Item className={menuItem()} onClick={() => applyFormat(ri, ci, "fontFamily", "mono")}>
                                          Fuente Mono
                                          {cell.style.fontFamily === "mono" && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>
                                        <Menu.Item className={menuItem()} onClick={() => applyFormat(ri, ci, "fontFamily", "serif")}>
                                          Fuente Serif
                                          {cell.style.fontFamily === "serif" && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>
                                        <Menu.Item className={menuItem()} onClick={() => applyFormat(ri, ci, "fontFamily", "round")}>
                                          Fuente Round
                                          {cell.style.fontFamily === "round" && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>

                                        <Menu.Separator className="my-1 h-px bg-slate-200" />

                                        {/* Formato de celda */}
                                        <Menu.Item className={menuItem()} onClick={() => setCellFormat(ri, ci, "text")}>
                                          Formato: Texto sin formato
                                          {cell.style.format === "text" && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>
                                        <Menu.Item className={menuItem()} onClick={() => setCellFormat(ri, ci, "number")}>
                                          Formato: Número
                                          {cell.style.format === "number" && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>
                                        <Menu.Item className={menuItem()} onClick={() => setCellFormat(ri, ci, "percent")}>
                                          Formato: Porcentaje
                                          {cell.style.format === "percent" && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>
                                        <Menu.Item className={menuItem()} onClick={() => startFormulaEditing(ri, ci)}>
                                          Formato: Fórmula
                                          {cell.style.format === "formula" && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                                        </Menu.Item>
                                      </Menu.Popup>
                                    </Menu.Positioner>
                                  </Menu.Portal>
                                </Menu.SubmenuRoot>

                                <Menu.Separator className="my-1 h-px bg-slate-200" />

                                {/* 4. Insertar fórmula */}
                                <Menu.Item
                                  className={menuItem()}
                                  onClick={() => startFormulaEditing(ri, ci)}
                                >
                                  <FunctionSquare className="h-4 w-4 text-slate-400" />
                                  <span>Insertar fórmula</span>
                                </Menu.Item>
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.Root>
                      )}
                    </td>
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
