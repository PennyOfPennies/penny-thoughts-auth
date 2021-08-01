module.exports = {
	"plugins": [
		"react",
		"react-hooks",
		"@typescript-eslint"
	],
	"rules": {
		"object-curly-spacing": ["error", "always"],
		"semi":["warn", "never"],
		"comma-dangle": ["warn", "never"],
		"@typescript-eslint/indent": ["warn", "tab", {
			"MemberExpression": 1,
			"SwitchCase": 1
		}],
		"no-console": "off",
		"react/prop-types": "off",
		"react-hooks/rules-of-hooks": "error",
		"react-hooks/exhaustive-deps": "warn",
		
		"@typescript-eslint/no-empty-interface": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/explicit-function-return-type": "off",
		"no-unused-vars": "off",
		"@typescript-eslint/interface-name-prefix": "off",
		"@typescript-eslint/no-unused-vars": ["warn", {
			"argsIgnorePattern": "^_"
		}],
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-non-null-assertion": "off",
		"@typescript-eslint/no-empty-function": "off",
		
		"@typescript-eslint/class-name-casing": "off",
		"quotes": ["warn", "double"],
		"react/require-render-return": ["off"]
	},
	"env": {
		"browser": true,
		"es6": true,
		"node": true,
		"jest": true
	},
	"extends": [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:react/recommended"
	],
	"parser": "@typescript-eslint/parser",
	"parserOptions": {
		"ecmaVersion": 2020,
		"sourceType": "module",
		"ecmaFeatures": {
			"jsx": true
		}
	},
	"settings": {
		"react": {
			"version": "detect"
		}
	},
};
