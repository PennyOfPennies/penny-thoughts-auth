const path = require('path');

const DESTINATION = path.resolve( __dirname, 'build' );

module.exports = () => {
	return {
		entry: './src/index.ts',
		target: 'node',
		output: {
			filename: 'index.js',
			path: DESTINATION
		},
		resolve: {
			extensions: ['.ts', '.js']
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: "ts-loader",
					exclude: [/node_modules/],
				},
			]
		},
		mode: `production`,
		optimization: {
			minimize: true,
		},
		performance: {
			hints: false,
		}
	}
}
