const {app, BrowserWindow, ipcMain, ipcRenderer, dialog} = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV !== "development"
const net = require('net');
const fs = require('fs');
const mdns = require('mdns-js');
const os = require('os')
const { localStorage } = require('electron-browser-storage');
const { WebSocket } = require('ws');
let servers = null
let win = ''
let client = null
let sp=0
let sending = null
let receiving = null
let ended = 0
let advertisement = null
let normalizedDirectory = null
let rec = 0 
let globalServer = null

const createWindow = ()=>{
    win = new BrowserWindow({
        title: "Exchangee",
        width: 1100,
        height: 580,
        resizable: false,
        autoHideMenuBar: true,
        frame: false,
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
          color: '#CDAAF8',
          symbolColor: '#fff',
          height: 60
        },
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
    win.loadFile(path.join(__dirname, './renderer/exe.html'))

    win.webContents.on('did-finish-load', () => {
       
      // async function removeSt (){
      // }
      // removeSt()
        win.webContents.insertCSS(`
          .title-bar {
            background-color: #CDAAF8; 
          }
        `);
      });
}
ipcMain.on('select-folder', async (event) => {
  try {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      event.reply('folder-selected', result.filePaths[0]);
    }
  } catch (error) {
    console.log('Error selecting folder:', error);
  }
});
ipcMain.on('input-file', (event, fileName)=>{
  if(servers){
    const readStream = fs.createReadStream(fileName);
    sending = true
    receiving = false
    const stats = fs.statSync(fileName);
    const fileSizeInBytes = stats.size;

    // Determine the file extension
    const fileExtension = fileName.split('.').pop();
    const host = os.hostname()
    console.log(fileExtension, fileSizeInBytes, host);
    let data = {
      "host": host,
      "extension": fileExtension,
      "size": fileSizeInBytes
    }
    event.reply('size', fileSizeInBytes);
    const jsonString = JSON.stringify(data);
    servers.write(jsonString)

    let totalBytesSent = 0;
    let startTime = Date.now();
    let lastUpdateTime = startTime;
    let lastBytesSent = 0;

    // Track the progress
    servers.on('data', data=>{
      try{
        const jsonString = data.toString();
        JSON.parse(jsonString)
        console.log("Ended ", ended)
        // if(ended==1){
        //   event.reply('speed', {
        //     "speed": 0,
        //     "sent": 0,
        //     "percentage": 0,
        //   });
        //   ended = 0
        // }

        if('speed' in JSON.parse(jsonString)){
          console.log(Number(JSON.parse(jsonString).speed), ' hi ')
          sp = Number(JSON.parse(jsonString).speed);
          rec = Number(JSON.parse(jsonString).sent);
          event.reply('speed', {
            "speed": sp.toFixed(2), // Transfer speed in bytes per millisecond
            "sent": rec, // Total bytes sent
            "percentage": (rec * 100) / fileSizeInBytes // Transfer progress percentage
          });
        }
      }catch{
        
      }
    })
    readStream.on('data', chunk => {

      // Send the chunk to the servers
      servers.write(chunk);
      totalBytesSent += chunk.length;

      // Calculate transfer speed and update progress
      const currentTime = Date.now();
      const elapsedTime = (currentTime - startTime) / 1000; // Elapsed time in seconds
      const bytesSent = totalBytesSent;
      const transferSpeed = (bytesSent - lastBytesSent) / (currentTime - lastUpdateTime); // Bytes per millisecond
      

      lastUpdateTime = currentTime;
      lastBytesSent = bytesSent;
    });
    
    // Handle the end of file transfer
    readStream.on('end', () => {
      console.log(`Transferred: ${totalBytesSent/1e6}/${fileSizeInBytes/1e6} bytes`);
      
      // Display progress information
      console.log(`File sent: ${fileName}`);
      // ended = 1

    });
  }
})
function getDeviceIPAddress() {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}
ipcMain.on('destroy-socket',async (event, args)=>{
  // console.log("Destroyed socket", servers)
  servers = await servers
  if(servers){

    servers.destroy()
  }
})
ipcMain.on('server',(event, args)=>{
  console.log("hihi")
  if(servers){

    servers.destroy()
  }
  if(advertisement){
    advertisement.stop()
  }
  if(globalServer){
    globalServer.close(()=>{
      console.log("server closed")
    })
  }
  try{
    const server = net.createServer(socket=>{
      
      // let data = {
      //   "host": 'host',
      //   "extension": 'fileExtension',
      //   "size": 'fileSizeInBytes'
      // }
      // const jsonString = JSON.stringify(data);
      // servers.write(jsonString)
      // socket.write(jsonString)
      // servers.write("HIH")
      console.log("server is socket")

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
      // console.log(data)
      try{
        const jsonString = data.toString();
        const jsonData = JSON.parse(jsonString)
          if('size' in jsonData){
              console.log(jsonData)
              console.log(jsonData)
              hostname = jsonData.host;
              console.log(hostname)
              client = hostname.toString()
              size = jsonData.size;
              console.log('size',size)
              event.reply('size', size);
              event.reply('client-connected', client);
      
              const fileExtension = jsonData.extension;
        
              // Generate a unique file name using timestamp and extension
              const timestamp = Date.now();
              fileName = `received_file_${timestamp}.${fileExtension}`;
              fileStream = fs.createWriteStream(normalizedDirectory+fileName, { highWaterMark: 64 * 1024 * 1024 });
        
              // Create a writable stream for saving the file
              console.log(normalizedDirectory+fileName, '33')
          }else{
            
          }
          }catch{
            try{
              try{
                fileStream.write(data);
                sending = false
                receiving = true
              }catch(err){
                    // console.log("Could not write file", err.message)
              }
    
              // Measure transfer speed and total bytes received
              if (!startTime) {
                startTime = Date.now();
                lastUpdateTime = startTime;
              }
              totalBytesReceived += data.length;
              fileSize += data.length; // Increment the file size
        
              // Calculate and display real-time transfer speed and total bytes received
              const currentTime = Date.now();
              // if(ended==1){
              //   event.reply('speed', {
              //     "speed": 0,
              //     "sent": 0,
              //     "percentage": 0,
              //   });
              //   ended = 0
              // }
              if (currentTime - lastUpdateTime >= 1) { // Update speed every 1 second
                const { speed, received } = calculateTransferSpeed();
                // console.log((speed/(1024*1024)).toFixed(2), fileSize, size,  (fileSize*100)/size)
                event.reply('speed', {
                  "speed": speed.toFixed(2),
                  "sent": fileSize,
                  "percentage": (fileSize*100)/size,
                });
                let sp = {
                  "speed": speed,
                  "sent": received
                }
                sp = JSON.stringify(sp)
                socket.write(sp)
                // console.log(`Transfer speed: ${speed.toFixed(2)} bytes/sec`);
                // console.log(`Total bytes received: ${fileSize} bytes`);
                lastUpdateTime = currentTime;
              }
            }catch{
              
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
      ended = 1
  
      // Calculate final transfer speed and total bytes received
      const { speed, received } = calculateTransferSpeed();
  
      console.log(`Transfer speed: ${speed.toFixed(2)} bytes/sec`);
      console.log(`Total bytes received: ${received} bytes`);
    });
  
    })
    if(servers){
      servers.destroy()
    }
    server.listen(3000, '0.0.0.0', () => {
      globalServer = server
      
      console.log('server', globalServer)
      console.log('Server listening on port 3000');
      const ad = mdns.createAdvertisement(mdns.tcp('tcp-service'), 3000, {
        name: 'My service',
        txtRecord: { description: 'A TCP service for file transfer' }
      });
      ad.start();
      advertisement = ad
    });
  }catch(Exception){
    console.log(Exception)
  }
  
})
ipcMain.on('client',(event, args)=>{
  console.log("Client ")
  const browser = mdns.createBrowser(mdns.tcp('tcp-service'));
  let serverAddress;
  if(servers){
    servers.destroy()
  }
  if(advertisement){
    advertisement.stop()
  }
  if(globalServer){
    globalServer.close(()=>{
      console.log("server closed")
    })
  }
  browser.on('ready', () => {
    browser.discover();
  });
  browser.on('update', service => {
    console.log(getDeviceIPAddress())
    serverPort = service.port
      serverAddress = service.addresses[0];
      if(getDeviceIPAddress()===service.addresses[0]){
        return
      }
      if(!serverPort){ 
        serverPort = 8080
      }
      
      connectToServer(serverPort, serverAddress); 
      browser.stop();
    
  });

  function connectToServer(serverPort, serverAddress) {
    // Create a TCP socket client
    const socket = new net.Socket();
    let fileStream = null;
    // Connect to the server
    socket.connect(serverPort, serverAddress, () => {
      console.log('Connected to the server.');
      // console.log("client ", servers)
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
      try{
        const saveDirectory = path.join(homeDirectory, 'Exchangee/');
        normalizedDirectory = saveDirectory.replace(/\\/g, '/');
        if(localStorage.getItem('destination')){
          normalizedDirectory = localStorage.getItem('destination')
        }
        try{
          if (!fs.existsSync(normalizedDirectory)) {
            fs.mkdirSync(normalizedDirectory, { recursive: true });
          }
        }catch{
          console.log("Can't open directory")
          
        }
      }catch{
        console.log("Directory creation failed")
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

      socket.on('data', data => {
        // console.log("data flowing")
        console.log(typeof(data))
        try{
          const jsonString = data.toString();
           const jsonData = JSON.parse(jsonString)
          if('size' in jsonData){
            try{
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
                console.log("normalized directory", normalizedDirectory)
                fileStream = fs.createWriteStream(normalizedDirectory+fileName, { highWaterMark: 64 * 1024 * 1024 });
          
                // Create a writable stream for saving the file
                console.log(normalizedDirectory+fileName)
            }catch(err){
              try {
                socket.destroy();
                console.log(err)
                // startSocket();
                console.log('Socket restarted successfully.');
              } catch (error) {
                console.error('Error restarting socket:', error);
              }
            }
              
          }else {
          }
        }catch{
          // Write the received data to the file stream
          try{
            // if(i==0){
            //   try{
            //     console.log("HIHIHIHi3")
            //     console.log(normalizedDirectory+fileName)
            //     fileStream = fs.createWriteStream(normalizedDirectory+fileName, { highWaterMark: 64 * 1024 * 1024 });
            //     i++;
            //     console.log("HIHIHI")
            //   }catch{
            //     console.log("Cannot access folder")
            //   }
            // }
            try{
              fileStream.write(data);
            }catch(err){
              console.log("could not write file")
            }
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
              const sp = {
                "speed":speed,
                "sent": received,
                "host": os.hostname(),
              }
              socket.write(JSON.stringify(sp))
              // console.log(`Transfer speed: ${speed.toFixed(2)} bytes/sec`);
              // console.log(`Total bytes received: ${fileSize} bytes`);
              lastUpdateTime = currentTime;
            }
          }catch{

          }
    
          // Measure transfer speed and total bytes received

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
      //   fileStream.end();
    
        // Calculate final transfer speed and total bytes received
        const { speed, received } = calculateTransferSpeed();
    
        console.log(`Transfer speed: ${speed.toFixed(2)} bytes/sec`);
        console.log(`Total bytes received: ${received} bytes`);
      });

    
      
    });
  
    // Handle server disconnections
    socket.on('close', () => {
      console.log('Disconnected from the server.');
    });
  }
})

ipcMain.handle('get-client', async (event) => {
  console.log("update-client")
  return await client
});




app.whenReady().then(()=>{
    localStorage.setItem('server-running', 'false');
    console.log('started')
    createWindow()
    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      })
})

let url = `ws://127.0.0.1:8000/ws/socket-server/`
const chatSocket = new WebSocket(url)

let saveDirectory = null
try{
  saveDirectory = path.join(os.homedir(), 'Exchangee/');
  normalizedDirectory = saveDirectory.replace(/\\/g, '/');
  try{
    if (!fs.existsSync(normalizedDirectory)) {
      fs.mkdirSync(normalizedDirectory, { recursive: true });
    }
  }catch{
    console.log("Can't open directory")
    
  }
}catch{
  console.log("Directory creation failed")
}
let fileName = ''
let fileStream = null
let startTime = null
let lastBytesReceived = null
let totalBytesReceived = null
let fileSize = 0
let totalSize = 0
let sender = 0
ipcMain.on('startWeb',(event, args)=>{
  chatSocket.onmessage = function(e){
    // console.log(e.data)
    // let data = JSON.parse(e.data)
    // console.log(typeof(e.data))
    function calculateTransferSpeed() {
      const currentTime = Date.now();
      const elapsedTime = (currentTime - startTime) / 1000; // Elapsed time in seconds
      const bytesReceived = totalBytesReceived;
      const transferSpeed = bytesReceived / elapsedTime;
      lastBytesReceived = totalBytesReceived;
      // lastUpdateTime = currentTime;
      return { speed: transferSpeed, received: bytesReceived };
    }
    if(sender==0){
      try{
        // console.log('e',e.data)
        // startTime = Date.now();
        const jsonData = JSON.parse(e.data)
        // console.log(jsonData,'e')
        if(jsonData.type=="extension"){
          fileName = jsonData.message.name
          totalSize = jsonData.message.size
          event.reply('size', totalSize);
          console.log(jsonData)
          // console.log(normalizedDirectory+fileName,)
          fileStream = fs.createWriteStream(normalizedDirectory+fileName, { highWaterMark: 64 * 1024 * 1024 });
        }
      }catch{
        // console.log("Data: ", e.data)
        // console.log(typeof(e.data))
          const bufferData = Buffer.from(e.data, 'binary');
          // fileStream.write(e.data)
          fs.appendFile(normalizedDirectory+fileName, e.data, function(err) {
              if (err) {
                  // console.error('Error writing file:', err);
              } else {
                  // console.log('File written successfully!');
              }
          });
      
          if (!startTime) {
            startTime = Date.now();
            lastUpdateTime = startTime;
          }
          totalBytesReceived += e.data.length;
          fileSize += e.data.length; // Increment the file size
      
          // Calculate and display real-time transfer speed and total bytes received
          const currentTime = Date.now();
          if (currentTime - lastUpdateTime >= 1) { // Update speed every 1 second
            const { speed, received } = calculateTransferSpeed();
            console.log(`Transfer speed: ${speed.toFixed(2)} bytes/sec`);
            console.log(`Total bytes received: ${fileSize} bytes`);
            
            event.reply('speed-web', {
              "speed": speed.toFixed(2),
              "sent": fileSize,
              "percentage": (fileSize*100)/totalSize,
            });
            lastUpdateTime = currentTime;
          }
        
      }
    }
    
  }
})

ipcMain.on('web-extension', (event, name, size)=>{
  // servers.destroy()
  console.log("webextension", size)
  sender = 1
  chatSocket.send(JSON.stringify({
    "name": name,
    "size": size
  }))
  
})
ipcMain.on('web',(event, chunks)=>{
  // console.log("web", chunks)
  chatSocket.send(chunks)
})

// when all windows are closed
app.on('window-all-closed', () => {
   
    if (process.platform !== 'darwin') app.quit()
  })
