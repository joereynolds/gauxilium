import { Printer } from "./printer";
import { putContentIntoLines } from "./reader/reader";
import { JsonFormat } from "./formatter/formats/json";
import { CheckerRunner } from "./checker/checkerRunner";
import databaseFactory from "./database/databaseFactory";
import IDatabase from "./database/interface";

interface Parameters {
  sql: string
  host?: string
  user?: string
  port?: number
  driver?: string
  prefix?: string
  password?: string
  verbosity?: number
}

export default ({
  sql,
  host,
  port,
  user = '',
  prefix = '',
  password = '',
  verbosity = 0,
  driver = 'mysql',
}: Parameters): void => {
  const printer = new Printer(
    verbosity,
    new JsonFormat(),
  );

  let db: IDatabase|undefined;
  if (host) {
    db = databaseFactory(
      driver,
      host,
      user,
      password,
      port,
    )
  }

  const runner = new CheckerRunner();
  runner.run(
    putContentIntoLines(sql),
    printer,
    prefix,
    [],
    driver,
    db,
  )

  if (db) {
    db.end();
  }
}

interface SqlLintError {

}
