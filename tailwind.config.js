/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // CRIMSON VOID - OLED Optimized Palette
                void: {
                    pure: '#000000',      // True OLED black
                    deep: '#050505',      // Barely perceptible surface
                    surface: '#0a0a0a',   // Card backgrounds
                    elevated: '#0f0f0f',  // Modal/overlay backgrounds
                    border: '#1a1a1a',    // Subtle borders
                },
                crimson: {
                    50: '#fff1f1',
                    100: '#ffe1e1',
                    200: '#ffc7c7',
                    300: '#ffa0a0',
                    400: '#ff6b6b',
                    500: '#ff3a3a',        // Primary crimson
                    600: '#ed1515',        // Vibrant accent
                    700: '#c80d0d',
                    800: '#a50f0f',
                    900: '#881414',
                    950: '#4b0404',        // Deep blood
                },
                ember: {
                    glow: 'rgba(255, 58, 58, 0.15)',
                    pulse: 'rgba(255, 58, 58, 0.08)',
                    trace: 'rgba(255, 58, 58, 0.03)',
                },
                text: {
                    primary: '#ffffff',
                    secondary: '#a0a0a0',
                    muted: '#606060',
                    ghost: '#303030',
                }
            },
            fontFamily: {
                mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'monospace'],
                display: ['Inter', 'system-ui', 'sans-serif'],
                etched: ['Archivo Black', 'Impact', 'sans-serif'],
            },
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],
                'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
                'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.01em' }],
                'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0' }],
                'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
                '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
                '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.03em' }],
                '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.04em' }],
                '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
            },
            boxShadow: {
                'crimson-glow': '0 0 20px rgba(255, 58, 58, 0.3), 0 0 40px rgba(255, 58, 58, 0.1)',
                'crimson-intense': '0 0 30px rgba(255, 58, 58, 0.5), 0 0 60px rgba(255, 58, 58, 0.2)',
                'void-lift': '0 10px 40px rgba(0, 0, 0, 0.8)',
                'void-float': '0 20px 60px rgba(0, 0, 0, 0.9)',
            },
            animation: {
                'pulse-slow': 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'heartbeat': 'heartbeat 2s ease-in-out infinite',
                'glitch': 'glitch 0.3s ease-in-out',
                'materialize': 'materialize 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'dematerialize': 'dematerialize 0.3s cubic-bezier(0.7, 0, 0.84, 0)',
                'float': 'float 6s ease-in-out infinite',
                'charge': 'charge 0.15s ease-out',
                'release': 'release 0.2s ease-out',
                'rift-open': 'rift-open 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                'rift-close': 'rift-close 0.3s cubic-bezier(0.7, 0, 0.84, 0)',
                'border-pulse': 'border-pulse 2s ease-in-out infinite',
            },
            keyframes: {
                'pulse-slow': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
                'heartbeat': {
                    '0%, 100%': {
                        transform: 'scale(1)',
                        boxShadow: '0 0 0 rgba(255, 58, 58, 0)',
                    },
                    '15%': {
                        transform: 'scale(1.02)',
                        boxShadow: '0 0 20px rgba(255, 58, 58, 0.2)',
                    },
                    '30%': {
                        transform: 'scale(1)',
                        boxShadow: '0 0 0 rgba(255, 58, 58, 0)',
                    },
                    '45%': {
                        transform: 'scale(1.01)',
                        boxShadow: '0 0 15px rgba(255, 58, 58, 0.15)',
                    },
                },
                'glitch': {
                    '0%': { transform: 'translate(0)' },
                    '20%': { transform: 'translate(-2px, 2px)' },
                    '40%': { transform: 'translate(-2px, -2px)' },
                    '60%': { transform: 'translate(2px, 2px)' },
                    '80%': { transform: 'translate(2px, -2px)' },
                    '100%': { transform: 'translate(0)' },
                },
                'materialize': {
                    '0%': {
                        opacity: '0',
                        transform: 'scale(0.9) translateY(10px)',
                        filter: 'blur(10px)',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'scale(1) translateY(0)',
                        filter: 'blur(0)',
                    },
                },
                'dematerialize': {
                    '0%': {
                        opacity: '1',
                        transform: 'scale(1)',
                        filter: 'blur(0)',
                    },
                    '100%': {
                        opacity: '0',
                        transform: 'scale(0.95)',
                        filter: 'blur(5px)',
                    },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'charge': {
                    '0%': { transform: 'scale(1)' },
                    '100%': { transform: 'scale(0.95)' },
                },
                'release': {
                    '0%': { transform: 'scale(0.95)' },
                    '50%': { transform: 'scale(1.02)' },
                    '100%': { transform: 'scale(1)' },
                },
                'rift-open': {
                    '0%': {
                        opacity: '0',
                        transform: 'scale(0.8)',
                        clipPath: 'circle(0% at 50% 50%)',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'scale(1)',
                        clipPath: 'circle(150% at 50% 50%)',
                    },
                },
                'rift-close': {
                    '0%': {
                        opacity: '1',
                        transform: 'scale(1)',
                        clipPath: 'circle(150% at 50% 50%)',
                    },
                    '100%': {
                        opacity: '0',
                        transform: 'scale(0.9)',
                        clipPath: 'circle(0% at 50% 50%)',
                    },
                },
                'border-pulse': {
                    '0%, 100%': {
                        borderColor: 'rgba(255, 58, 58, 0.3)',
                    },
                    '50%': {
                        borderColor: 'rgba(255, 58, 58, 0.6)',
                    },
                },
            },
            backgroundImage: {
                'crimson-gradient': 'linear-gradient(135deg, rgba(255, 58, 58, 0.1) 0%, transparent 50%)',
                'void-gradient': 'radial-gradient(ellipse at center, #0a0a0a 0%, #000000 100%)',
                'scanlines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
            },
            backdropBlur: {
                'void': '20px',
            },
            transitionTimingFunction: {
                'bounce-subtle': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
                'ease-in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
            },
        },
    },
    plugins: [],
}
