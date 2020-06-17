"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckerResult = void 0;
/**
 * Every 'checker' brings back a result of type CheckerResult.
 */
class CheckerResult {
    constructor(line, content) {
        this.line = line;
        this.content = content;
    }
}
exports.CheckerResult = CheckerResult;
//# sourceMappingURL=checkerResult.js.map