import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// TODO: Could these two be one function if we can figure out if a passed path is absolute or not?
// but then, if it's not, is it relative to the roof of the repo then?
// Could just name the function like `getRepoFileContents` to be clear, or just comment lol
export const getFileContentsAbsolute = (absolutePath: string) => {
  return fs.readFileSync(absolutePath);
};

export const getFileContents = (relativePath: string) => {
  if (!vscode.workspace.rootPath) {
    console.log("No workspace.rootPath");
    return;
  }

  return fs.readFileSync(path.resolve(vscode.workspace.rootPath, relativePath));
};
