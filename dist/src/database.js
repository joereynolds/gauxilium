"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const anyDB = require("any-db");
class Database {
    constructor(driver, host, user, password, port) {
        this.connection = anyDB.createConnection(`${driver}://${user}:${password}@${host}:${port}`);
    }
    getDatabases(connection, callback) {
        connection.query("SHOW DATABASES", (error, results) => {
            if (error) {
                return console.log(error);
            }
            callback(results);
        });
    }
    /**
     * Runs an EXPLAIN on the query. If it doesn't run successfully, errors will come through,
     * which is what we want.
     */
    lintQuery(connection, query, callback) {
        connection.query(`EXPLAIN ${query}`, [], (error, results) => {
            if (error) {
                callback(error);
            }
        });
    }
}
exports.Database = Database;
//# sourceMappingURL=database.js.map