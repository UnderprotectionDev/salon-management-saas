export interface ShortcutEntry {
  keys: string;
  description: string;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutEntry[];
}

export const KEYBOARD_SHORTCUTS: ShortcutCategory[] = [
  {
    name: "Navigation",
    shortcuts: [
      { keys: "Arrow Keys", description: "Move between cells" },
      { keys: "Tab", description: "Move to next cell" },
      { keys: "Enter", description: "Move down one cell" },
      { keys: "Shift+Arrow", description: "Extend selection" },
      { keys: "F2", description: "Edit selected cell" },
      { keys: "Escape", description: "Cancel editing" },
    ],
  },
  {
    name: "Editing",
    shortcuts: [
      { keys: "Delete", description: "Clear cell content" },
      { keys: "=", description: "Start formula" },
      { keys: "Ctrl+D", description: "Fill down" },
      { keys: "Ctrl+R", description: "Fill right" },
      { keys: "Alt+=", description: "AutoSum" },
    ],
  },
  {
    name: "Formatting",
    shortcuts: [
      { keys: "Ctrl+B", description: "Bold" },
      { keys: "Ctrl+I", description: "Italic" },
      { keys: "Ctrl+U", description: "Underline" },
    ],
  },
  {
    name: "Clipboard",
    shortcuts: [
      { keys: "Ctrl+C", description: "Copy" },
      { keys: "Ctrl+X", description: "Cut" },
      { keys: "Ctrl+V", description: "Paste" },
      { keys: "Ctrl+Shift+V", description: "Paste special" },
    ],
  },
  {
    name: "View",
    shortcuts: [
      { keys: "Ctrl+F", description: "Find & replace" },
      { keys: "Ctrl+Z", description: "Undo" },
      { keys: "Ctrl+Y", description: "Redo" },
      { keys: "Ctrl+/", description: "Keyboard shortcuts" },
    ],
  },
];
