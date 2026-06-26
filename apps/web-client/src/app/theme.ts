import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "actionBlue",
  fontFamily: '"SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      '"SF Pro Display", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: "600"
  },
  colors: {
    actionBlue: [
      "#eaf3ff",
      "#d6e8ff",
      "#a9d0ff",
      "#78b5ff",
      "#4e9dff",
      "#2c87f4",
      "#0066cc",
      "#005bb8",
      "#004f9f",
      "#004384"
    ],
    appleInk: [
      "#f5f5f7",
      "#e8e8ed",
      "#d2d2d7",
      "#b8b8bf",
      "#86868b",
      "#6e6e73",
      "#515154",
      "#333336",
      "#272729",
      "#1d1d1f"
    ]
  },
  defaultRadius: "md"
});
