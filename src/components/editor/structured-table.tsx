import React, { useState, useRef, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { Popover, PopoverTrigger, PopoverContent } from "./ui";
import { cn } from "./cn";
import {
  Plus,
  Trash2,
  X,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Calendar as CalendarIcon,
  Link as LinkIcon,
  Mail,
  Phone,
  Hash,
  Type as TypeIcon,
  CheckSquare as CheckSquareIcon,
  ChevronUp,
  Settings,
  ArrowUp,
  ArrowDown,
  Copy,
} from "lucide-react";

export type ColumnType =
  | "text"
  | "number"
  | "checkbox"
  | "date"
  | "url"
  | "email"
  | "phone"
  | "select"
  | "multiselect";

export interface Column {
  id: string;
  title: string;
  type: ColumnType;
  width: number;
  options?: string[]; // Possible values for select and multiselect
}

export interface Row {
  id: string;
  height: number;
  [key: string]: any;
}

export interface TableState {
  columns: Column[];
  rows: Row[];
}

interface StructuredTableProps {
  initialState?: string; // JSON string
  onChange?: (state: string) => void;
  isEditable?: boolean;
  selected?: boolean;
}

export default function StructuredTable({
  initialState,
  onChange,
  isEditable = true,
  selected = false,
}: StructuredTableProps) {
  // Parsing initial state or setting default
  const [state, setState] = useState<TableState>(() => {
    if (initialState) {
      try {
        const parsed = JSON.parse(initialState);
        if (parsed.columns && parsed.rows) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse structured table state:", e);
      }
    }
    return {
      columns: [
        { id: "title", title: "Title", type: "text", width: 180 },
        { id: "elementos", title: "Elementos", type: "text", width: 180 },
      ],
      rows: [
        { id: "row-1", height: 40, title: "Fila de Ejemplo 1", elementos: "Dato A" },
        { id: "row-2", height: 40, title: "Fila de Ejemplo 2", elementos: "Dato B" },
      ],
    };
  });

  // Local UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  // Sorting & Filtering States
  const [sortConfig, setSortConfig] = useState<{ columnId: string; direction: "asc" | "desc" | null }>({
    columnId: "",
    direction: null,
  });
  const [filterConfig, setFilterConfig] = useState<{
    columnId: string;
    operator: "contains" | "equals" | "greaterThan" | "lessThan" | "isEmpty" | "isNotEmpty";
    value: string;
  }>({
    columnId: "",
    operator: "contains",
    value: "",
  });

  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  const [showAddColumnModal, setShowAddColumnPopover] = useState(false);
  
  // New column creation form state
  const [newColTitle, setNewColTitle] = useState("");
  const [newColType, setNewColType] = useState<ColumnType>("text");
  const [newColOptionsText, setNewColOptionsText] = useState(""); // For select and multiselect

  // Inline Cell Editing State
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);

  // Column header dropdown + edit field state
  const [columnMenuColId, setColumnMenuColId] = useState<string | null>(null);
  const [editingFieldColId, setEditingFieldColId] = useState<string | null>(null);
  const [editColTitle, setEditColTitle] = useState("");
  const [editColType, setEditColType] = useState<ColumnType>("text");
  const [editColOptionsText, setEditColOptionsText] = useState("");

  // Resize State
  const resizingCol = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  // Row Selection State
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);

  // Drag & Drop State
  const [dragOver, setDragOver] = useState<{ rowId: string; position: "before" | "after" } | null>(null);
  const dragIdsRef = useRef<string[]>([]);

  // Propagate changes up to parent (LiveEditor)
  const updateParent = (newState: TableState) => {
    if (onChange) {
      onChange(JSON.stringify(newState));
    }
  };

  const handleStateChange = (updated: TableState) => {
    setState(updated);
    updateParent(updated);
  };

  const handleRenameColumn = (colId: string, newTitle: string) => {
    const updatedCols = state.columns.map((c) => {
      if (c.id === colId) {
        return { ...c, title: newTitle };
      }
      return c;
    });
    handleStateChange({ ...state, columns: updatedCols });
  };

  // Open the "Edit Field" form for a column
  const handleOpenEditField = (col: Column) => {
    setEditColTitle(col.title);
    setEditColType(col.type);
    setEditColOptionsText((col.options || []).join(", "));
    setEditingFieldColId(col.id);
  };

  // Apply the edited field (title, type, options)
  const handleUpdateColumn = () => {
    if (!editingFieldColId || !editColTitle.trim()) return;
    const options =
      editColType === "select" || editColType === "multiselect"
        ? editColOptionsText
            .split(",")
            .map((o) => o.trim())
            .filter((o) => o.length > 0)
        : undefined;

    const updatedCols = state.columns.map((c) =>
      c.id === editingFieldColId
        ? { ...c, title: editColTitle.trim(), type: editColType, options }
        : c
    );

    // Normalize existing values when switching to checkbox
    const updatedRows =
      editColType === "checkbox"
        ? state.rows.map((row) => ({ ...row, [editingFieldColId]: false }))
        : state.rows;

    handleStateChange({ columns: updatedCols, rows: updatedRows });
    setEditingFieldColId(null);
    setColumnMenuColId(null);
  };

  // Add Column
  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    const colId = "col_" + Date.now();
    const options =
      newColType === "select" || newColType === "multiselect"
        ? newColOptionsText
            .split(",")
            .map((o) => o.trim())
            .filter((o) => o.length > 0)
        : undefined;

    const newColumn: Column = {
      id: colId,
      title: newColTitle.trim(),
      type: newColType,
      width: 150,
      options,
    };

    const updatedColumns = [...state.columns, newColumn];
    const updatedRows = state.rows.map((row) => ({
      ...row,
      [colId]: newColType === "checkbox" ? false : "",
    }));

    const updatedState = { columns: updatedColumns, rows: updatedRows };
    handleStateChange(updatedState);

    // Reset Form
    setNewColTitle("");
    setNewColType("text");
    setNewColOptionsText("");
    setShowAddColumnPopover(false);
  };

  // Delete Column
  const handleDeleteColumn = (colId: string) => {
    const updatedColumns = state.columns.filter((c) => c.id !== colId);
    const updatedRows = state.rows.map((row) => {
      const newRow = { ...row };
      delete newRow[colId];
      return newRow;
    });

    handleStateChange({ columns: updatedColumns, rows: updatedRows });
  };

  // Add Row
  const handleAddRow = () => {
    const rowId = "row_" + Date.now();
    const newRow: Row = {
      id: rowId,
      height: 40,
    };
    state.columns.forEach((col) => {
      newRow[col.id] = col.type === "checkbox" ? false : "";
    });

    handleStateChange({
      columns: state.columns,
      rows: [...state.rows, newRow],
    });
  };

  // Row selection helpers
  const createEmptyRow = (): Row => {
    const rowId = "row_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const newRow: Row = { id: rowId, height: 40 };
    state.columns.forEach((col) => {
      newRow[col.id] = col.type === "checkbox" ? false : "";
    });
    return newRow;
  };

  const toggleRowSelection = (rowId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const insertRowAt = (rowId: string, position: "above" | "below") => {
    const idx = state.rows.findIndex((r) => r.id === rowId);
    if (idx === -1) return;
    const newRow = createEmptyRow();
    const rows = [...state.rows];
    rows.splice(position === "above" ? idx : idx + 1, 0, newRow);
    handleStateChange({ columns: state.columns, rows });
  };

  const duplicateRow = (rowId: string) => {
    const idx = state.rows.findIndex((r) => r.id === rowId);
    if (idx === -1) return;
    const original = state.rows[idx];
    const newRow = { ...original, id: createEmptyRow().id };
    const rows = [...state.rows];
    rows.splice(idx + 1, 0, newRow);
    handleStateChange({ columns: state.columns, rows });
  };

  const deleteRows = (ids: Set<string>) => {
    handleStateChange({
      columns: state.columns,
      rows: state.rows.filter((r) => !ids.has(r.id)),
    });
    setSelectedRows(new Set());
  };

  const moveRows = (ids: string[], targetRowId: string, position: "before" | "after") => {
    const idSet = new Set(ids);
    if (idSet.has(targetRowId)) return;
    const rows = [...state.rows];
    const selected = rows.filter((r) => idSet.has(r.id));
    const remaining = rows.filter((r) => !idSet.has(r.id));
    let idx = remaining.findIndex((r) => r.id === targetRowId);
    if (idx === -1) return;
    if (position === "after") idx += 1;
    const newRows = [...remaining.slice(0, idx), ...selected, ...remaining.slice(idx)];
    handleStateChange({ columns: state.columns, rows: newRows });
  };

  const handleRowContextMenu = (e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedRows.has(rowId)) {
      setSelectedRows(new Set([rowId]));
    }
    setContextMenu({ x: e.clientX, y: e.clientY, rowId });
  };

  const handleRowDragStart = (e: React.DragEvent, rowId: string) => {
    let ids: string[];
    if (selectedRows.has(rowId)) {
      ids = state.rows.filter((r) => selectedRows.has(r.id)).map((r) => r.id);
    } else {
      const only = new Set([rowId]);
      setSelectedRows(only);
      ids = [rowId];
    }
    dragIdsRef.current = ids;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ids.join(","));
  };

  const handleRowDragOver = (e: React.DragEvent, rowId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDragOver((prev) =>
      prev && prev.rowId === rowId && prev.position === position
        ? prev
        : { rowId, position }
    );
  };

  const handleRowDrop = (e: React.DragEvent, rowId: string) => {
    e.preventDefault();
    const ids = dragIdsRef.current;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    if (ids.length > 0) {
      moveRows(ids, rowId, position);
    }
    dragIdsRef.current = [];
    setDragOver(null);
  };

  const handleRowDragEnd = () => {
    dragIdsRef.current = [];
    setDragOver(null);
  };

  // Close context menu on outside click / escape / scroll
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const closeOnEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", closeOnEsc);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", closeOnEsc);
      document.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  // Update Cell Value
  const handleUpdateCell = (rowId: string, colId: string, val: any) => {
    const updatedRows = state.rows.map((row) => {
      if (row.id === rowId) {
        return { ...row, [colId]: val };
      }
      return row;
    });
    handleStateChange({ columns: state.columns, rows: updatedRows });
  };

  // Drag-to-resize Column Width
  const handleColResizeStart = (e: React.MouseEvent, index: number, currentWidth: number) => {
    e.preventDefault();
    resizingCol.current = {
      index,
      startX: e.clientX,
      startWidth: currentWidth,
    };
    document.addEventListener("mousemove", handleColResizeMove);
    document.addEventListener("mouseup", handleColResizeStop);
  };

  const handleColResizeMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const { index, startX, startWidth } = resizingCol.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(40, startWidth + diff);

    const updatedCols = state.columns.map((col, idx) => {
      if (idx === index) {
        return { ...col, width: newWidth };
      }
      return col;
    });

    setState((prev) => ({ ...prev, columns: updatedCols }));
  };

  const handleColResizeStop = () => {
    if (resizingCol.current) {
      updateParent(state);
    }
    resizingCol.current = null;
    document.removeEventListener("mousemove", handleColResizeMove);
    document.removeEventListener("mouseup", handleColResizeStop);
  };

  // Cleanup Event Listeners on Unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleColResizeMove);
      document.removeEventListener("mouseup", handleColResizeStop);
    };
  }, [state]);

  // Filtering & Sorting Process
  const filteredAndSortedRows = React.useMemo(() => {
    let result = [...state.rows];

    // 1. Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) => {
        return state.columns.some((col) => {
          const val = row[col.id];
          if (val === undefined || val === null) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // 2. Column-specific Filter
    if (filterConfig.columnId) {
      const { columnId, operator, value } = filterConfig;

      result = result.filter((row) => {
        const val = row[columnId];
        if (operator === "isEmpty") return val === undefined || val === null || val === "";
        if (operator === "isNotEmpty") return val !== undefined && val !== null && val !== "";

        if (val === undefined || val === null) return false;

        const stringVal = String(val).toLowerCase();
        const testVal = value.toLowerCase();

        switch (operator) {
          case "equals":
            return stringVal === testVal;
          case "contains":
            return stringVal.includes(testVal);
          case "greaterThan":
            return Number(val) > Number(value);
          case "lessThan":
            return Number(val) < Number(value);
          default:
            return true;
        }
      });
    }

    // 3. Sorting
    if (sortConfig.columnId && sortConfig.direction) {
      const { columnId, direction } = sortConfig;
      const targetCol = state.columns.find((c) => c.id === columnId);
      const isNum = targetCol?.type === "number";

      result.sort((a, b) => {
        const valA = a[columnId];
        const valB = b[columnId];

        if (valA === valB) return 0;
        if (valA === undefined || valA === null || valA === "") return 1;
        if (valB === undefined || valB === null || valB === "") return -1;

        if (isNum) {
          return direction === "asc"
            ? Number(valA) - Number(valB)
            : Number(valB) - Number(valA);
        }

        return direction === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [state, searchQuery, filterConfig, sortConfig]);

  return (
    <div className="group/table my-4 relative overflow-visible text-slate-800 text-sm select-none w-full">
      {/* Toolbar - Top Right: search, add row, filters, add column (only when selected) */}
      {isEditable && selected && (
        <div className="relative z-50 flex items-center justify-end gap-1.5 mb-1.5">
        {/* SEARCH BAR (Toggled) */}
        {showSearch && (
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 max-w-[150px] animate-in fade-in slide-in-from-right-2 duration-150">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()} // Prevent Tiptap capture
              className="w-full text-xs focus:outline-none bg-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
        )}

        {/* Icon 1: Search SVG */}
        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className={cn(
            "p-1.5 rounded-lg border hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer",
            showSearch ? "bg-slate-100 border-slate-200" : "bg-white border-slate-200"
          )}
          title="Buscar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon icon-tabler icons-tabler-outline icon-tabler-search"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
            <path d="M21 21l-6 -6" />
          </svg>
        </button>

        {/* Icon 2: Add Row SVG */}
        <button
          type="button"
          onClick={handleAddRow}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          title="Añadir Fila"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon icon-tabler icons-tabler-outline icon-tabler-square-rounded-plus"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 3c7.2 0 9 1.8 9 9c0 7.2 -1.8 9 -9 9c-7.2 0 -9 -1.8 -9 -9c0 -7.2 1.8 -9 9 -9" />
            <path d="M15 12h-6" />
            <path d="M12 9v6" />
          </svg>
        </button>

        {/* Icon 3: Adjustments Horizontal SVG (Filters & Sorting Popover) */}
        <button
          type="button"
          onClick={() => setShowFiltersPopover(!showFiltersPopover)}
          className={cn(
            "p-1.5 rounded-lg border hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer",
            showFiltersPopover ? "bg-slate-100 border-slate-200" : "bg-white border-slate-200"
          )}
          title="Filtro y Ordenación"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon icon-tabler icons-tabler-outline icon-tabler-adjustments-horizontal"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M4 6l8 0" />
            <path d="M16 6l4 0" />
            <path d="M6 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M4 12l2 0" />
            <path d="M10 12l10 0" />
            <path d="M15 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M4 18l11 0" />
            <path d="M19 18l1 0" />
          </svg>
        </button>

        {/* Añadir Campo button */}
        <Popover open={showAddColumnModal} onOpenChange={setShowAddColumnPopover}>
          <PopoverTrigger className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            Añadir Campo
          </PopoverTrigger>

          <PopoverContent className="w-64 p-3.5 text-slate-700 font-normal bg-white border border-slate-200 rounded-xl shadow-xl z-[9999]" align="end">
            <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-slate-100">
              <span className="font-semibold text-xs text-slate-800">Nuevo Campo</span>
              <button type="button" onClick={() => setShowAddColumnPopover(false)}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej. Cantidad, Estado..."
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tipo de Campo</label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as ColumnType)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="checkbox">Casilla de Verificación</option>
                  <option value="date">Fecha</option>
                  <option value="url">URL</option>
                  <option value="email">Correo</option>
                  <option value="phone">Teléfono</option>
                  <option value="select">Selección Única</option>
                  <option value="multiselect">Selección Múltiple</option>
                </select>
              </div>

              {(newColType === "select" || newColType === "multiselect") && (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Valores Posibles (separados por coma)</label>
                  <input
                    type="text"
                    placeholder="Ej: Pendiente, Activo, Completado"
                    value={newColOptionsText}
                    onChange={(e) => setNewColOptionsText(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleAddColumn}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-center cursor-pointer"
              >
                Crear Campo
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* FLOATING WINDOW: Filtro y Ordenar Popover */}
        {showFiltersPopover && (
          <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-left font-normal">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                  Filtrar y Ordenar
                </span>
                <button onClick={() => setShowFiltersPopover(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              </div>

              {/* FILTRAR SECTION */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Filtro</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Select Column */}
                    <select
                      value={filterConfig.columnId}
                      onChange={(e) =>
                        setFilterConfig((prev) => ({
                          ...prev,
                          columnId: e.target.value,
                          value: "", // Reset value on col change
                        }))
                      }
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">-- Elegir Campo --</option>
                      {state.columns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>

                    {/* Select Operator */}
                    <select
                      value={filterConfig.operator}
                      onChange={(e) =>
                        setFilterConfig((prev) => ({
                          ...prev,
                          operator: e.target.value as any,
                        }))
                      }
                      disabled={!filterConfig.columnId}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs disabled:opacity-50"
                    >
                      <option value="contains">Contiene</option>
                      <option value="equals">Es igual a</option>
                      <option value="greaterThan">Mayor que</option>
                      <option value="lessThan">Menor que</option>
                      <option value="isEmpty">Está vacío</option>
                      <option value="isNotEmpty">No está vacío</option>
                    </select>
                  </div>

                  {/* Value Input */}
                  {filterConfig.operator !== "isEmpty" && filterConfig.operator !== "isNotEmpty" && (
                    <input
                      type="text"
                      placeholder="Valor del filtro..."
                      value={filterConfig.value}
                      disabled={!filterConfig.columnId}
                      onChange={(e) =>
                        setFilterConfig((prev) => ({
                          ...prev,
                          value: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    />
                  )}

                  {filterConfig.columnId && (
                    <button
                      onClick={() =>
                        setFilterConfig({
                          columnId: "",
                          operator: "contains",
                          value: "",
                        })
                      }
                      className="text-[10px] text-rose-500 hover:underline flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Limpiar Filtro
                    </button>
                  )}
                </div>
              </div>

              {/* ORDENAR SECTION */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ordenar</h4>
                <div className="grid grid-cols-2 gap-2">
                  {/* Sort Column */}
                  <select
                    value={sortConfig.columnId}
                    onChange={(e) =>
                      setSortConfig((prev) => ({
                        ...prev,
                        columnId: e.target.value,
                        direction: prev.direction || "asc",
                      }))
                    }
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- Sin Ordenar --</option>
                    {state.columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>

                  {/* Sort Direction */}
                  <select
                    value={sortConfig.direction || ""}
                    onChange={(e) =>
                      setSortConfig((prev) => ({
                        ...prev,
                        direction: (e.target.value as any) || null,
                      }))
                    }
                    disabled={!sortConfig.columnId}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs disabled:opacity-50"
                  >
                    <option value="asc">Ascendente</option>
                    <option value="desc">Descendente</option>
                  </select>
                </div>

                {sortConfig.columnId && (
                  <button
                    onClick={() =>
                      setSortConfig({
                        columnId: "",
                        direction: null,
                      })
                    }
                    className="text-[10px] text-rose-500 hover:underline flex items-center gap-1 mt-2"
                  >
                    <X className="w-3 h-3" /> Limpiar Orden
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Table Scrolling Area */}
      <div className="overflow-x-auto w-full relative max-h-[600px] overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-sm mt-3.5">
        <table className="border-collapse table-fixed w-max min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 h-10 select-none">
              {/* Row Index Header Column */}
              <th className="w-[40px] px-1 text-center align-top text-xs font-semibold text-slate-500 border-r border-slate-200 relative shrink-0">
                #
              </th>

              {/* Dynamic Columns Headers */}
              {state.columns.map((col, idx) => (
                <th
                  key={col.id}
                  style={{ width: col.width }}
                  className="px-3 text-left align-top text-xs font-semibold text-slate-600 border-r border-slate-200 relative group truncate"
                >
                  <div className="flex items-center justify-between w-full h-full pr-1">
                    {editingColId === col.id ? (
                      <input
                        type="text"
                        value={col.title}
                        autoFocus
                        onChange={(e) => handleRenameColumn(col.id, e.target.value)}
                        onBlur={() => setEditingColId(null)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") setEditingColId(null);
                          if (e.key === "Escape") setEditingColId(null);
                        }}
                        className="bg-white border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-slate-800 w-full focus:outline-none font-normal"
                      />
                    ) : (
                      <span
                        onClick={() => isEditable && setEditingColId(col.id)}
                        className="flex items-center gap-1.5 truncate cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded transition-colors"
                        title="Click para renombrar"
                      >
                        {getColumnIcon(col.type)}
                        {col.title}
                      </span>
                    )}

                    {/* Column Delete Button for Custom Columns (not title/elementos initial ones) */}
                    <div className="flex items-center shrink-0">
                      {isEditable && col.id !== "title" && col.id !== "elementos" && (
                        <button
                          onClick={() => handleDeleteColumn(col.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded text-rose-500 transition-opacity ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Column dropdown: sort + edit field */}
                      {isEditable && (
                        <Popover
                          open={columnMenuColId === col.id}
                          onOpenChange={(open) => setColumnMenuColId(open ? col.id : null)}
                        >
                          <PopoverTrigger className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </PopoverTrigger>

                          <PopoverContent className="w-48 p-1.5 text-xs text-slate-700 font-normal" align="end">
                            {editingFieldColId === col.id ? (
                              <div className="space-y-2.5 p-1">
                                <span className="block text-[11px] font-semibold text-slate-800">Editar Campo</span>

                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nombre</label>
                                  <input
                                    type="text"
                                    value={editColTitle}
                                    autoFocus
                                    onChange={(e) => setEditColTitle(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    className="w-full px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tipo de Campo</label>
                                  <select
                                    value={editColType}
                                    onChange={(e) => setEditColType(e.target.value as ColumnType)}
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                                  >
                                    <option value="text">Texto</option>
                                    <option value="number">Número</option>
                                    <option value="checkbox">Casilla de Verificación</option>
                                    <option value="date">Fecha</option>
                                    <option value="url">URL</option>
                                    <option value="email">Correo</option>
                                    <option value="phone">Teléfono</option>
                                    <option value="select">Selección Única</option>
                                    <option value="multiselect">Selección Múltiple</option>
                                  </select>
                                </div>

                                {(editColType === "select" || editColType === "multiselect") && (
                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Valores Posibles (separados por coma)</label>
                                    <input
                                      type="text"
                                      placeholder="Ej: Pendiente, Activo"
                                      value={editColOptionsText}
                                      onChange={(e) => setEditColOptionsText(e.target.value)}
                                      onKeyDown={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                )}

                                <div className="flex gap-1.5 pt-0.5">
                                  <button
                                    onClick={handleUpdateColumn}
                                    className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors cursor-pointer"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingFieldColId(null);
                                      setColumnMenuColId(null);
                                    }}
                                    className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-medium transition-colors cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="py-0.5">
                                <button
                                  onClick={() => {
                                    setSortConfig({ columnId: col.id, direction: "asc" });
                                    setColumnMenuColId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-md flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  Ordenar Primero → Último
                                </button>
                                <button
                                  onClick={() => {
                                    setSortConfig({ columnId: col.id, direction: "desc" });
                                    setColumnMenuColId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-md flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  Último → Primero
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button
                                  onClick={() => handleOpenEditField(col)}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-md flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  Editar Campo
                                </button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>

                  {/* Width Resize Handle */}
                  {isEditable && (
                    <div
                      onMouseDown={(e) => handleColResizeStart(e, idx, col.width)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-indigo-400/50 active:bg-indigo-500 z-10 transition-colors"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredAndSortedRows.map((row, rowIndex) => {
              const isSelected = selectedRows.has(row.id);
              const showBefore = dragOver?.rowId === row.id && dragOver.position === "before";
              const showAfter = dragOver?.rowId === row.id && dragOver.position === "after";

              return (
                <Fragment key={row.id}>
                  {showBefore && (
                    <tr className="h-0.5">
                      <td colSpan={state.columns.length + 1} className="p-0 border-0">
                        <div className="h-0.5 bg-indigo-500" />
                      </td>
                    </tr>
                  )}

                  <tr
                    onContextMenu={(e) => isEditable && handleRowContextMenu(e, row.id)}
                    onDragOver={(e) => isEditable && handleRowDragOver(e, row.id)}
                    onDrop={(e) => isEditable && handleRowDrop(e, row.id)}
                    className={cn(
                      "group border-b border-slate-150 transition-colors",
                      isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50/30"
                    )}
                  >
                    {/* Row Number Index / Selection Checkbox */}
                    <td
                      draggable={isEditable}
                      onDragStart={(e) => isEditable && handleRowDragStart(e, row.id)}
                      onDragEnd={handleRowDragEnd}
                      className="px-1 text-center align-top text-xs font-semibold text-slate-400 border-r border-slate-200 bg-slate-50/40 relative select-none cursor-pointer"
                      onClick={() => isEditable && toggleRowSelection(row.id)}
                    >
                      <div className="relative flex items-center justify-center w-full min-h-[1.75rem]">
                        <span
                          className={cn(
                            "transition-opacity duration-100",
                            isSelected && "opacity-0"
                          )}
                        >
                          {rowIndex + 1}
                        </span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className={cn(
                            "absolute h-3.5 w-3.5 text-indigo-600 rounded border-slate-300 pointer-events-none transition-opacity duration-100",
                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        />
                      </div>
                    </td>

                    {/* Cells representing Column Values */}
                    {state.columns.map((col) => {
                      const val = row[col.id];
                      const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === col.id;

                      return (
                        <td
                          key={col.id}
                          onClick={() => isEditable && col.type !== "checkbox" && setEditingCell({ rowId: row.id, columnId: col.id })}
                          className={cn(
                            "px-3 py-1.5 border-r border-slate-200 text-xs font-normal align-top relative whitespace-pre-wrap break-words",
                            col.type === "number" && "text-right",
                            col.type === "checkbox" && "text-center"
                          )}
                        >
                          {isEditing ? (
                            <div className="bg-white">
                              {renderCellEditor(col, row.id, val)}
                            </div>
                          ) : (
                            <div className="w-full whitespace-pre-wrap break-words">
                              {renderCellValue(col, val)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {showAfter && (
                    <tr className="h-0.5">
                      <td colSpan={state.columns.length + 1} className="p-0 border-0">
                        <div className="h-0.5 bg-indigo-500" />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Row Context Menu */}
      {contextMenu &&
        isEditable &&
        createPortal(
          <div
            className="fixed z-[9999] w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedRows.size === 1 ? (
              <>
                <ContextMenuItem
                  icon={ArrowUp}
                  label="Insertar fila encima"
                  onClick={() => {
                    insertRowAt(contextMenu.rowId, "above");
                    setContextMenu(null);
                  }}
                />
                <ContextMenuItem
                  icon={ArrowDown}
                  label="Insertar fila debajo"
                  onClick={() => {
                    insertRowAt(contextMenu.rowId, "below");
                    setContextMenu(null);
                  }}
                />
                <ContextMenuItem
                  icon={Copy}
                  label="Duplicar"
                  onClick={() => {
                    duplicateRow(contextMenu.rowId);
                    setContextMenu(null);
                  }}
                />
                <div className="h-px bg-slate-100 my-1" />
                <ContextMenuItem
                  icon={Trash2}
                  label="Eliminar"
                  danger
                  onClick={() => {
                    deleteRows(new Set([contextMenu.rowId]));
                    setContextMenu(null);
                  }}
                />
              </>
            ) : (
              <ContextMenuItem
                icon={Trash2}
                label={`Eliminar filas (${selectedRows.size})`}
                danger
                onClick={() => {
                  deleteRows(new Set(selectedRows));
                  setContextMenu(null);
                }}
              />
            )}
          </div>,
          document.body
        )}
    </div>
  );

  // Render cell text/value nicely when NOT editing
  function renderCellValue(col: Column, val: any) {
    if (val === undefined || val === null || val === "") {
      if (col.type === "checkbox") {
        return (
          <input
            type="checkbox"
            checked={false}
            disabled={!isEditable}
            onChange={(e) => handleUpdateCell(editingCell?.rowId || "", col.id, e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
        );
      }
      return <span className="text-slate-300 italic">vacío</span>;
    }

    switch (col.type) {
      case "checkbox":
        return (
          <input
            type="checkbox"
            checked={!!val}
            disabled={!isEditable}
            onChange={(e) => handleUpdateCell(rowIdFromValue(col.id, val), col.id, e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mx-auto"
          />
        );
      case "url":
        return (
          <a
            href={val}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()} // Click URL shouldn't trigger edit mode
            className="text-blue-600 hover:underline flex items-start gap-1 break-all"
          >
            <LinkIcon className="w-3 h-3 shrink-0" />
            {val}
          </a>
        );
      case "email":
        return (
          <span className="flex items-start gap-1 break-all">
            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
            {val}
          </span>
        );
      case "phone":
        return (
          <span className="flex items-start gap-1 break-all">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
            {val}
          </span>
        );
      case "select":
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full text-[10px] font-medium max-w-full break-words">
            {val}
          </span>
        );
      case "multiselect":
        const badges = Array.isArray(val) ? val : String(val).split(",").map((v) => oTrim(v));
        return (
          <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
            {badges.map((b, idx) => (
              <span
                key={idx}
                className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded text-[9px] font-medium"
              >
                {b}
              </span>
            ))}
          </div>
        );
      default:
        return <span>{String(val)}</span>;
    }
  }

  // helper because typescript
  function oTrim(v: string) {
    return v.trim();
  }

  // Find row ID for checkbox change (since it doesn't enter edit mode)
  function rowIdFromValue(colId: string, val: any): string {
    const matchedRow = state.rows.find((r) => r[colId] === val);
    return matchedRow ? matchedRow.id : "";
  }

  // Render Cell Input/Selector during Editing
  function renderCellEditor(col: Column, rowId: string, val: any) {
    const handleBlur = () => {
      setEditingCell(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      e.stopPropagation(); // VERY IMPORTANT: Stop TipTap capturing keys!
      if (e.key === "Enter") {
        setEditingCell(null);
      }
      if (e.key === "Escape") {
        setEditingCell(null);
      }
    };

    switch (col.type) {
      case "number":
        return (
          <input
            type="number"
            autoFocus
            value={val === undefined ? "" : val}
            onChange={(e) => handleUpdateCell(rowId, col.id, e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full px-1.5 py-1 text-xs border border-indigo-500 rounded focus:outline-none"
          />
        );
      case "date":
        return (
          <input
            type="date"
            autoFocus
            value={val || ""}
            onChange={(e) => handleUpdateCell(rowId, col.id, e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full px-1.5 py-1 text-xs border border-indigo-500 rounded focus:outline-none"
          />
        );
      case "select":
        return (
          <select
            autoFocus
            value={val || ""}
            onChange={(e) => handleUpdateCell(rowId, col.id, e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-full px-1.5 py-1 text-xs border border-indigo-500 rounded focus:outline-none bg-white"
          >
            <option value="">-- Vacío --</option>
            {col.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "multiselect":
        const currentSelected = Array.isArray(val)
          ? val
          : val
          ? String(val).split(",").map((v) => v.trim())
          : [];
        
        const toggleOption = (opt: string) => {
          let updated: string[];
          if (currentSelected.includes(opt)) {
            updated = currentSelected.filter((s) => s !== opt);
          } else {
            updated = [...currentSelected, opt];
          }
          handleUpdateCell(rowId, col.id, updated);
        };

        return (
          <div
            onBlur={handleBlur}
            className="w-full max-h-[120px] overflow-y-auto border border-indigo-500 rounded p-1 bg-white flex flex-col gap-1 z-30"
          >
            {col.options?.map((opt) => {
              const checked = currentSelected.includes(opt);
              return (
                <label key={opt} className="flex items-center gap-1.5 px-1 py-0.5 hover:bg-slate-50 cursor-pointer rounded">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(opt)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span className="text-[11px]">{opt}</span>
                </label>
              );
            })}
            <button
              onClick={() => setEditingCell(null)}
              className="text-[10px] text-center text-indigo-600 font-semibold mt-1 border-t pt-1 border-slate-100 w-full"
            >
              Listo
            </button>
          </div>
        );
      default:
        return (
          <textarea
            autoFocus
            rows={1}
            value={val === undefined ? "" : val}
            onChange={(e) => handleUpdateCell(rowId, col.id, e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") setEditingCell(null);
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            className="w-full px-1.5 py-1 text-xs border border-indigo-500 rounded focus:outline-none resize-none overflow-hidden leading-snug whitespace-pre-wrap break-words"
          />
        );
    }
  }
}

// Icon Helper based on column types
function getColumnIcon(type: ColumnType) {  switch (type) {
    case "number":
      return <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "checkbox":
      return <CheckSquareIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "date":
      return <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "url":
      return <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "email":
      return <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "phone":
      return <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    case "select":
    case "multiselect":
      return <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    default:
      return <TypeIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  }
}

// Context menu item used in the row right-click dropdown
function ContextMenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-100 transition-colors",
        danger ? "text-rose-600" : "text-slate-700"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5 shrink-0", danger ? "text-rose-500" : "text-slate-400")} />
      {label}
    </button>
  );
}
