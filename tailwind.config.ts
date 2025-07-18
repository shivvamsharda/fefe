import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))', // Black background
				foreground: 'hsl(var(--foreground))', // White text
				primary: {
					DEFAULT: 'hsl(var(--primary))', // Neon Green
					foreground: 'hsl(var(--primary-foreground))' // Black text for primary buttons
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))', // Dark Gray for secondary elements
					foreground: 'hsl(var(--secondary-foreground))' // White text for secondary elements
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))', // Darker gray for muted states
					foreground: 'hsl(var(--muted-foreground))' // Lighter gray text
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))', // Hot Pink
					foreground: 'hsl(var(--accent-foreground))' // White text for accent elements
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))', // Dark gray for popovers
					foreground: 'hsl(var(--popover-foreground))' // White text
				},
				card: {
					DEFAULT: 'hsl(var(--card))', // Dark gray for cards
					foreground: 'hsl(var(--card-foreground))' // White text
				},
				sidebar: {
					DEFAULT: 'hsl(var(--background))', // Or a slightly different dark shade
					foreground: 'hsl(var(--foreground))',
					primary: 'hsl(var(--primary))',
					'primary-foreground': 'hsl(var(--primary-foreground))',
					accent: 'hsl(var(--accent))',
					'accent-foreground': 'hsl(var(--accent-foreground))',
					border: 'hsl(var(--border))',
					ring: 'hsl(var(--ring))'
				},
				solana: { // Re-purposing 'solana' for new brand colors
					DEFAULT: 'hsl(var(--primary))',      // Neon Green
					foreground: 'hsl(var(--primary-foreground))', // Black text
					secondary: 'hsl(var(--accent))',     // Hot Pink (for gradients, etc.)
					dark: 'hsl(var(--background))',      // Black
					accent: 'hsl(var(--primary))',       // Neon Green
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'pulse-glow': {
					'0%, 100%': {
						filter: 'drop-shadow(0 0 5px hsl(var(--primary)))' // Neon Green glow
					},
					'50%': {
						filter: 'drop-shadow(0 0 15px hsl(var(--primary)))' // Neon Green glow
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.4s ease-out',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
			},
			fontFamily: {
				'space': ['"Space Grotesk"', 'sans-serif'],
				'inter': ['Inter', 'sans-serif']
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
