const fs = require('fs');
const os = require('os')
const ds = require('check-disk-space')

const { contextBridge, ipcRenderer, ipcMain } = require('electron')

contextBridge.exposeInMainWorld('server', {
  server: () => ipcRenderer.send('server'),
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
  storage: async ()=>{return diskSpace()}
})
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



