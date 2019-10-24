const path = require("path")
const jjencode = require('./jjencode');
const Aaencode = require('./aaencode');
const JsEncodePlugin = require('./JsEncodePlugin');
const Base64 = require('./base64');
const Obfuscator = require('./obfuscator');
module.exports = {

    entry: path.join(__dirname, "./src/main.js"),

    output: {
        path: path.join(__dirname, "./dist"),

        filename: "bundle.js"
    },
    plugins: [
        // new Aaencode({
        //     global: '$',
        //     jsReg: /.*\.(?:html|js)/,
        //     assetsPath: './aaencode/html'
        // }),
        new Obfuscator({
            global: '$',
            jsReg: /.*\.(?:html|js)/,
            assetsPath: './obfuscator/js'
        }),
        // new Base64({
        //     global: '$',
        //     jsReg: /.*\.(?:html|js)/,
        //     assetsPath: './base64/html'
        // }),
        // new JsEncodePlugin({
        //     global: '$',
        //     jsReg: /.*\.(?:html|js)/,
        //     assetsPath: './jjencode/html'
        // }),


    ]
}
