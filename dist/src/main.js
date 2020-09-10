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
const file_1 = require("./file");
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
    .option("--config <string>", "The path to the configuration file")
    .parse(process.argv);
let queries = [];
let prefix = "";
const formatterFactory = new formatterFactory_1.FormatterFactory();
const format = formatterFactory.build(program.format);
const printer = new printer_1.Printer(program.verbose, format);
const configuration = config_1.getConfiguration(program.config || config_1.file);
const runner = new checkerRunner_1.CheckerRunner();
const programFile = program.args[0];
if (program.fix) {
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
    printer.printFix(query);
    process.exit(0);
}
if (programFile && !fs.existsSync(programFile)) {
    printer.warnAboutFileNotFound(programFile);
    process.exit(1);
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
let db;
if (configuration === null) {
    printer.warnAboutNoConfiguration(config_1.file);
}
if (program.host || (configuration === null || configuration === void 0 ? void 0 : configuration.host)) {
    db = new database_1.Database(program.driver || (configuration === null || configuration === void 0 ? void 0 : configuration.driver) || "mysql", program.host || (configuration === null || configuration === void 0 ? void 0 : configuration.host) || "localhost", program.user || (configuration === null || configuration === void 0 ? void 0 : configuration.user) || "root", // bad practice but unfortunately common, make it easier for the user
    program.password || (configuration === null || configuration === void 0 ? void 0 : configuration.password), program.port || (configuration === null || configuration === void 0 ? void 0 : configuration.port) || "3306");
}
if (programFile) {
    if (fs.lstatSync(programFile).isDirectory()) {
        const sqlFiles = file_1.findByExtension(programFile, "sql");
        sqlFiles.forEach((sqlFile) => {
            queries = reader_1.getQueryFromFile(sqlFile, program.verbose);
            runner.run(queries, printer, sqlFile, omittedErrors, db);
        });
    }
    else {
        queries = reader_1.getQueryFromFile(programFile, program.verbose);
        prefix = programFile;
    }
}
runner.run(queries, printer, prefix, omittedErrors, db);
if (program.host || (configuration === null || configuration === void 0 ? void 0 : configuration.host)) {
    db.connection.end();
}
//# sourceMappingURL=main.js.map