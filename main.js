const {app, BrowserWindow, ipcMain, ipcRenderer} = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV !== "development"
const net = require('net');
const fs = require('fs');
const mdns = require('mdns-js');
const os = require('os')

let win = ''
let client = null
const createWindow = ()=>{
    win = new BrowserWindow({
        title: "Exchangee",
        width: 1100,
        height: 580,
        resizable: false,
        autoHideMenuBar: true,
        // frame: false,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: true,
            preload: path.join(__dirname, '/preload.js')
          }
    })
    //Open devtools if in dev env

    if(isDev){
        win.webContents.openDevTools();
    }
    ipcMain.handle('ping', () => 'pong')
    win.loadFile(path.join(__dirname, './renderer/index.html'))

    win.webContents.on('did-finish-load', () => {
        win.webContents.insertCSS(`
          .title-bar {
            background-color: #CDAAF8; 
          }
        `);
      });
}
ipcMain.on('server',(event, args)=>{
  console.log("hihi")
  const server = net.createServer(socket=>{
    console.log("Client Connected")
    console.log(socket.bufferSize)
    let size = 0

    let fileExtension = '';
    let hostname = null;
  let fileName = '';
  let fileSize = 0;
  let fileStream = null;

  // Variables for transfer speed calculation
  let startTime = null;
  let totalBytesReceived = 0;

  // Variables for real-time transfer speed
  let lastUpdateTime = null;
  let lastBytesReceived = 0;
  const homeDirectory = os.homedir();
  const saveDirectory = path.join(homeDirectory, 'Exchangee/');
  const normalizedDirectory = saveDirectory.replace(/\\/g, '/');
  try{
    if (!fs.existsSync(normalizedDirectory)) {
      fs.mkdirSync(normalizedDirectory, { recursive: true });
    }
  }catch{

  }

  // Function to calculate transfer speed and total bytes received
  function calculateTransferSpeed() {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - startTime) / 1000; // Elapsed time in seconds
    const bytesReceived = totalBytesReceived;
    const transferSpeed = bytesReceived / elapsedTime;
    lastBytesReceived = totalBytesReceived;
    // lastUpdateTime = currentTime;
    return { speed: transferSpeed, received: bytesReceived };
  }

  // Handle data received from the client
  socket.on('data', data => {
    if(!hostname){
      try{
        console.log(data)
        const jsonString = data.toString();
        console.log(JSON.parse(jsonString))
        hostname = JSON.parse(jsonString).host;
        console.log(hostname)
        client = hostname.toString()
        size = JSON.parse(jsonString).size;
        console.log(size)
        event.reply('size', size);
        event.reply('client-connected', client);
  
          // The first message received is the file type message
          const jsonString2 = data.toString();
          const fileExtension = JSON.parse(jsonString2).extension;
    
          // Generate a unique file name using timestamp and extension
          const timestamp = Date.now();
          fileName = `received_file_${timestamp}.${fileExtension}`;
    
          // Create a writable stream for saving the file
          console.log(normalizedDirectory+fileName)
      }catch{
        try {
          socket.destroy();
          startSocket();
          console.log('Socket restarted successfully.');
        } catch (error) {
          console.error('Error restarting socket:', error);
        }
      }
        try{
          fileStream = fs.createWriteStream(normalizedDirectory+fileName, { highWaterMark: 64 * 1024 * 1024 });
        }catch{
          console.log("Cannot access folder")
        }
    }else {
      // Write the received data to the file stream
      fileStream.write(data);

      // Measure transfer speed and total bytes received
      if (!startTime) {
        startTime = Date.now();
        lastUpdateTime = startTime;
      }
      totalBytesReceived += data.length;
      fileSize += data.length; // Increment the file size

      // Calculate and display real-time transfer speed and total bytes received
      const currentTime = Date.now();
      if (currentTime - lastUpdateTime >= 1) { // Update speed every 1 second
        const { speed, received } = calculateTransferSpeed();
        event.reply('speed', {
          "speed": speed.toFixed(2),
          "sent": fileSize,
          "percentage": (fileSize*100)/size,
        });
        console.log(`Transfer speed: ${speed.toFixed(2)} bytes/sec`);
        console.log(`Total bytes received: ${fileSize} bytes`);
        lastUpdateTime = currentTime;
      }
    }
  });

  // Handle end of file transfer
  socket.on('end', () => {
    console.log("endd")
    console.log(`File saved: ${fileName}`);
    console.log('File transfer complete. Client disconnected.');
    if (!fileExtension) {
      console.error('File type message not received.');
      return;
    }

    // Close the file stream
    fileStream.end();

    // Calculate final transfer speed and total bytes received
    const { speed, received } = calculateTransferSpeed();

    console.log(`Transfer speed: ${speed.toFixed(2)} bytes/sec`);
    console.log(`Total bytes received: ${received} bytes`);
  });

  })

  server.listen(8080, '0.0.0.0', () => {
    console.log('Server listening on port 8080');
    const ad = mdns.createAdvertisement(mdns.tcp('tcp-service'), 8080, {
      name: 'My service',
      txtRecord: { description: 'A TCP service for file transfer' }
    });
    ad.start();
  });
})
ipcMain.handle('get-client', async (event) => {
  console.log("update-client")
  return await client
});




app.whenReady().then(()=>{
    createWindow()
    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      })
})


// when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })