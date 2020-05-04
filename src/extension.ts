// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import parse from "./parse";
import { DefaultSerializer, DefaultDeserializer } from 'v8';

const findEnvFiles = () => {
	if(!vscode.workspace.rootPath) {
		console.log('No workspace.rootPath');
		return;
	}
	
	const files = fs.readdirSync(vscode.workspace.rootPath).filter(file => {
		if (file.startsWith('.env')) {
			console.log(`Found file: ${file}`);
			return true;
		}

		return false;
	});

	console.log(`Found ${files.length} files!`);
	console.log(files);

	return files || [];
};

const getFileContents = (file: string) => {
	if(!vscode.workspace.rootPath) {
		console.log('No workspace.rootPath');
		return;
	}
	
	return fs.readFileSync(path.resolve(vscode.workspace.rootPath, file));
};

// this method is called when your extension is activated
// this method is called only once for the activation.
// your extension is activated the very first time an activationEvent is triggered
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "env-ui" is now active!');
	console.log(`Extension is running in the workspace: ${vscode.workspace.name} @ ${vscode.workspace.rootPath}`);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('env-ui.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from env-ui!');
	});

	context.subscriptions.push(disposable);

	let envViewPanel: vscode.WebviewPanel;

	context.subscriptions.push(vscode.commands.registerCommand("env-ui.showView", () => {
		const columnToShowIn = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
				: undefined;
		const files = findEnvFiles();

		const perFileHTML = files?.map(file => {
			const contents = getFileContents(file);

			if(!contents) {
				return '';
			}
			
			// Can I use a more generic file parser? I need an AST to understand comments etc?
			// I mean custom parser would do, because AST migth be overengineered.
			const vars = parse(contents);
			
			// TODO: move HTML files into separate folder. How can I template these in a decent way?
			return `
				<h3>${file}</h3>
				${
					Object.entries(vars).length === 0 ?
					"<i>File is empty</i>" :
					`
					<ul>
						${Object.entries(vars)?.map(([key, value]) => {
							return `<li><label><input type="checkbox" data-key="${key}"/ data-value="${value}">${key}: ${value}</label></li>`;
						}).join('')}
					</ul>	
					`
				}
			`;
		}).join('');

		envViewPanel = vscode.window.createWebviewPanel(
			'env-ui-view',
			'Environment file UI',
			columnToShowIn || vscode.ViewColumn.One, // is this necessary?
			{
				enableScripts: true
			}
		);
		
		// Don't really want to do that, necessarily, can we message the view with new data?
		envViewPanel.webview.html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Environment file UI</title>
			</head>
			<body>
					<h1>You can see your environment here!</h1>
					<h2>Files in this workspace</h2>
					${perFileHTML}
			</body>
			<script>
				const vscode = acquireVsCodeApi();
				const checkboxes = document.querySelectorAll('input[type="checkbox"]');

				checkboxes.forEach(input => {
					input.addEventListener('change', event => {
						// TODO: Is it only a single update event?
						vscode.postMessage({
							command: 'updateVariable',
							payload: {
								key: event.target.dataset.key,
								value: event.target.dataset.value,
								checkboxValue: event.target.checked
							}
						})
					});
				});
			</script>
			</html>
		`;

		envViewPanel.onDidDispose(
			() => {
				console.log("View was closed!");
			},
			null,
			context.subscriptions
		);

		envViewPanel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'updateVariable':
					console.log(`Update variable ${message.payload.key}: ${message.payload.value} (${message.payload.checkboxValue})`);
					// TODO: Update the file... HOW? How do you update the files? Should I read the file and keep a record of where the values are in it? D:! UMMM!!!
					// What if file changes when this is open? Can I listen for file changes?
					return;
				
				default:
					console.log(`Unrecognised message command: ${message.command}`);
			}
		});
		
		// Show the view if it already exists
		// Yeh want to show the panel if it already exists, but then need to reload the files basically.
		if(envViewPanel) {
			envViewPanel.reveal(columnToShowIn);
			return;
		}
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}
