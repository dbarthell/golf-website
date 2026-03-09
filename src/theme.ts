import { createTheme } from '@mantine/core';

/**
 * Mantine theme that mirrors the navy CSS custom properties in global.css.
 * Most visual styling is still in global.css; this theme wires up Mantine's
 * design-system primitives (color scheme, radius, font) so that any Mantine
 * components we use (Modal, etc.) inherit the same palette.
 */
export const theme = createTheme({
  primaryColor: 'navy',
  colors: {
    navy: [
      '#e7ecf7', // 0 – --green-pale
      '#c5d1eb',
      '#9fb5db',
      '#7298cb',
      '#4473be', // 4 – --green-light
      '#2558a8', // 5 – --green-accent
      '#1e4a8e',
      '#172d50', // 7 – --green-mid
      '#10223c', // 8 – --green-dark
      '#080f22',
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
