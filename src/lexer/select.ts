import { ILexer } from "./interface";
import { TOKENS, Tokens } from "./tokens";

class Select implements ILexer {
  public tokenise(query: string): Tokens {
    const splitQuery = query.split(" ");
    const tokens = new Tokens(query);

    let lastToken: string = "";
    splitQuery.forEach((item: string) => {
      item = item.toLowerCase();

      if (TOKENS.keyword.includes(item)) {
        tokens.addToken("keyword");
        tokens.addTokenised(["keyword", item]);
      } else if (lastToken === "select" || lastToken === "from") {
        tokens.addToken("table_reference");
        tokens.addTokenised(["table_reference", item]);
      } else {
        tokens.addToken("???");
        tokens.addTokenised(["???", item]);
      }

      lastToken = item;
    });

    return tokens;
  }

    /*
     * TODO - Move this into an abstract class and extend that
     *
     * extractTableReference('symfony.gigs') => [
     *     'database': 'symfony',
     *     'table': 'gigs'
     * ]
     *
     * extractTableReference('symfony.gigs.venue') => [
     *     'database': 'symfony',
     *     'table': 'gigs',
     *     'column': 'venue'
     * ]
     *
     * extractTableReference('gigs.venue') => [
     *     'table': 'gigs',
     *     'column': 'venue'
     * ]
     *
     * extractTableReference('venue') => [
     *     'column': 'venue'
     * ]
     *
     * Assumptions: 
     *   - A value on its own e.g. "venue" is assumed to be a table.
     *   - 3 values e.g. "symfony.gigs.venue" is assumed to be database.table.column
     *   - 2 values is assumed to be database.table
     */
    public extractTableReference(tableReference: string) {
        const references = tableReference.split('.');
        const extractedReferences: any = {
            3: {
                "database": references[0],
                "table": references[1],
                "column": references[2],
            },
            2: {
                "database": references[0],
                "table": references[1],
            },
            1: {
                "table": references[0],
            }
        };

        return extractedReferences[references.length];
    }
}

export { Select };