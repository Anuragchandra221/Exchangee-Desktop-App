
document.getElementById('file-upload').addEventListener('change',(event)=>{
    const file = event.target.files[0].path.replace(/\\/g, '/')
    server.files(file)
})
// server.server()
server.clients()

document.getElementById('me').innerHTML = server.me()
const storage = async ()=>{
    const storage = await server.storage()
    const data = `${(storage.free/1e+9).toFixed(2)}GB of ${(storage.size/1e+9).toFixed(2)}GB`
    document.getElementById('storage').innerHTML = data
}
storage()
const client = async () => {
    
    const clientName = await server.getClient();
    document.getElementById('rec').innerHTML = clientName
   
    // document.getElementById('maxStorage').innerHTML = (storage.size/(1024*1024)).toFixed(2)

    

    // Perform actions with the client name
};
document.getElementById("username").innerHTML = localStorage.getItem("username")
document.getElementById("logout").addEventListener('click',()=>{
    localStorage.removeItem('username')
    localStorage.removeItem('password')
    window.location.href = "./exe.html"
  })
client()
const speed = async ()=>{
    const speed = await server.speed((speed)=>{
        // console.log("script ", speed)
        document.getElementById('progress-bar').value = Math.floor( speed.percentage )
        document.getElementById('speed').innerHTML = (speed.speed/(1024*1024)).toFixed(2)+" MBPS"
        document.getElementById('received').innerHTML = (speed.sent/(1024*1024)).toFixed(2)+" MB/"
        // console.log("script ", speed.sent)
    });
}
speed()
const size = async ()=>{
    const size = await server.size()
    document.getElementById('total').innerHTML = (size/(1024*1024)).toFixed(2)+" MB"
}
size()
