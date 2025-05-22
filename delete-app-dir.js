// This script will delete all files in the app directory
const fs = require("fs")
const path = require("path")

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file)
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call for directories
        deleteFolderRecursive(curPath)
      } else {
        // Delete file
        fs.unlinkSync(curPath)
        console.log(`Deleted file: ${curPath}`)
      }
    })

    // Delete the empty directory
    fs.rmdirSync(folderPath)
    console.log(`Deleted directory: ${folderPath}`)
  }
}

// Delete the app directory
const appDir = path.join(__dirname, "app")
console.log(`Attempting to delete app directory: ${appDir}`)
deleteFolderRecursive(appDir)

console.log("App directory deletion complete.")
