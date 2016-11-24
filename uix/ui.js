class App extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            selectedPluginIndex: 0,
            plugins: [
                {
                    name: "plugin 1",
                    babelPlugin: "babel",
                    injectedCode: "injected"
                },
                {
                    name: "plugin 2",
                    babelPlugin: "babel2",
                    injectedCode: "injected2"
                },
                {
                    name: "plugin 3",
                    babelPlugin: "babel3",
                    injectedCode: "injected3"
                }
            ]
        }
    }
    render(){
        var selectedPluginIndex = this.state.selectedPluginIndex;
        var selectedPlugin = this.state.plugins[selectedPluginIndex]

        return <div className="row">
            <div className="col-md-4">
                <select onChange={(e) => this.setState({selectedPluginIndex: e.target.value})} value={selectedPluginIndex}>
                    {this.state.plugins.map((plugin, i) => <option value={i} key={i}>
                        {plugin.name}
                    </option>)}
                </select>
            </div>
            <PluginEditor plugin={selectedPlugin} onChange={this.onPluginEdited.bind(this)}/>
        </div>
    }
    onPluginEdited(newPlugin){
        var plugins = this.state.plugins.slice();
        plugins[this.state.selectedPluginIndex] = newPlugin;
        this.setState({plugins})
    }
}

class PluginEditor extends React.Component {
    render(){
        return <div>
            <div className="col-md-4">
                <h2>Babel Plugin</h2>
                <textarea
                    value={this.props.plugin.babelPlugin}
                    onChange={(e) => this.updatePlugin("babelPlugin", e.target.value)}>
                </textarea>
            </div>
            <div className="col-md-4">
                <h2>Code Injected Into Page</h2>
                <textarea
                    value={this.props.plugin.injectedCode}
                    onChange={(e) => this.updatePlugin("injectedCode", e.target.value)}>
                </textarea>
            </div>
        </div>
    }
    updatePlugin(propertyName, newValue){
        var newPlugin = Object.assign({}, this.props.plugin)
        newPlugin[propertyName] = newValue

        this.props.onChange(newPlugin)
    }
}

ReactDOM.render(<App />, document.querySelector(".app"))
