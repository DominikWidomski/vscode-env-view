type DotenvParseOptions = {
  debug?: boolean;
};

export type DotenvVariableInfo = {
  value: string;
  type: "boolean" | "number" | "string";
  // Zero based index of where in the file the variable is defined
  line: number;
  linePosition: { start: number; end: number };
};

// keys and values from src
export type DotenvParseOutput = {
  [key: string]: DotenvVariableInfo;
};

type DotenvConfigOptions = {
  path?: string; // path to .env file
  encoding?: string; // encoding of .env file
  debug?: string; // turn on logging for debugging purposes
};

type DotenvConfigOutput = {
  parsed?: DotenvParseOutput;
  error?: Error;
};

const NEWLINE = "\n";
const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/;
const RE_NEWLINES = /\\n/g;
const NEWLINES_MATCH = /\n|\r|\r\n/;

// https://www.npmjs.com/package/multi-ini???

// Parses src into an Object
// nicked directly from https://github.com/motdotla/dotenv/blob/master/lib/main.js
function parse(
  src: string | Buffer,
  options?: DotenvParseOptions
): DotenvParseOutput {
  const debug = Boolean(options && options.debug);
  let obj = {};

  // convert Buffers before splitting into lines and processing
  src
    .toString()
    .split(NEWLINES_MATCH)
    .forEach(function (line, idx) {
      // matching "KEY' and 'VAL' in 'KEY=VAL'
      const keyValueArr = line.match(RE_INI_KEY_VAL);
      // matched?
      if (keyValueArr !== null) {
        const key = keyValueArr[1];
        // default undefined or missing values to empty string
        let val = keyValueArr[2] || "";
        const end = val.length - 1;
        const isDoubleQuoted = val[0] === '"' && val[end] === '"';
        const isSingleQuoted = val[0] === "'" && val[end] === "'";

        const linePosStart = val ? line.indexOf(val) : undefined;
        const linePosEnd =
          val && linePosStart ? linePosStart + val.length : undefined;

        // if single or double quoted, remove quotes
        if (isSingleQuoted || isDoubleQuoted) {
          val = val.substring(1, end);

          // if double quoted, expand newlines
          if (isDoubleQuoted) {
            val = val.replace(RE_NEWLINES, NEWLINE);
          }
        } else {
          // remove surrounding whitespace
          val = val.trim();
        }

        const isNumber = (val) => !isNaN(Number(val)) && isFinite(Number(val));

        const type = ["true", "false"].includes(val.toLowerCase())
          ? "boolean"
          : isNumber(val)
          ? "number"
          : "string";

        // was this: `obj[key] = val`
        obj = {
          ...obj,
          [key]: {
            value: val,
            type,
            line: idx,
            linePosition: {
              start: linePosStart,
              end: linePosEnd,
            },
          },
        };
      } else if (debug) {
        console.log(
          `did not match key and value when parsing line ${idx + 1}: ${line}`
        );
      }
    });

  return obj;
}

export default parse;
