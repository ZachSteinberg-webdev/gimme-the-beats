import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
	globalIgnores(['dist']),
	{
		files: ['**/*.{js,jsx}'],
		extends: [js.configs.recommended, reactHooks.configs['recommended-latest'], reactRefresh.configs.vite],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
			parserOptions: {
				ecmaVersion: 'latest',
				ecmaFeatures: { jsx: true },
				sourceType: 'module'
			}
		},
		rules: {
			'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
			// Enforce hard tabs for indentation; width is controlled by editor/tab settings
			indent: ['error', 'tab', { SwitchCase: 1, VariableDeclarator: 1 }],
			'no-tabs': 'off',
			// Allow empty catch blocks (we intentionally swallow in some UI flows)
			'no-empty': ['error', { allowEmptyCatch: true }],
			// Our context files export non-components too
			'react-refresh/only-export-components': 'off'
		}
	}
]);
