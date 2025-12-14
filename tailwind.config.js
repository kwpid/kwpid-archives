/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                github: {
                    bg: '#0d1117',
                    'bg-secondary': '#161b22',
                    border: '#30363d',
                    text: '#c9d1d9',
                    'text-secondary': '#8b949e',
                    accent: '#238636',
                    'accent-hover': '#2ea44f',
                    'accent-text': '#3fb950',
                }
            }
        },
    },
    plugins: [],
}
