if(localStorage.getItem('role')=='server'){
    document.getElementById('radio-server').checked = true
    server.server()
}else{
    document.getElementById('radio-server').checked = false
    server.clients()
}
document.getElementById('radio-client').addEventListener('change', ()=>{
    console.log("changed")
    if(document.getElementById('radio-client').checked){
        localStorage.setItem('role', 'client')
    }else{
        console.log("checkekd client")
        localStorage.setItem('role', 'server')
    }
})
document.getElementById('radio-server').addEventListener('change', ()=>{
    console.log("changed")
    if(document.getElementById('radio-server').checked){
        localStorage.setItem('role', 'server')
    }else{
        console.log("checkekd client")
        localStorage.setItem('role', 'server')
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