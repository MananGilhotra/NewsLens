/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Custom cyber-intelligence color palette
                'cyber': {
                    'dark': '#0a0a0f',
                    'darker': '#050508',
                    'card': '#12121a',
                    'border': '#1a1a2e',
                },
                'glow': {
                    'cyan': '#00ffff',
                    'green': '#00ff88',
                    'red': '#ff0044',
                    'purple': '#8844ff',
                    'yellow': '#ffcc00',
                }
            },
            fontFamily: {
                'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
                'display': ['Orbitron', 'sans-serif'],
            },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'scan-line': 'scan-line 3s linear infinite',
                'data-stream': 'data-stream 20s linear infinite',
                'flicker': 'flicker 0.15s infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
                    '50%': { opacity: '1', transform: 'scale(1.05)' },
                },
                'scan-line': {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100vh)' },
                },
                'data-stream': {
                    '0%': { backgroundPosition: '0% 0%' },
                    '100%': { backgroundPosition: '0% 100%' },
                },
                'flicker': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' },
                }
            },
            boxShadow: {
                'glow-cyan': '0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 255, 255, 0.3)',
                'glow-green': '0 0 20px rgba(0, 255, 136, 0.5), 0 0 40px rgba(0, 255, 136, 0.3)',
                'glow-red': '0 0 20px rgba(255, 0, 68, 0.5), 0 0 40px rgba(255, 0, 68, 0.3)',
                'glow-purple': '0 0 20px rgba(136, 68, 255, 0.5), 0 0 40px rgba(136, 68, 255, 0.3)',
            }
        },
    },
    plugins: [],
}
