#!/usr/bin/env node

import * as program from "commander";
import * as fs from "fs";
import * as os from "os";
import * as process from "process";

import { categorise, extractTableReference, tokenise } from "./lexer/lexer";
import { MissingWhere } from "./checker/Delete_MissingWhere";
import { OddCodePoint } from "./checker/Generic_OddCodePoint";
import { TableNotFound } from "./checker/Generic_TableNotFound";
import { IChecker } from "./checker/interface";
import { NullChecker } from "./checker/NullChecker";
import { DatabaseNotFound } from "./checker/Use_DatabaseNotFound";
import { Database } from "./database";
import { Select } from "./lexer/select";
import { Printer } from "./printer";
import {
  getQueryFromFile,
  getQueryFromLine,
  Line,
  Query
} from "./reader/reader";
import { Keyword } from "./lexer/tokens";


const version = "0.0.3";

program
  .version(version)
  .option("-f, --file <path>", "The .sql file to lint")
  .option("-q, --query <string>", "The query to lint")
  .option(
    "-v, --verbose",
    "Brings back information on the what it's linting and the tokens generated"
  )
  .option("--host <string>", "The host for the connection")
  .option("--user <string>", "The user for the connection")
  .option("--password <string>", "The password for the connection")
  .parse(process.argv);

let queries: Query[] = [];
let prefix: string = "";
const printer: Printer = new Printer();

const configFilePath = `${os.homedir}/.config/sql-lint/config.json`;

if (!fs.existsSync(configFilePath)) {
  console.log(`Config file not found at ${configFilePath}`);
  process.exit(1);
}

const config = JSON.parse(
  fs.readFileSync(configFilePath, "utf8")
);

if (program.query) {
  queries = getQueryFromLine(program.query);
  prefix = "query";
}

if (program.file) {
  queries = getQueryFromFile(program.file);
  prefix = program.file;
}

// Read from stdin if no args are supplied
if (!program.file && !program.query) {
  queries = getQueryFromLine(fs.readFileSync(0).toString());
  prefix = "stdin";
}

const db = new Database(
  program.host || config.host,
  program.user || config.user,
  program.password || config.password
);
const checkOddCodePoint = new OddCodePoint();
const checkMissingWhere = new MissingWhere();

queries.forEach(query => {
  const content = query.getContent().trim();

  if (content) {
    const category = categorise(content);
    const tokenised: Query = tokenise(query);

    query.lines.forEach(line => {
      line.tokens.forEach(token => {
        if (token[0] === "table_reference") {
          const reference = extractTableReference(token[1]);
          if (reference.database) {
            db.getTables(db.connection, reference.database, (results: any) => {
              const checker = new TableNotFound(results);
              printer.printCheck(checker, tokenised, prefix)
            });
          }
        }
      });
    });

    switch(category) {
      case Keyword.Select: {
        const checker = checkOddCodePoint;
        printer.printCheck(checker, tokenised, prefix);
        break;
      }

      case Keyword.Update:

        break;

      case Keyword.Use: {
        db.getDatabases(db.connection, (results: any) => {
          const checker = new DatabaseNotFound(results);
          printer.printCheck(checker, tokenised, prefix);
        });
        break;
      }

      case Keyword.Delete: {
        const checker = checkMissingWhere;
        printer.printCheck(checker, tokenised, prefix);
        break;
      }
    }
  }
});

db.connection.end();
