import { createTheme } from '@mui/material/styles';

const commonSettings = {
  typography: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#005A9C',
    },
    secondary: {
      main: '#495057',
    },
    background: {
      default: '#f4f7f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#212529',
      secondary: '#495057',
    },
  },
  ...commonSettings,
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1e88e5',
    },
    secondary: {
      main: '#adb5bd',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#b0bec5',
    },
  },
  ...commonSettings,
});