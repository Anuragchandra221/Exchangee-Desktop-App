const {app, BrowserWindow, ipcMain, ipcRenderer, dialog} = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV !== "development"
const net = require('net');
const fs = require('fs');
const mdns = require('mdns-js');
const os = require('os')
let servers = null
let win = ''
let client = null
let sp=0
let sending = null
let receiving = null
let ended = 0
let normalizedDirectory = null
let rec = 0 

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
ipcMain.on('server',(event, args)=>{
  console.log("hihi")
  try{
    const server = net.createServer(socket=>{
      servers = socket
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
      try{
        const jsonString = data.toString();
        const jsonData = JSON.parse(jsonString)
          if('size' in jsonData){
              console.log(data)
              console.log(jsonData)
              hostname = jsonData.host;
              console.log(hostname)
              client = hostname.toString()
              size = jsonData.size;
              console.log(size)
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
                    console.log("Could not write file", err.message)
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
                console.log((speed/(1024*1024)).toFixed(2), fileSize, size,  (fileSize*100)/size)
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
                console.log(`Transfer speed: ${speed.toFixed(2)} bytes/sec`);
                console.log(`Total bytes received: ${fileSize} bytes`);
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
  
    server.listen(8080, '0.0.0.0', () => {
      console.log('Server listening on port 8080');
      const ad = mdns.createAdvertisement(mdns.tcp('tcp-service'), 8080, {
        name: 'My service',
        txtRecord: { description: 'A TCP service for file transfer' }
      });
      ad.start();
    });
  }catch(Exception){
    console.log(Exception)
  }
  
})
ipcMain.on('client',(event, args)=>{
  console.log("Client ")
  const browser = mdns.createBrowser(mdns.tcp('tcp-service'));
  let serverAddress;
  browser.on('ready', () => {
    browser.discover();
  });
  browser.on('update', service => {
    console.log(service)
    serverPort = service.port
      serverAddress = service.addresses[0];
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
      servers = socket
  
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

