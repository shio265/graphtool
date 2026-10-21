"use client";

import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  typography: { fontFamily: "var(--font-primary)", fontSize: 14 },
  shape: { borderRadius: 6 },
  palette: { primary: { main: "#0088cc" } },
  components: {
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: { defaultProps: { disableElevation: true, disableRipple: true } },
    MuiInputBase: { defaultProps: { disableInjectingGlobalStyles: true } },
  },
});

export function MaterialProvider({ children }: { children: ReactNode }) {
  return <AppRouterCacheProvider options={{ enableCssLayer: true }}>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </AppRouterCacheProvider>;
}
