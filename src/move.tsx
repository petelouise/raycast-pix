import { getSelectedFinderItems, LaunchProps, showToast } from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";

const renameAsync = promisify(fs.rename);

export default async function Command(props: LaunchProps) {
  try {
    const subdir = props.arguments.subdir.trim();
    const targetDirPath = path.join(os.homedir(), "Dropbox/pictures", subdir);
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(targetDirPath)) {
      fs.mkdirSync(targetDirPath, { recursive: true });
    }

    const files = await getSelectedFinderItems();
    
    if (files.length === 0) {
      await showToast({ title: "No files selected", style: "failure" });
      return;
    }

    // Move all files
    const movePromises = files.map(async (file) => {
      const filePath = file.path;
      const fileName = path.basename(filePath);
      const destinationPath = path.join(targetDirPath, fileName);
      await renameAsync(filePath, destinationPath);
    });

    await Promise.all(movePromises);
    
    // Show success toast only after all files are moved
    await showToast({ 
      title: "Files moved successfully", 
      message: `Moved ${files.length} files to ${subdir}`,
      style: "success"
    });

  } catch (error) {
    console.error(error);
    await showToast({ 
      title: "Error moving files", 
      message: error instanceof Error ? error.message : "Unknown error",
      style: "failure"
    });
  }
}
