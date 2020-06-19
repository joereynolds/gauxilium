#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const fs = require("fs");
const process = require("process");
const checkerRunner_1 = require("./checker/checkerRunner");
const database_1 = require("./database");
const formatterFactory_1 = require("./formatter/formatterFactory");
const printer_1 = require("./printer");
const config_1 = require("./config");
const reader_1 = require("./reader/reader");
const package_json_1 = require("../package.json");
const fixer_1 = require("./fixer");
function increaseVerbosity(v, total) {
    return total + 1;
}
program
    .version(package_json_1.version)
    .option("--fix [string]", "The .sql string to fix")
    .option("-d, --driver <string>", "The driver to use, must be one of ['mysql', 'postgres']")
    .option("-v, --verbose", "Brings back information on the what it's linting and the tokens generated", increaseVerbosity, 0)
    .option("--format <string>", "The format of the output, can be one of ['simple', 'json']", "simple")
    .option("--host <string>", "The host for the connection")
    .option("--user <string>", "The user for the connection")
    .option("--password <string>", "The password for the connection")
    .option("--port <string>", "The port for the connection")
    .parse(process.argv);
let queries = [];
let prefix = "";
const formatterFactory = new formatterFactory_1.FormatterFactory();
const format = formatterFactory.build(program.format);
const printer = new printer_1.Printer(program.verbose, format);
const configuration = config_1.getConfiguration(config_1.file);
const runner = new checkerRunner_1.CheckerRunner();
const programFile = process.argv[2];
if (program.fix) {
    const fixer = new fixer_1.Fixer();
    let query;
    // Read from stdin if nothing is specified.
    // We default to '-'' if no argument is supplied to --fix
    // so we don't nag the user
    if (typeof program.fix === "boolean") {
        query = reader_1.getQueryFromLine(fs.readFileSync(0).toString());
    }
    else {
        query = reader_1.getQueryFromLine(program.fix);
    }
    const fixed = fixer.fix(query[0]);
    console.log(fixed);
    process.exit(0);
}
if (programFile && !programFile.startsWith('--')) {
    if (!fs.existsSync(programFile)) {
        printer.warnAboutFileNotFound(programFile);
        process.exit(0);
    }
    queries = reader_1.getQueryFromFile(programFile);
    prefix = programFile;
}
// Read from stdin if no args are supplied
if (!programFile) {
    queries = reader_1.getQueryFromLine(fs.readFileSync(0).toString());
    prefix = "stdin";
}
let omittedErrors = [];
if (configuration !== null && "ignore-errors" in configuration) {
    omittedErrors = configuration["ignore-errors"] || [];
}
if (configuration === null) {
    printer.warnAboutNoConfiguration(config_1.file);
    runner.run(queries, printer, prefix, omittedErrors);
    process.exit(0);
}
const db = new database_1.Database(program.driver || configuration.driver || "mysql", program.host || configuration.host, program.user || configuration.user, program.password || configuration.password, program.port || configuration.port || "3306");
runner.run(queries, printer, prefix, omittedErrors, db);
db.connection.end();
//# sourceMappingURL=main.js.map