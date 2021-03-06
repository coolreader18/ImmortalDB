//
// ImmortalDB - A resilient key-value store for browsers.
//
// Ansgar Grunseid
// grunseid.com
// grunseid@gmail.com
//
// License: MIT
//

//
// Build production bundles with
//
//   npm run build
//
// Run webpack in development mode with
//
//   npm run dev
//

const path = require('path')
const webpack = require('webpack')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

function abspath (p) {
    return path.resolve(__dirname, p)
}

module.exports = (env, argv) => ({
    entry: {
        'immortal-db': abspath('src/index.js'),
        ...(argv.mode === 'production' &&
            {'immortal-db.min': abspath('src/index.js')}),
    },
    output: {
        library: 'ImmortalDB',
        filename: '[name].js',
        path: abspath('./dist'),
    },
    optimization: {
        minimizer: [
            new UglifyJsPlugin({
                test: /\.min\.js(\?.*)?$/i,
            }),
        ]
    }
})
