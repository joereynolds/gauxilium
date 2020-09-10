import {
  putContentIntoLines,
  getQueryFromLine,
} from "../../../src/reader/reader";
import { Query } from "../../../src/reader/query";
import { Line } from "../../../src/reader/line";

beforeEach(() => {
  this.query = new Query();
  this.query.lines = [
    new Line("DELETE", 1),
    new Line(" FROM ", 2),
    new Line(" person WHERE ", 4),
    new Line(" age > 5;", 5),
  ];

  this.queryWithoutSemiColon = new Query();
  this.queryWithoutSemiColon.lines = [
    new Line("DELETE", 1),
    new Line(" FROM ", 2),
    new Line(" person WHERE ", 4),
    new Line(" age > 5", 5),
  ];

  this.queryWithComments = new Query();
  this.queryWithComments.lines = [
    new Line("DELETE", 1),
    new Line(" FROM ", 2),
    new Line(" person WHERE ", 4),
    new Line(" age > 5;", 6),
  ];

  this.queryWithFunction = new Query();
  this.queryWithFunction.lines = [
    new Line("CREATE FUNCTION xor (a BOOLEAN, b BOOLEAN)", 1),
    new Line("RETURNS BOOLEAN", 2),
    new Line("IMMUTABLE LANGUAGE sql", 3),
    new Line("AS ", 4),
    new Line(";", 6),
  ];

  this.queryWithSemicolonSingleQuote = new Query();
  this.queryWithSemicolonSingleQuote.lines = [
    new Line("SELECT *", 1),
    new Line(" FROM ", 2),
    new Line(" person ", 3),
    new Line(" WHERE ", 4),
    new Line(" name = 'Barry';", 5),
  ];

  this.queryWithSemicolonDoubleQuote = new Query();
  this.queryWithSemicolonDoubleQuote.lines = [
    new Line("SELECT *", 1),
    new Line(" FROM ", 2),
    new Line(" person ", 3),
    new Line(" WHERE ", 4),
    new Line(" name = \"Barry\";", 5),
  ];
});

test("We correctly read a file", () => {
  const expected: any = [this.query];
  const input = "DELETE\n FROM \n\n person WHERE \n age > 5;";
  const actual = putContentIntoLines(input);
  expect(actual).toEqual(expected);
});

test.each([
  // Test we ignore '--' comments on separate lines
  ["DELETE\n FROM \n\n person WHERE \n-- Remove old people\n age > 5;"],

  // Test we ignore '--' comments inline
  ["DELETE\n FROM \n\n person WHERE \n\n age > 5; -- Remove old people"],

  // We ignore '#' comments on separate lines
  ["DELETE\n FROM \n\n person WHERE \n# Remove old people\n age > 5;"],

  // We ignore '#' comments inline
  ["DELETE\n FROM \n\n person WHERE \n\n age > 5; # Remove old people"],

  // We ignore '/*' comments on a single line
  ["DELETE\n FROM \n\n person WHERE \n/* Remove old people*/\n age > 5;"],

  // We ignore '/*' comments across multiple lines
  ["DELETE\n FROM \n\n person WHERE \n/* Remove old\n people*/ age > 5;"],
])("We ignore comments in files", (input) => {
  const actual = putContentIntoLines(input);
  expect(actual).toEqual([this.queryWithComments]);
});

test.each([
  // Test we can handle functions using $$
  ["CREATE FUNCTION xor (a BOOLEAN, b BOOLEAN)\nRETURNS BOOLEAN\nIMMUTABLE LANGUAGE sql\nAS $$\nSELECT (a AND NOT b) OR (b AND NOT a);\n$$;"],

  // Test we can handle functions using '''
  ["CREATE FUNCTION xor (a BOOLEAN, b BOOLEAN)\nRETURNS BOOLEAN\nIMMUTABLE LANGUAGE sql\nAS '''\nSELECT (a AND NOT b) OR (b AND NOT a);\n''';"],
])("We can handle different language functions", (input) => {
  const actual = putContentIntoLines(input);
  expect(actual).toEqual([this.queryWithFunction]);
});

test.each([
  // Test we can handle semi-colons in quotes
  ["SELECT *\n FROM \n person \n WHERE \n name = 'Barry;';"],

])("We can handle semi-colons in quotes", (input) => {
  const actual = putContentIntoLines(input);
  expect(actual).toEqual([this.queryWithSemicolonSingleQuote]);
});

test.each([
  // Test we can handle semi-colons in quotes
  ["SELECT *\n FROM \n person \n WHERE \n name = \"Barry;\";"],

])("We can handle semi-colons in quotes", (input) => {
  const actual = putContentIntoLines(input);
  expect(actual).toEqual([this.queryWithSemicolonDoubleQuote]);
});

test("We correctly reconstruct our query from lines", () => {
  const expected: string = "DELETE FROM  person WHERE  age > 5;";
  const actual = this.query.getContent();
  expect(actual).toEqual(expected);
});

test("We correctly construct lines in a query from a string", () => {
  const expected: any = [this.query];

  const input = "DELETE\n FROM \n\n person WHERE \n age > 5;";
  const actual = getQueryFromLine(input);
  expect(actual).toEqual(expected);
});

test("We correctly construct lines in a query from a string without a semi-colon", () => {
  const expected: any = [this.queryWithoutSemiColon];

  const input = "DELETE\n FROM \n\n person WHERE \n age > 5";
  const actual = getQueryFromLine(input);
  expect(actual).toEqual(expected);
});

