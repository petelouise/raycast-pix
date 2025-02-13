import { getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execAsync = (command: string) => {
  const homebrewPath = "/usr/local/bin:/opt/homebrew/bin";
  return promisify(exec)(command, {
    env: { ...process.env, PATH: `${homebrewPath}:${process.env.PATH}` },
  });
};

// List of video file extensions to process
const videoExtensions = /\.(mp4|mov|avi|mkv)$/i;

async function isFFmpegInstalled() {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

export default async function main() {
  try {
    if (!(await isFFmpegInstalled())) {
      await showToast({
        title: "FFmpeg not found",
        message: "Please install FFmpeg to use this extension.",
        style: Toast.Style.Failure,
      });
      return;
    }

    const items = await getSelectedFinderItems();

    // Filter only video files based on extension
    const videoFiles = items.filter((item) => videoExtensions.test(item.path));

    if (videoFiles.length === 0) {
      await showToast({ title: "No video files selected", message: "Select yourself some video files.", style: Toast.Style.Failure });
      return;
    }

    // Process each video file: extract the first and last frames using ffmpeg
    for (const file of videoFiles) {
      console.log("Processing file:", file.path);
      const filePath = file.path;
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);
      const directory = path.dirname(filePath);

      const firstOutput = path.join(directory, `${baseName}-first.png`);
      const lastOutput = path.join(directory, `${baseName}-last.png`);

      // Extract first frame
      await execAsync(`ffmpeg -i "${filePath}" -frames:v 1 -update 1 -q:v 1 "${firstOutput}"`);

      // Extract last frame.
      // -sseof -1 means "seek to the end of the file minus 3 seconds"
      // this outputs the last second of frames but overwrites the file each time
      await execAsync(`ffmpeg -sseof -1 -i "${filePath}" -update 1 -q:v 1 "${lastOutput}"`);


      console.log(`Frames extracted for: ${filePath}`);
    }

    await showHUD("Extraction complete.");
  } catch (error) {
    console.error(error);
    await showToast({
      title: "Error processing video files",
      message: error instanceof Error ? error.message : "unknown error",
      style: Toast.Style.Failure,
    });
  }
}
