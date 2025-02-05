import { getSelectedFinderItems, LaunchProps, showToast } from "@raycast/api";
import fs from "fs";
import path from "path";

export default async function Command(props: LaunchProps) {
  console.log(props.arguments);
  const subdir = props.arguments.subdir.trim();
  const targetDirPath = path.join("~/Dropbox/pictures", subdir);
  // Create the directory if it doesn't exist
  if (!fs.existsSync(targetDirPath)) {
    fs.mkdirSync(targetDirPath, { recursive: true });
  }
  const files = await getSelectedFinderItems();
  files.forEach(file => {
    const filePath = file.path;
    const fileName = path.basename(filePath);
    const destinationPath = path.join(targetDirPath, fileName);

    fs.rename(filePath, destinationPath, err => {
      if (err) {
        console.error(err);
        await showToast({ title: "didn't work!", message: err.message });
      } else {
        await showToast({ title: "all done!", message: `moved ${files.length} files to ${props.arguments.subdir}` });
      }
    })
  });

}
