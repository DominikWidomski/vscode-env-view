// TODO: Organise files better. Parse should be somewhere in a folder
import parse, { DotenvParseOutput } from "../parse";
import { EnvFilePaths } from "../types";
import { getFileContents } from "./file";

const generateHTMLForVars = (vars: DotenvParseOutput, envFilePath: string) => {
  return Object.entries(vars).length === 0
    ? "<i>File is empty</i>"
    : `
        <ul>
          ${Object.entries(vars)
            ?.map(([key, { value, type }]) => {
              const inputType =
                {
                  boolean: "checkbox",
                  number: "number",
                  string: "text",
                }[type] || "text";

              const input =
                inputType === "checkbox"
                  ? `<input type="${inputType}" ${
                      value === "true" ? 'checked="checked"' : ""
                    } data-file-path="${envFilePath}" data-key="${key}" data-value="${value}" />`
                  : inputType === "number"
                  ? `<input type="${inputType}" value="${value}" data-file-path="${envFilePath}" data-key="${key}" data-value="${value}" />`
                  : `<input type="${inputType}" value="${value}" data-file-path="${envFilePath}" data-key="${key}" data-value="${value}" />`;

              return `
                <li class="input-wrapper">
                  <label>
                    ${key}
                    ${input}
                    <small><em>(initial: ${value})</em></small>
                  </label>
                </li>
              `;
            })
            .join("")}
        </ul>	
      `;
};

export const generateHTMLForViewFromVars = (varsPerFile) => {};

export const generateHTMLForView = (filesPerFolder: EnvFilePaths) => {
  // const varsPerFile = {};

  return Object.entries(filesPerFolder)
    .map(([folderFsPath, envFiles]) => {
      const htmlPerFile: string[] = [];

      for (const envFilePath of envFiles) {
        const contents = getFileContents(envFilePath);

        if (!contents) {
          return "";
        }

        // Can I use a more generic file parser? I need an AST to understand comments etc?
        // I mean custom parser would do, because AST migth be overengineered.
        // Do we use a custom INI file parser?
        const vars = parse(contents);

        // varsPerFile[envFilePath] = vars;

        htmlPerFile.push(`
          <h3>${envFilePath}</h3>
          ${generateHTMLForVars(vars, envFilePath)}
        `);
      }

      // TODO: move HTML files into separate folder. How can I template these in a decent way?
      return `
      <h2>${folderFsPath}</h2>
      ${htmlPerFile.join("")}
    `;
    })
    .join("");
};
