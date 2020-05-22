// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import parse, { DotenvParseOutput, DotenvVariableInfo } from "./parse";
import * as _ from "lodash";

type PostMessage = {
  command: string;
  payload: {
    filePath: string;
    key: string;
    // TODO: questionable whether we need to pass this?
    value: string;
    inputValue: string | boolean;
  };
};

let GLOBAL_EXTENSION_CONTEXT: vscode.ExtensionContext | undefined;

// Loads a file from the src folder of the extension
function getExtensionFileUri(repoRelativePath: string): vscode.Uri {
  if (!GLOBAL_EXTENSION_CONTEXT) {
    throw new Error("No extension context found.");
  }

  return vscode.Uri.file(
    path.join(GLOBAL_EXTENSION_CONTEXT.extensionPath, "src", repoRelativePath)
  );
}

function readExtensionFile(repoRelativePath: string): string {
  return fs.readFileSync(getExtensionFileUri(repoRelativePath).fsPath, "utf8");
}

// At the moment only finds files starting with .env in the workspace root dir.
const findEnvFiles: () => { [folderFsPath: string]: string[] } = () => {
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  const filesPerFolder = {};

  for (const workspaceFolder of workspaceFolders) {
    const { name, uri } = workspaceFolder;

    console.log(`Workspace folder: ${name} @ ${uri}`);

    // TODO: support vscode.workspace.workspaceFolders, rootPath is deprecated
    // Which means menu to select which file to show, rather than just all, so show per file, or per folder
    const files = fs.readdirSync(uri.fsPath).filter((file) => {
      if (file.startsWith(".env")) {
        return true;
      }

      return false;
    });

    console.log(`Found ${files.length} files!`);
    console.log(files);

    if (files.length) {
      filesPerFolder[uri.fsPath] = files;
    }
  }

  return filesPerFolder;
};

const getFileContents = (file: string) => {
  if (!vscode.workspace.rootPath) {
    console.log("No workspace.rootPath");
    return;
  }

  return fs.readFileSync(path.resolve(vscode.workspace.rootPath, file));
};

const updateVariableInFile = (
  payload: PostMessage["payload"],
  variableInfo: DotenvVariableInfo
) => {
  if (!vscode.workspace.rootPath) {
    console.log("No workspace.rootPath");
    return;
  }

  const { filePath, key, inputValue } = payload;
  const resolvedFilePath = path.resolve(vscode.workspace.rootPath, filePath);

  const fileContents = fs.readFileSync(resolvedFilePath);

  const replaceLine = (fileContents: string | Buffer, line, text) => {
    const lines = fileContents.toString().split("\n");

    lines[line] = text;

    return lines.join("\n");
  };

  const replaceLineAt = (
    fileContents: string | Buffer,
    lineIndex: number,
    newText: any,
    startPos: number,
    endPos: number
  ) => {
    const lines = fileContents.toString().split("\n");

    lines[lineIndex] =
      lines[lineIndex].substr(0, startPos) +
      newText +
      lines[lineIndex].substr(endPos);

    return lines.join("\n");
  };

  fs.writeFileSync(
    resolvedFilePath,
    // replaceLine(fileContents, variableInfo.line, `${key} = ${inputValue}`),
    replaceLineAt(
      fileContents,
      variableInfo.line,
      inputValue,
      variableInfo.linePosition.start,
      variableInfo.linePosition.end
    ),
    {
      encoding: "utf8",
    }
  );
};

// this method is called when your extension is activated
// this method is called only once for the activation.
// your extension is activated the very first time an activationEvent is triggered
export function activate(context: vscode.ExtensionContext) {
  GLOBAL_EXTENSION_CONTEXT = context;

  // Need to do the weird VS Code URI loading thing
  const indexHTML = readExtensionFile("./templates/index.html");
  const templatePage = _.template(indexHTML);

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "env-ui" is now active!');
  console.log(
    `Extension is running in the workspace: ${vscode.workspace.name} @ ${vscode.workspace.rootPath}`
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  context.subscriptions.push(
    vscode.commands.registerCommand("env-ui.helloWorld", () => {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from env-ui!");
    })
  );

  let envViewPanel: vscode.WebviewPanel;

  context.subscriptions.push(
    vscode.commands.registerCommand("env-ui.showView", () => {
      const columnToShowIn = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
      const filesPerFolder = findEnvFiles();

      const varsPerFile: { [filePath: string]: DotenvParseOutput } = {};

      const perFileHTML = Object.entries(filesPerFolder)
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

            varsPerFile[envFilePath] = vars;

            htmlPerFile.push(`
              <h3>${envFilePath}</h3>
              ${
                Object.entries(vars).length === 0
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
                                  Boolean(value) ? 'checked="checked"' : ""
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
                  `
              }
            `);
          }

          // TODO: move HTML files into separate folder. How can I template these in a decent way?
          return `
            <h2>${folderFsPath}</h2>
            ${htmlPerFile.join("")}
          `;
        })
        .join("");

      envViewPanel = vscode.window.createWebviewPanel(
        "env-ui-view",
        "Environment file UI",
        columnToShowIn || vscode.ViewColumn.One, // is this necessary?
        {
          enableScripts: true,
        }
      );

      // Don't really want to do that, necessarily, can we message the view with new data?
      envViewPanel.webview.html = templatePage({
        body: perFileHTML,
      });

      envViewPanel.onDidDispose(
        () => {
          console.log("View was closed!");
        },
        null,
        context.subscriptions
      );

      envViewPanel.webview.onDidReceiveMessage((message: PostMessage) => {
        switch (message.command) {
          case "updateVariable":
            const file = varsPerFile[message.payload.filePath];

            if (!file) {
              console.error(`Did not find file: ${message.payload.filePath}`);
            }

            const variableInfo = file[message.payload.key];

            if (!variableInfo) {
              console.error(`Did not find var: ${message.payload.key}`);
            }

            console.log(`Update variable`);
            console.table({
              filePath: {
                value: message.payload.filePath,
                type: typeof message.payload.filePath,
              },
              key: {
                value: message.payload.key,
                type: typeof message.payload.key,
              },
              value: {
                value: message.payload.value,
                type: typeof message.payload.value,
              },
              inputValue: {
                value: message.payload.inputValue,
                type: typeof message.payload.inputValue,
              },
            });

            updateVariableInFile(message.payload, variableInfo);
            // TODO: Update the file... HOW? How do you update the files? Should I read the file and keep a record of where the values are in it? D:! UMMM!!!
            // What if file changes when this is open? Can I listen for file changes?

            // Update in-memory information on where variables are defined in the file
            // TODO: Should read the file again fully perhaps, because even implied types can change (type "true" in an input?)
            const updateFileDefinitions = (payload: PostMessage["payload"]) => {
              const file = varsPerFile[payload.filePath];

              if (!file) {
                console.error(`Did not find file: ${payload.filePath}`);
              }

              const variableInfo = file[message.payload.key];

              variableInfo.linePosition.end =
                variableInfo.linePosition.start +
                payload.inputValue.toString().length;
            };

            updateFileDefinitions(message.payload);

            return;

          default:
            console.log(`Unrecognised message command: ${message.command}`);
        }
      });

      // Show the view if it already exists
      // Yeh want to show the panel if it already exists, but then need to reload the files basically.
      if (envViewPanel) {
        envViewPanel.reveal(columnToShowIn);
        return;
      }
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
