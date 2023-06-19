if(localStorage.getItem('role')=='server'){
    document.getElementById('radio-server').checked = true
    if(localStorage.getItem('server-running')==='false'){
        // server.server()
        localStorage.setItem("server-running", 'true')
    }

}else{
    document.getElementById('radio-server').checked = false
    // server.clients()
    localStorage.setItem("server-running", 'false')
}
document.getElementById('radio-client').addEventListener('change', ()=>{
    console.log("changed")
    if(document.getElementById('radio-client').checked){
        localStorage.setItem('role', 'client')
        localStorage.setItem("server-running", 'false')
        console.log("hello client")
        // server.destroySocket()
        server.clients()
    }else{
        console.log("checkekd client")
        localStorage.setItem('role', 'server')
        console.log(localStorage.getItem('server-running'))
        if(localStorage.getItem('server-running')==='false'){
            server.server()
            localStorage.setItem("server-running", 'true')
        }
    }
})
document.getElementById('radio-server').addEventListener('change', ()=>{
    console.log("changed")
    if(document.getElementById('radio-server').checked){
        localStorage.setItem('role', 'server')
        if(localStorage.getItem('server-running')==='false'){
            server.server()
        }
    }else{
        console.log("checkekd client")
        localStorage.setItem('role', 'client')
        localStorage.setItem("server-running", false)

    }
})
document.getElementById('destination_path').innerHTML = localStorage.getItem('destination')
document.getElementById('browse').addEventListener('click', ()=>{
    console.log('serverrrrrrr')
    // console.log(server.selectFolder())
    server.selectFolder().then((filePath)=>{
        console.log(filePath)
        localStorage.setItem('destination',filePath)
        document.getElementById('destination_path').innerHTML = localStorage.getItem('destination')
    })
})