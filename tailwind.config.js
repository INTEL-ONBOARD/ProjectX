/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                primary: {
                    50:  'var(--color-primary-50,  #F0EDFF)',
                    100: 'var(--color-primary-100, #E0DBFE)',
                    200: 'var(--color-primary-200, #C2B7FD)',
                    300: 'var(--color-primary-300, #A393FC)',
                    400: 'var(--color-primary-400, #856FFB)',
                    500: 'var(--color-primary-500, #5030E5)',
                    600: 'var(--color-primary-600, #4024C4)',
                    700: 'var(--color-primary-700, #301BA3)',
                    800: 'var(--color-primary-800, #201182)',
                    900: 'var(--color-primary-900, #100861)',
                },
                surface: {
                    50:  'var(--color-surface-50,  #FFFFFF)',
                    100: 'var(--color-surface-100, #F5F5F5)',
                    200: 'var(--color-surface-200, #EBEBEB)',
                    300: 'var(--color-surface-300, #D9D9D9)',
                },
                priority: {
                    low: '#D58D49',
                    'low-bg': '#DFA87433',
                    high: '#D8727D',
                    'high-bg': '#D8727D33',
                    completed: '#68B266',
                    'completed-bg': '#83C29D33',
                },
                column: {
                    todo: '#5030E5',
                    progress: '#FFA500',
                    done: '#8BC34A',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                card: '0px 4px 20px rgba(0, 0, 0, 0.08)',
                'card-hover': '0px 8px 28px rgba(0, 0, 0, 0.13)',
                sidebar: '2px 0px 8px rgba(0, 0, 0, 0.04)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'slide-in-left': 'slideInLeft 0.3s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'bounce-subtle': 'bounceSubtle 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-16px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(16px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                bounceSubtle: {
                    '0%': { transform: 'scale(0.97)' },
                    '50%': { transform: 'scale(1.02)' },
                    '100%': { transform: 'scale(1)' },
                },
            },
        },
    },
    plugins: [],
};
