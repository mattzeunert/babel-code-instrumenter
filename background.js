var codeInstrumenter = new ChromeCodeInstrumenter({
    babelPlugin: function(babel) {
		debugger
        return {
            visitor: {
                StringLiteral(path){
					debugger
					path.node.value = "Cake"
                }
            }
        };
    },
    logBGPageLogsOnInspectedPage: true
});

function onBrowserActionClicked(tab) {
    codeInstrumenter.toggleTabInstrumentation(tab.id)
}
chrome.browserAction.onClicked.addListener(onBrowserActionClicked);
