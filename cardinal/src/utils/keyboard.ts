type ModifierKeyState = {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

type ModifierKeyOptions = {
  includeAlt?: boolean;
  includeShift?: boolean;
};

export const hasModifierKey = (
  event: ModifierKeyState,
  { includeAlt = true, includeShift = true }: ModifierKeyOptions = {},
): boolean =>
  (includeAlt && event.altKey) ||
  event.ctrlKey ||
  event.metaKey ||
  (includeShift && event.shiftKey);

/** Returns true while an input method editor is composing text. */
export const isComposingKeyboardEvent = (event: KeyboardEvent): boolean =>
  event.isComposing || event.keyCode === 229 || event.which === 229;
