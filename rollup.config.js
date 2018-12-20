import json from 'rollup-plugin-json'
import babel from 'rollup-plugin-babel'

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    strict: false,
    interop: false,
    format: 'cjs'
  },
  plugins: [
    json(),
    babel()
  ]
}
