const fs = require('fs');
const os = require('os')
const ds = require('check-disk-space')
const { dialog } = require('electron');


const { contextBridge, ipcRenderer, ipcMain } = require('electron')

contextBridge.exposeInMainWorld('server', {
  server: () => ipcRenderer.send('server'),
  clients: ()=> ipcRenderer.send('client'),
  me: ()=> os.hostname(),
  getClient: async () => {
    return client()
  },
  speed: async (callback)=>{
    return speed(callback)
  },
  size: async ()=>{
    return size()
  },
  storage: async ()=>{return diskSpace()},
  files: (file)=>{handleFiles(file)},
  selectFolder: () => {
    return new Promise((resolve, reject) => {
      ipcRenderer.once('folder-selected', (event, folderPath) => {
        console.log(folderPath)
        resolve(folderPath);
      });
      ipcRenderer.send('select-folder');
    });
  }
})
async function select(){
    dialog.showOpenDialog({
      properties: ['openDirectory']
    }).then(result => {
      return result
      const folderPath = result.filePaths[0];
      console.log('Selected folder:', folderPath);
    }).catch(err => {
      console.log('Error selecting folder:', err);
    });
}
async function client(){
  return new Promise((resolve, reject) => {
    ipcRenderer.once('client-connected', (event, clientName) => {
      console.log('Client:', clientName);
      resolve(clientName);
    });
  });
}

async function speed(callback){
  return new Promise((resolve, reject)=>{
    ipcRenderer.on('speed', (event, speed) => {
      resolve(speed);
      callback(speed)
    });
  })
}

async function size(){
  return new Promise((resolve, reject)=>{
    ipcRenderer.once('size', (event, size) => {
      resolve(size);
    });
  })
}

function handleFiles(file) {
  // Show a file dialog to select a file
  console.log("Clicked button")
  console.log(file)
  ipcRenderer.send('input-file', file)
}

function getMainDrivePath() {
  const platform = os.platform();

  if (platform === 'win32') {
    return 'C:';
  } else if (platform === 'darwin') {
    return '/';
  } else if (platform === 'linux') {
    return '/';
  }

  return null; // Unsupported platform
}
async function diskSpace(){
  console.log("Diskspace")
  const path = getMainDrivePath()
  const checkDiskSpace = ds.default
  const diskSpace = await checkDiskSpace(path)
  console.log(diskSpace)
  return diskSpace

}



