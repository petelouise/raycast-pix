import { getSelectedFinderItems, LaunchProps, showToast, Toast } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const renameAsync = promisify(fs.rename);

export default async function Command(props: LaunchProps) {
  try {
    const subdir = props.arguments.subdir.trim();
    const targetDirPath = path.join(os.homedir(), "Dropbox/pictures", subdir);

    // create the directory if it doesn't exist
    if (!fs.existsSync(targetDirPath)) {
      fs.mkdirSync(targetDirPath, { recursive: true });
    }

    const files = await getSelectedFinderItems();

    if (files.length === 0) {
      await showToast({ title: "no files selected, dearest. think about selecting some files.", style: Toast.Style.Failure });
      return;
    }

    // move all files
    const movePromises = files.map(async (file) => {
      const filePath = file.path;
      const fileName = path.basename(filePath);
      const destinationPath = path.join(targetDirPath, fileName);
      await renameAsync(filePath, destinationPath);
    });

    await Promise.all(movePromises);

    // show success toast only after all files are moved
    await showToast({
      title: "pictures have moved!",
      message: `moved ${files.length} files to ${subdir}`,
      style: Toast.Style.Success
    });

  } catch (error) {
    console.error(error);
    await showToast({
      title: "error moving files",
      message: error instanceof Error ? error.message : "unknown error",
      style: Toast.Style.Failure
    });
  }
}
