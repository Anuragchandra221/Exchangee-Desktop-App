let form = document.getElementById('form')
const fileInput = document.getElementById('file-input');
let file = null
let fileExtension = null
fileInput.addEventListener('change',(e)=>{
    file = e.target.files[0];
    console.log(file)
    fileExtension = file.name.split('.').pop();
    // console.log(fileExtension)
})
form.addEventListener('submit', (e)=>{
    e.preventDefault()
    if (file) {
        const chunkSize = 1048576; // Adjust the chunk size as needed
        let offset = 0;

        server.webExtension(file.name, file.size)
        const readNextChunk = () => {
        const reader = new FileReader();
        const blob = file.slice(offset, offset + chunkSize);

        reader.onload = function(event) {
            if (event.target.readyState === FileReader.DONE) {
            const chunk = event.target.result;
            // console.log(chunk)

            server.web(chunk)

            offset += chunkSize;

            if (offset < file.size) {
                readNextChunk();
            }
            }
        };

        reader.readAsArrayBuffer(blob);
        };

        readNextChunk();
    }
})

const speed = async ()=>{
    const speed = await server.webSpeed((speed)=>{
        console.log(speed)
        // console.log("script ", speed)
        document.getElementById('progress-bar').value = Math.floor( speed.percentage )
        document.getElementById('speed').innerHTML = (speed.speed/(1024*1024)).toFixed(2)+" MBPS"
        document.getElementById('received').innerHTML = (speed.sent/(1024*1024)).toFixed(2)+" MB/"
        // console.log("script ", speed.sent)
    });
}
speed()