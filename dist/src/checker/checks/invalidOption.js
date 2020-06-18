"use strict";
/**
 * This error is triggered when a DROP statement
 * has an invalid option following the 'DROP'.
 *
 * It would trigger for this:
 *   DROP RUBBISH thing;
 * It wouldn't trigger for this:
 *   DROP TABLE test;
 */
Object.defineProperty(exports, "__esModule", { value: true });
const checkerResult_1 = require("../checkerResult");
const types_1 = require("../../lexer/types");
const sprintf_js_1 = require("sprintf-js");
const check_1 = require("../check");
class InvalidOption extends check_1.Check {
    constructor() {
        super(...arguments);
        this.message = "Option '%s' is not a valid option, must be one of '%s'.";
        this.additionalInformation = "";
        this.requiresConnection = false;
        this.appliesTo = ["select", "create", "update", "drop", "insert"];
    }
    check(query) {
        for (const line of query.lines) {
            for (const token of line.tokens) {
                if (token.type === types_1.Types.Option &&
                    !this.checker.options.includes(token.value)) {
                    return new checkerResult_1.CheckerResult(line.num, sprintf_js_1.sprintf(this.prefix + this.message, token.value, JSON.stringify(this.checker.options)));
                }
            }
        }
        return new checkerResult_1.CheckerResult(0, "");
    }
}
exports.InvalidOption = InvalidOption;
//# sourceMappingURL=invalidOption.js.map