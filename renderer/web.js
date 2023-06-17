let form = document.getElementById('form')
const fileInput = document.getElementById('file-input');
let file = null
fileInput.addEventListener('change',(e)=>{
    file = e.target.files[0];
    console.log(file)
})
form.addEventListener('submit', (e)=>{
    e.preventDefault()
    if (file) {
        const chunkSize = 1048576; // Adjust the chunk size as needed
        let offset = 0;

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

// let url = `ws://localhost:8000/ws/socket-server/`
// const chatSocket = new WebSocket(url)
// chatSocket.onmessage = function(e){
//         // let data = JSON.parse(e.data)
//         console.log("Data: ", e.data)
//     }
//     form.addEventListener('submit', (e)=>{
//         e.preventDefault()
//         if (file) {
//             const chunkSize = 4096; // Adjust the chunk size as needed
//             let offset = 0;

//             const readNextChunk = () => {
//             const reader = new FileReader();
//             const blob = file.slice(offset, offset + chunkSize);

//             reader.onload = function(event) {
//                 if (event.target.readyState === FileReader.DONE) {
//                 const chunk = event.target.result;
//                 // console.log(chunk)
//                 chatSocket.send(chunk);

//                 offset += chunkSize;

//                 if (offset < file.size) {
//                     readNextChunk();
//                 }
//                 }
//             };

//             reader.readAsArrayBuffer(blob);
//             };

//             readNextChunk();
//         }
//         if(e.target.input.value){
//             let message = e.target.input.value
//             chatSocket.send(JSON.stringify({
//                 "message": message
//             }))
//         }
//         form.reset()
// })