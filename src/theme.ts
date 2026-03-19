import { createTheme } from '@mantine/core';

/**
 * Mantine theme that mirrors the forest-green CSS custom properties in global.css.
 * Most visual styling is still in global.css; this theme wires up Mantine's
 * design-system primitives (color scheme, radius, font) so that any Mantine
 * components we use (Modal, etc.) inherit the same palette.
 */
export const theme = createTheme({
  primaryColor: 'forestGreen',
  colors: {
    forestGreen: [
      '#d0e8d8', // 0 – --green-pale
      '#aed4bc', // 1
      '#85bb9b', // 2
      '#5a9f7b', // 3
      '#3a845e', // 4
      '#2a6847', // 5
      '#1d6b42', // 6 – --green-light
      '#0a3322', // 7 – --green-mid
      '#013c36', // 8 – --green-dark
      '#001f1c', // 9
    ],
  },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  defaultRadius: 'md',
  breakpoints: {
    xs: '23.4375em', // 375 px — iPhone SE / 12 / 13 / 14 / 15
    sm: '30em',      // 480 px
    md: '48em',
    lg: '74em',
    xl: '90em',
  },
});
