import { createTheme } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';

// Navy palette matched to existing design
const navy: MantineColorsTuple = [
  '#e7ecf7', // 0 - pale blue (highlighted rows bg)
  '#c9d5ef', // 1
  '#aabce6', // 2
  '#8ba3dc', // 3
  '#4473be', // 4 - green-light
  '#2558a8', // 5 - green-accent (primary shade)
  '#1e449a', // 6
  '#192d68', // 7 - green-mid
  '#0e1b3d', // 8 - green-dark (deepest navy)
  '#0a1530', // 9
];

export const theme = createTheme({
  primaryColor: 'navy',
  colors: { navy },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  defaultRadius: 'md',
  // Breakpoints tuned to phone widths for the distance grid
  breakpoints: {
    xs: '23.4375em', // 375px — iPhone SE / 12 / 13 / 14 / 15
    sm: '30em',      // 480px
    md: '48em',      // 768px
    lg: '62em',      // 992px
    xl: '75em',      // 1200px
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
