class App extends React.Component {
    render(){
        return <div class="row">
            <div className="col-md-4">
                left
            </div>
            <div className="col-md-4">
                middle
            </div>
            <div className="col-md-4">
                left
            </div>
        </div>
    }
}

ReactDOM.render(<App />, document.querySelector(".app"))
