import * as fs from "fs";
import { Line } from "./line";
import { Query } from "./query";
import { Keyword } from "../syntax/keywords";

/**
 * Grabs the querie(s) from the --file flag
 */
export function getQueryFromFile(file: string, verbosity: number): Query[] {
  const contents = fs.readFileSync(file, "utf8");
  if (verbosity) {
    console.log("Reading " + file + "...");
  }
  return putContentIntoLines(contents);
}

export function putContentIntoLines(contents: string): Query[] {
  let lineNumber = 1;
  const queriesFromFile: Query[] = [];
  let currentQueryContent: string = "";
  let query = new Query();
  const skipChars = ["", Keyword.Newline, Keyword.WindowsNewline];

  // Clean up the query as best we can to leave raw SQL behind to be lexed.
  // Note this currently does it in a very simplistic fashion using regexs so
  // will be prone to error for more complex files.
  // TO-DO: replace with proper lexer.
  contents = stripComments(contents);
  contents = stripLanguages(contents);
  contents = sanitiseQuotes(contents);
  contents = stripRegexes(contents);

  for (let i = 0; i < contents.length; i++) {
    if (!skipChars.includes(contents[i])) {
      currentQueryContent += contents[i];
    }

    if (contents[i] === Keyword.Newline) {
      if (currentQueryContent.length > 0) {
        query.lines.push(new Line(currentQueryContent, lineNumber));
      }
      currentQueryContent = "";
      lineNumber++;
    }

    if (contents[i] === ";") {
      if (currentQueryContent.length > 0) {
        query.lines.push(new Line(currentQueryContent, lineNumber));
      }
      queriesFromFile.push(query);
      query = new Query();
      currentQueryContent = "";
    }

    // Once at the end of the file, push the current query even if it
    // doesn't end in a semi-colon.
    if (i + 1 === contents.length && query.lines.length > 0) {
      queriesFromFile.push(query);
    }
  }

  return queriesFromFile;
}

/**
 * Function to escape any special characters in a string to allow
 * it to be passed to build a regex.
 * Based on https://stackoverflow.com/a/32212181/2144578
 */
function regexEscape(str: string): string {
  str = str.replace(/([\\\.\^\$\*\+\-\?\(\)\[\]\{\}\|])/g, "\\$1");
  return str;
}

/**
 * Strips content between two delimeters starting with a regex
 * Works across multiple lines (hence the name!) but preserves the newlines
 * themselves to allow error reporting to reflect source lines.
 *
 * Note this currently does it in a very simplistic fashion using regexs so
 * will be prone to error for more complex files.
 * TO-DO: replace with proper lexer.
 */
function multiLineReplace(
  content: string,
  startRegex: string,
  startDelimiter: string,
  endDelimiter: string
): string {
  // Build up a regex capturing both any start pattern,
  // and the matched between the two delimeters
  const regex = new RegExp(
    "(" +
      startRegex +
      ")" +
      "(" +
      regexEscape(startDelimiter) +
      ".*?" +
      regexEscape(endDelimiter) +
      ")",
    "gsi"
  );

  // Preserve new lines but delete anything else between the separators
  const match = regex.exec(content) || [];
  // You should get two matches - 1 for the start regex, one for the delimated
  if (match.length >= 2) {
    // Replace everything between the delimters except newlines
    // Note .* will not match newline without /s flag
    const newlines = match[2].replace(/.*/g, "");
    // Now replace whole regex with just the newlines left over
    // We do a split/join rather than replace in case we have special chars
    content = content.split(match[0]).join(match[1] + newlines);
  }
  return content;
}

/**
 * Strip comments as may contain SQL-like syntax which can confuse the lexer
 * Preserve new lines so output line numbers still match source
 *
 * Note this currently does it in a very simplistic fashion using regexs so
 * will be prone to error for more complex files.
 * TO-DO: replace with proper lexer.
 */
function stripComments(content: string): string {
  // Add a new line to end in case not there to make regex matching easier
  if (content[-1] !== "\n") {
    content = content + "\n";
  }

  // Remove any content after a dash comment until end of line
  // Assume a comment either starts the content, or on a newline
  // or with a space (e.g. "select -- this is a comment"). This is
  // very simplicistic but reduces risk of incorrect matches for now.
  let commentRegex = new RegExp("^" + Keyword.CommentDash + ".*?\n", "g");
  content = content.replace(commentRegex, "\n");
  commentRegex = new RegExp("\n" + Keyword.CommentDash + ".*?\n", "g");
  content = content.replace(commentRegex, "\n\n");
  commentRegex = new RegExp(" " + Keyword.CommentDash + " .*?\n", "g");
  content = content.replace(commentRegex, "\n");
  // Repeat above for the other comment type
  commentRegex = new RegExp("^" + Keyword.CommentHash + ".*?\n", "g");
  content = content.replace(commentRegex, "\n");
  commentRegex = new RegExp("\n" + Keyword.CommentHash + ".*?\n", "g");
  content = content.replace(commentRegex, "\n\n");
  commentRegex = new RegExp(" " + Keyword.CommentHash + " .*?\n", "g");
  content = content.replace(commentRegex, "\n");

  // Remove any content in a multi-line comment - but preserve new lines
  content = multiLineReplace(
    content,
    "",
    Keyword.CommentMultiLineStart,
    Keyword.CommentMultiLineEnd
  );

  return content;
}

/**
 * Strip out anything of the format:
 *   language js as $$ ... $$
 * Even over multi-lines
 *
 * Note this currently does it in a very simplistic fashion using regexs so
 * will be prone to error for more complex files.
 * TO-DO: replace with proper lexer.
 */
function stripLanguages(content: string): string {
  // The separator ($$) is above example can be different so find it
  const startLanguageRegex = /language\s*\w*\s*as\s*([^\s]*)/gis;

  // Iterate though all separators and remove the non-SQL code
  let result;
  while ((result = startLanguageRegex.exec(content)) !== null) {
    const separator = result[1].trim();
    content = multiLineReplace(
      content,
      "language\\s*\\w*\\s*as\\s*",
      separator,
      separator
    );
  }

  return content;
}

/**
 * Sanitise quotes to remove ; which confuses lexer
 *
 * Note this currently does it in a very simplistic fashion using regexs so
 * will be prone to error for more complex files.
 * TO-DO: replace with proper lexer.
 */
function sanitiseQuotes(content: string): string {
  let result;

  // Then remove any ; from within single quotes
  const singleQuoteRegex = /('[^']*?')/gs;
  while ((result = singleQuoteRegex.exec(content)) !== null) {
    const matchedQuote = result[0];
    const sanitisedResult = matchedQuote.replace(/;/gs, "");
    if (matchedQuote !== sanitisedResult) {
      // We do a split/join rather than replace in case we have special chars
      content = content.split(matchedQuote).join(sanitisedResult);
    }
  }

  // Then remove any ; from within double quotes
  const doubleQuoteRegex = /("[^"]*?")/gi;
  while ((result = doubleQuoteRegex.exec(content)) !== null) {
    const matchedQuote = result[0] + "";
    const sanitisedResult = matchedQuote.replace(/;/gs, "");
    if (matchedQuote !== sanitisedResult) {
      // We do a split/join rather than replace in case we have special chars
      content = content.split(matchedQuote).join(sanitisedResult);
    }
  }

  return content;
}

/**
 * Strip regexes which contain many special characters that can confuse the lexer
 *
 * Note this currently does it in a very simplistic fashion using regexs so
 * will be prone to error for more complex files.
 * TO-DO: replace with proper lexer.
 */
function stripRegexes(content: string): string {
  // Let's just remove Regexs as they are just painful to deal with when lexing
  content = content.replace(
    /REGEXP_REPLACE\(.*, r'.*?'\)/gi,
    "REGEXP_REPLACE()"
  );
  content = content.replace(
    /REGEXP_CONTAINS\(.*, r'.*?'\)/gi,
    "REGEXP_CONTAINS()"
  );

  return content;
}

/**
 * Grabs the query from the --query flag
 * Line is always 0 since there are no
 * lines on the terminal.
 */
export function getQueryFromLine(query: string): Query[] {
  return putContentIntoLines(query);
}
