import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#A43F9B",
      dark: "#8a3583",
      light: "#b85aaf",
    },
    secondary: {
      main: "#6b7280",
    },
    background: {
      default: "#f5f5f7",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
    h1: { fontSize: "1.5rem", fontWeight: 700 },
    h2: { fontSize: "1.25rem", fontWeight: 600 },
    h3: { fontSize: "1.125rem", fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none" },
      },
    },
  },
});
