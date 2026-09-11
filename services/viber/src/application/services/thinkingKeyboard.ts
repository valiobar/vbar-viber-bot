/**
 * Hardcoded Viber keyboards for the AI thinking indicator.
 * Not a KeyboardDTO — never stored in admin / never cached in BotDataService.
 */

export function buildThinkingKeyboard(gifUrl: string) {
  return {
    Type: "keyboard",
    DefaultHeight: false,
    InputFieldState: "hidden",
    Buttons: [
      {
        Columns: 6,
        Rows: 2,
        Text: "",
        ActionType: "none",
        ActionBody: "thinking",
        Silent: true,
        BgColor: "#7360F2",
        BgMedia: gifUrl,
        BgMediaType: "gif",
        BgMediaScaleType: "fit",
        BgLoop: true,
      },
    ],
  };
}

export function buildDismissKeyboard() {
  return {
    Type: "keyboard",
    DefaultHeight: false,
    InputFieldState: "regular",
    Buttons: [
      {
        Columns: 6,
        Rows: 1,
        Text: "",
        ActionType: "none",
        ActionBody: "dismiss",
        Silent: true,
      },
    ],
  };
}
