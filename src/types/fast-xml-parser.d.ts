declare module 'fast-xml-parser' {
  export interface XMLParserOptions {
    ignoreAttributes?: boolean;
    attributeNamePrefix?: string;
    allowBooleanAttributes?: boolean;
    parseTagValue?: boolean;
    trimValues?: boolean;
  }

  export class XMLParser {
    constructor(options?: XMLParserOptions);
    parse(xml: string): any;
  }
}
