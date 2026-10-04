/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Surfaces
                ink: {
                    DEFAULT: '#07080B',
                    800: '#0C0E13',
                    700: '#11141B',
                    600: '#171B24',
                    500: '#222734',
                },
                // Text
                paper: { DEFAULT: '#F2EFE8', dim: '#CFCBC2' },
                muted: '#9BA1AE',
                faint: '#666C7A',
                // Brand
                lens: { DEFAULT: '#67E8F9', deep: '#22D3EE' },
                violet: { DEFAULT: '#A78BFA', deep: '#7C3AED' },
                // Verdict semantics
                real: '#34D399',
                fake: '#FB7185',
                unsure: '#FBBF24',
            },
            fontFamily: {
                display: ['Newsreader', 'Georgia', 'serif'],
                sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
            },
            fontSize: {
                'display-xl': ['clamp(3.4rem, 9vw, 9.5rem)', { lineHeight: '0.92', letterSpacing: '-0.035em' }],
                'display-lg': ['clamp(2.6rem, 6vw, 5.75rem)', { lineHeight: '0.98', letterSpacing: '-0.03em' }],
                'display-md': ['clamp(2rem, 4vw, 3.5rem)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
            },
            borderRadius: {
                '4xl': '2rem',
            },
            transitionTimingFunction: {
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
                'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
            },
            keyframes: {
                marquee: {
                    from: { transform: 'translate3d(0, 0, 0)' },
                    to: { transform: 'translate3d(-50%, 0, 0)' },
                },
                'marquee-reverse': {
                    from: { transform: 'translate3d(-50%, 0, 0)' },
                    to: { transform: 'translate3d(0, 0, 0)' },
                },
                shimmer: {
                    from: { transform: 'translateX(-100%)' },
                    to: { transform: 'translateX(100%)' },
                },
                'spin-slow': {
                    to: { transform: 'rotate(360deg)' },
                },
                'pulse-dot': {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.4', transform: 'scale(0.8)' },
                },
            },
            animation: {
                marquee: 'marquee var(--marquee-duration, 60s) linear infinite',
                'marquee-reverse': 'marquee-reverse var(--marquee-duration, 60s) linear infinite',
                shimmer: 'shimmer 1.6s ease-in-out infinite',
                'spin-slow': 'spin-slow 24s linear infinite',
                'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}
