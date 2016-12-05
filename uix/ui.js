class App extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            runtimeError: null,
            quotaExceeded: false
        }
        this.persistPlugins = _.debounce(this.persistPlugins, 100)
    }
    componentDidMount(){
        this.readPlugins();

        chrome.storage.onChanged.addListener((changes, namespace) => {
            var updateFromTabId = changes.lastTabThatWrotePlugins.newValue;
            var wasChangedInOtherTab = updateFromTabId !== chrome.devtools.inspectedWindow.tabId;
            if (wasChangedInOtherTab) {
                this.setState({plugins: changes.plugins.newValue})
            }
        })

        this.backgroundPagePort = chrome.runtime.connect({name: 'babel-instrumenter'});
        this.backgroundPagePort.onMessage.addListener((msg) => {
            if (msg[0] === "runtimeError"){
                this.setState({runtimeError: msg[1]})
            }
        });
        this.backgroundPagePort.postMessage(['connect', chrome.devtools.inspectedWindow.tabId])
    }
    render(){
        if (this.state.plugins === undefined) {
            return <div>Loading plugins</div>
        }

        var selectedPluginIndex = this.state.selectedPluginIndex;
        var selectedPlugin = this.state.plugins[selectedPluginIndex]

        var runtimeError = null;
        if (this.state.runtimeError) {
            runtimeError = <div className="row">
                <div className="col-md-12">
                    <div style={{marginTop: 10, marginBottom: 0}} className="alert alert-danger">
                        {this.state.runtimeError}
                    </div>
                </div>
            </div>
        }

        var quotaExceededMessage = null;
        if (this.state.quotaExceeded) {
            quotaExceededMessage = <div className="alert alert-danger" style={{marginTop: 10}}>
                Plugin code is taking up too much storage space - can{"'"}t save plugin changes!
            </div>
        }

        return <div className="container" style={{width: "100%"}}>
            <div className="row">
                <div className="col-md-2" style={{
                    maxHeight: "100vh",
                    overflow: "scroll"
                    }}>
                    <div style={{padding: 5, borderRight: "1px solid #ccc", height: "100vh"}}>
                        <h2>Babel Plugins</h2>
                        <PluginSelector
                            plugins={this.state.plugins}
                            selectedPluginIndex={selectedPluginIndex}
                            onChange={(selectedPluginIndex) => this.selectPlugin(selectedPluginIndex)}
                        />
                        <div style={{textAlign: "center", paddingBottom: 10}}>
                            <button className="btn btn-sm btn-secondary" onClick={() => this.addPlugin()}>
                                Add Babel Plugin
                            </button>
                        </div>
                    </div>
                </div>
                <div className="col-md-10" style={{display: "flex", flexDirection: "column", width: "100%"}}>
                    {runtimeError}
                    {quotaExceededMessage}
                    <div style={{paddingTop: 10, flex: 1, height: "100vh"}}>
                        <PluginEditor
                            plugin={selectedPlugin}
                            onChange={this.onPluginEdited.bind(this)}
                            runPlugin={() => this.runSelectedPlugin()}
                            deletePlugin={() => this.deleteSelectedPlugin()}
                        />
                    </div>
                </div>
            </div>
        </div>
    }
    selectPlugin(selectedPluginIndex){
        this.setState({
            selectedPluginIndex,
            runtimeError: null
        })
    }
    updatePluginData(data){
        data = Object.assign({}, this.state, data)
        var {plugins, selectedPluginIndex} = data;
        this.setState({plugins, selectedPluginIndex})
        this.persistPlugins();
    }
    onPluginEdited(newPlugin){
        var plugins = this.state.plugins.slice();
        plugins[this.state.selectedPluginIndex] = newPlugin;
        this.updatePluginData({plugins})
    }
    deleteSelectedPlugin(){
        if (!confirm("Do you really want to delete this plugin?")){
            return;
        }
        var plugins = this.state.plugins;
        plugins = removeListItemAtIndex(plugins, this.state.selectedPluginIndex)
        this.updatePluginData({
            plugins,
            selectedPluginIndex: 0
        })
    }
    runSelectedPlugin(){
        this.backgroundPagePort.postMessage(["enableInstrumentation"])
    }
    addPlugin(){
        var plugins = this.state.plugins.slice();
        plugins.push(makeNewPlugin())
        this.updatePluginData({
            plugins,
            selectedPluginIndex: plugins.length - 1
        })
    }
    persistPlugins(){
        var {plugins, selectedPluginIndex} = this.state;

        chrome.storage.local.set({
            plugins,
            selectedPluginIndex,
            lastTabThatWrotePlugins: {
                // I just want to send a message saying what tab updated storage...
                // random value so lastTabThatWrotePlugins always shows up in changes object
                random: Math.random(),
                value: chrome.devtools.inspectedWindow.tabId
            }
        }, () => {
            var quotaExceeded = false;
            if (chrome.runtime.lastError){
                quotaExceeded = chrome.runtime.lastError.message === "QUOTA_BYTES quota exceeded"
            }
            if (this.state.quotaExceeded !== quotaExceeded) {
                this.setState({quotaExceeded})
            }
        })
    }
    readPlugins(){
        chrome.storage.local.get(null, (data) => {
            if (data.plugins === undefined){
                data = {
                    selectedPluginIndex: 0,
                    plugins: [
                        makeNewPlugin()
                    ]
                }
            }

            this.setState(data)
        })
    }
}

function makeNewPlugin(){
    return {
        babelPlugin: `function babelPlugin(babel) {
    return {
        visitor: {
            FunctionDeclaration(path) {
                var call = babel.types.callExpression(
                    babel.types.identifier("logCall"),
                    [babel.types.stringLiteral(path.node.id.name)]
                )
                var expression = babel.types.expressionStatement(call)
                path.node.body.body.unshift(expression)
            }
        }
    }
}`,
        injectedCode: `window.calls = {}
window.logCall = function(fnName){
    if (!window.calls[fnName]){
        window.calls[fnName] = 0
    }
    window.calls[fnName]++
}
window.onBabelInstrumenterDocumentReady = function(){
  	var calls = Object.entries(window.calls).sort((a,b) => b[1]-a[1]).slice(0, 20)
    console.table(calls)
}`,
        name: "New Plugin"
    }
}

class PluginEditor extends React.Component {
    render(){
        if (!this.props.plugin) {
            return null
        }

        return (
            <div style={{height: "100%", display: "flex", flexDirection: "column"}}>
                <div className="row">
                    <div className="col-md-12">
                        <button
                            className="btn btn-sm btn-primary"
                            style={{marginRight: 5}}
                            onClick={this.props.runPlugin}>Run</button>
                        <input
                            value={this.props.plugin.name}
                            style={{
                                fontSize: 20,
                                fontWeight: "bold",
                                border: "none",
                                width: 350,
                                borderBottom: "1px solid #ccc"
                            }}
                            onChange={e => this.updatePlugin("name", e.target.value)}
                        ></input>
                        <button
                            className="btn btn-link"
                            onClick={this.props.deletePlugin}>Delete</button>
                    </div>
                </div>
                <div className="row" style={{height: "100%"}}>
                    <div className="col-md-6 plugin-editor-column">
                        <h2>Babel Plugin</h2>
                        <CodeEditor
                            value={this.props.plugin.babelPlugin}
                            onChange={(e) => this.updatePlugin("babelPlugin", e.target.value)}>
                        </CodeEditor>
                    </div>
                    <div className="col-md-6 plugin-editor-column" style={{display: "flex", flexDirection: "column"}}>
                        <h2>Code To Run Before Page Load</h2>
                        <CodeEditor
                            value={this.props.plugin.injectedCode}
                            onChange={(e) => this.updatePlugin("injectedCode", e.target.value)}>
                        </CodeEditor>
                    </div>
                </div>
            </div>
        )
    }
    updatePlugin(propertyName, newValue){
        var newPlugin = Object.assign({}, this.props.plugin)
        newPlugin[propertyName] = newValue

        this.props.onChange(newPlugin)
    }
}

class PluginSelector extends React.Component {
    render(){
        return <div className="plugin-selector">
            <select
                onChange={(e) => this.props.onChange(e.target.value)}
                value={this.props.selectedPluginIndex}>
                {this.props.plugins.map((plugin, i) => <option value={i} key={i}>
                    {plugin.name}
                </option>)}
            </select>
            <ul>
                {this.props.plugins.map((plugin, i) => <li
                    className={i === this.props.selectedPluginIndex ? "selected" : ""}
                    onClick={() => this.props.onChange(i)}
                    >
                    {plugin.name}
                </li>)}
            </ul>
        </div>
    }
}

class CodeEditor extends React.Component {
    constructor(props){
        super(props)
        this.state = {}
        this.updateErrors = _.debounce(this.updateErrors, 250)
    }
    componentDidUpdate(prevProps, prevState){
        this.updateErrors()
    }
    render(){
        return <div style={{display: "flex", flexDirection: "column"}}>
            <div style={{
                flex: "1",
                overflow: "scroll",
                border: "1px solid #eee"
            }}>
                <CodeMirrorEditor
                    value={this.props.value}
                    onChange={this.props.onChange}
                />
            </div>
            {
                this.state.errors ?
                <pre style={{
                    background: "#eee",
                    fontSize: 12,
                    padding: 4
                }}>{this.state.errors}</pre> :
                null
            }
        </div>
    }
    updateErrors(){
        this.setState({errors: this.getErrors()})
    }
    getErrors(){
        var error = null;
        try {
            // just check if syntax is valid
            Babel.transform(this.props.value, {}).code
        } catch (err) {
            error = err.toString()
        }

        return error;
    }
}

function removeListItemAtIndex(list, index){
    list = list.slice();
    list.splice(index, 1);
    return list
}

ReactDOM.render(<App />, document.querySelector(".app"))
