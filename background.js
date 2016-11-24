var codeInstrumenter = new ChromeCodeInstrumenter({
    logBGPageLogsOnInspectedPage: true
});

function onBrowserActionClicked(tab) {
	chrome.storage.local.get(function(data){
		var pluginCode = data.plugins[data.selectedPluginIndex].babelPlugin
		var babelPlugin = eval("(" + pluginCode + ")")

	    codeInstrumenter.toggleTabInstrumentation(tab.id, {
			babelPlugin
		})
	})
}
chrome.browserAction.onClicked.addListener(onBrowserActionClicked);
