var codeInstrumenter = new ChromeCodeInstrumenter({
    logBGPageLogsOnInspectedPage: true
});

function onBrowserActionClicked(tab) {
	chrome.storage.local.get(null, function(data){
		var pluginCode = data.plugins[data.selectedPluginIndex].babelPlugin
		var babelPlugin = eval("(" + pluginCode + ")")

	    codeInstrumenter.toggleTabInstrumentation(tab.id, {
			babelPlugin,
			onBeforePageLoad: function(callback){
				debugger
		        this._executeScript(`
		            var script2 = document.createElement("script")
		            script2.text = 'window.sth = function(){ console.log("str lit"); }'
		            document.documentElement.appendChild(script2)`
		        , function(){
		            // ideally we'd wait for a message from the page,
		            // but for now this will work
		            setTimeout(function(){
		                callback();
		            },100)
		        })
		    }
		})
	})
}
chrome.browserAction.onClicked.addListener(onBrowserActionClicked);
