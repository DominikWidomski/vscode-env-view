# TODOs

- [x] updating the view when file is updated/created, doesn't update values
- [x] Checkbox rendering is broken - should have checked string value
- [ ] View re-renders from a file change when we change value in the view.
  - Not sure if this ok, and not sure what I want to do with the "initial: value" hint, what does that mean?
- [ ] Number inputs are buggy. Why?
  - Sometimes I can only increment the number using the native number type input UI once or twice and I have to unfocus the input before I can do that again.
- [ ] `simonsiefke.svg-preview` - this extension has the top bar icon that I also want!

## General notes

https://code.visualstudio.com/api/references/vscode-api#FileSystemProvider
https://code.visualstudio.com/api/references/vscode-api#FileSystemWatcher
https://code.visualstudio.com/api/references/vscode-api#RelativePattern
https://code.visualstudio.com/api/references/vscode-api#RelativePattern

# Analysing an example template repo

https://github.com/leocll/vscode-extension-webview-template

- package.json specifies main which is `./src/extension.js`
- `src/extension.js` has very simple `activate` and `deactivate` exports
- basically a proxy to `src/example/index.js`
- `src/example/index.js`:
  - calls yet another class `new EGWebView()` (`.e.g.webview.js`), and calls its `activate`, passing context, name, and
  - it also registers a command, which uses `utils.Api.showMessage`, **will come back to that**
- `e.g.webview.js` exports a class which extends `WebView`
  - there's this concept of these handlers. **Will come back to that**
- `EGWebView.activate(context, name, cmdName, htmlPath)`
- `WebView.activate()`
  - WebviewApi.activate... **???**
  - has something about `bridgeData` **??? HUH???** *Seems it's like a cache???*
  - registers a command which shows the panel... *hmm I guess it's actually the individual commands -> view...*
- ... seems very convoluted and contrived... let's try it ourselves! :D
