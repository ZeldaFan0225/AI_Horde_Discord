const {rmSync, existsSync} = require("fs")
if(existsSync("./dist")) rmSync("./dist", {recursive: true})