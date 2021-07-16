const path = require('path');

const ROOT = path.resolve( __dirname, 'action' );
const DESTINATION = path.resolve( __dirname, 'action/build' );

module.exports = () => {
	return {
		context: ROOT,
		entry: './index.ts',
		target: "node",
		output: {
			filename: 'index.js',
			path: DESTINATION
		},
		resolve: {
			extensions: ['.ts', '.js'],
			modules: [
					ROOT,
					'node_modules'
			]
		},
		module: {
			rules: [
				// all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
				{ test: /\.tsx?$/, loader: "ts-loader" }
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
