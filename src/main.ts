#!/usr/bin/env node

import * as program from "commander";
import * as fs from "fs";
import * as process from "process";

import { CheckerRunner } from "./checker/checkerRunner";
import { Database } from "./database";
import { FormatterFactory } from "./formatter/formatterFactory";
import { Printer } from "./printer";
import { Query } from "./reader/query";
import { file, getConfiguration } from "./config";
import { getQueryFromFile, getQueryFromLine } from "./reader/reader";
import { version } from "../package.json";
import { Fixer } from "./fixer";
import { findByExtension } from "./file";

function increaseVerbosity(v: any, total: any) {
  return total + 1;
}

program
  .version(version)
  .option("--fix [string]", "The .sql string to fix")
  .option(
    "-d, --driver <string>",
    "The driver to use, must be one of ['mysql', 'postgres']"
  )
  .option(
    "-v, --verbose",
    "Brings back information on the what it's linting and the tokens generated",
    increaseVerbosity,
    0
  )
  .option(
    "--format <string>",
    "The format of the output, can be one of ['simple', 'json']",
    "simple"
  )
  .option("--host <string>", "The host for the connection")
  .option("--user <string>", "The user for the connection")
  .option("--password <string>", "The password for the connection")
  .option("--port <string>", "The port for the connection")
  .option("--config <string>", "The path to the configuration file")
  .parse(process.argv);

let queries: Query[] = [];
let prefix: string = "";

const formatterFactory = new FormatterFactory();
const format = formatterFactory.build(program.format);
const printer: Printer = new Printer(program.verbose, format);
const configuration = getConfiguration(program.config || file);
const runner = new CheckerRunner();
const programFile = program.args[0];

if (program.fix) {
  let query: Query[];

  // Read from stdin if nothing is specified.
  // We default to '-'' if no argument is supplied to --fix
  // so we don't nag the user
  if (typeof program.fix === "boolean") {
    query = getQueryFromLine(fs.readFileSync(0).toString());
  } else {
    query = getQueryFromLine(program.fix);
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
  queries = getQueryFromLine(fs.readFileSync(0).toString());
  prefix = "stdin";
}

let omittedErrors: string[] = [];
if (configuration !== null && "ignore-errors" in configuration) {
  omittedErrors = configuration["ignore-errors"] || [];
}

let db: any;

if (configuration === null) {
  printer.warnAboutNoConfiguration(file);
}

if (program.host || configuration?.host) {
  db = new Database(
    program.driver || configuration?.driver || "mysql",
    program.host || configuration?.host || "localhost",
    program.user || configuration?.user || "root", // bad practice but unfortunately common, make it easier for the user
    program.password || configuration?.password,
    program.port || configuration?.port || "3306"
  );
}

if (programFile) {
  if (fs.lstatSync(programFile).isDirectory()) {
    const sqlFiles = findByExtension(programFile, "sql");
    sqlFiles.forEach((sqlFile) => {
      queries = getQueryFromFile(sqlFile, program.verbose);
      runner.run(queries, printer, sqlFile, omittedErrors, db);
    });
  } else {
    queries = getQueryFromFile(programFile, program.verbose);
    prefix = programFile;
  }
}

runner.run(queries, printer, prefix, omittedErrors, db);

if (program.host || configuration?.host) {
  db.connection.end();
}
