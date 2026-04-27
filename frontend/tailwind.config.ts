import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', md: '1.5rem', lg: '2rem' },
      screens: { xl: '1240px' },
    },
    extend: {
      colors: {
        brand: {
          green: {
            DEFAULT: '#0E5C3A',
            50: '#EAF5EF',
            100: '#CDE6D7',
            500: '#0E5C3A',
            600: '#0B4A2F',
            700: '#083824',
          },
          orange: {
            DEFAULT: '#F26B2B',
            50: '#FEEFE6',
            100: '#FBD8C3',
            500: '#F26B2B',
            600: '#E25A1B',
          },
          cream: {
            DEFAULT: '#FBEFE2',
            50: '#FFF8F0',
            100: '#FBEFE2',
            200: '#F5E2CB',
          },
          ink: '#1F2937',
        },
      },
      fontFamily: {
        sans: ['var(--font-app)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};

export default config;
