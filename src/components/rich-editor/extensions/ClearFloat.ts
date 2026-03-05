import { Node } from "@tiptap/core";

export const ClearFloat = Node.create({
  name: "clearFloat",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  parseHTML() {
    return [{ tag: "div[data-clear-float]" }];
  },

  renderHTML() {
    return ["div", { "data-clear-float": "", class: "clear-float" }];
  },
});
