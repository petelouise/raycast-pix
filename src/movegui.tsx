import { Action, ActionPanel, closeMainWindow, Detail, getPreferenceValues, getSelectedFinderItems, Icon, List, showHUD } from "@raycast/api";
import { accessSync, constants, existsSync, mkdirSync, readdirSync, rename, statSync } from "fs";
import { homedir } from "os";
import { basename, join } from "path";
import { ComponentType, useState } from "react";
import { promisify } from "util";

// largely copied from https://github.com/raycast/extensions/blob/46b4809ded65cd4272abb93037e617098da01ed3/extensions/subdirs-manager/src/manage-subdirs.tsx

const renameAsync = promisify(rename);
const preferences = getPreferenceValues();
preferences.picturesDir = join(homedir(), "Dropbox/pictures")
const picturesDir = preferences.picturesDir;
const fileOrder = preferences.fileOrder;

const ITEMS = Array.from(Array(3).keys()).map((key) => {
  return {
    id: key,
    icon: Icon.Bird,
    title: "Title " + key,
    subtitle: "Subtitle",
    accessory: "Accessory",
  };
});

export function getSubdirs() {
  const files = readdirSync(picturesDir);
  return files
    .map((file, index) => {
      const path = join(picturesDir, file);
      const stats = statSync(path);
      return {
        file,
        path,
        id: `subdir-${index}`,
        isDirectory: stats.isDirectory(),
        lastModifiedAt: stats.mtime,
        createdAt: stats.ctime,
        addedAt: stats.atime,
      };
    })
    .filter(({isDirectory}) => isDirectory)
    .sort((a, b) => {
      switch (fileOrder) {
        case "addTime":
          return b.addedAt.getTime() - a.addedAt.getTime();
        case "createTime":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "modifiedTime":
        default:
          return b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime();
      }
    });
}

export function hasAccessToPicturesDir() {
  try {
    accessSync(preferences.picturesDir, constants.R_OK);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export const withAccessToPicturesDir = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    if (hasAccessToPicturesDir()) {
      accessSync(preferences.picturesDir, constants.R_OK);
      return <Component {...props} />;
    } else {
      const markdown = `## permission required\n\npix requires access to your pictures folder. please grant.\n\n![grant](permission.png)`;
      return (
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action.Open
                title="Grant Permission"
                target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
              />
            </ActionPanel>
          }
        />
      );
    }
  };
};

async function createSubdir(subdir: string) {
  const targetDirPath = join(picturesDir, subdir);
  console.log("creating subdir", targetDirPath);
  closeMainWindow();
  try {
    // create the directory if it doesn't exist
    if (!existsSync(targetDirPath)) {
      mkdirSync(targetDirPath, { recursive: true });
    }

    const files = await getSelectedFinderItems();

    if (files.length === 0) {
      await showHUD("no files selected, dearest. think about selecting some files.");
      return;
    }

    // move all files
    const movePromises = files.map(async (file) => {
      const filePath = file.path;
      const fileName = basename(filePath);
      const destinationPath = join(targetDirPath, fileName);
      await renameAsync(filePath, destinationPath);
    });

    await Promise.all(movePromises);

    // show success toast only after all files are moved
    await showHUD(`${files.length} pictures have moved to ${subdir}!`);

  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "unknown error";
    await showHUD("error moving files: " + message);
  }
}


function Command() {
  const [subdirs] = useState(getSubdirs());
  const [state, setState] = useState({ searchText: "", items: [] });

  return (
    <List
      onSearchTextChange={(newValue) => setState((previous) => ({ ...previous, searchText: newValue }))}
      actions={
        <ActionPanel>
          <Action
            title="create subdir"
            onAction={() => createSubdir(state.searchText)}
          />
        </ActionPanel>
      }
    >
      {subdirs.length === 0 && (
        <List.EmptyView
          icon={{ source: "https://placekitten.com/500/500" }}
          title="no subdirs found"
          description="you could make some subdirs in your pictures folder..."
        />
      )}
      {state.searchText.length > 0 && !subdirs.some((subdir) => subdir.file === state.searchText) && (
        <List.Item
          id={state.searchText}
          key={state.searchText}
          title={state.searchText}
          subtitle={"create new subdir"}
          actions={
            <ActionPanel>
              <Action title={`move to ${state.searchText}`} onAction={() => createSubdir(state.searchText)} />
            </ActionPanel>
          }
        />
      )}

      {subdirs.filter((subdir) => subdir.file.includes(state.searchText)).map((subdir) => (
        <List.Item
          id={subdir.id}
          key={subdir.path}
          title={subdir.file}
          icon={{ fileIcon: subdir.path }}
          quickLook={{ path: subdir.path, name: subdir.file }}
          accessories={[
            {
              date: subdir.lastModifiedAt,
              tooltip: `Last modified: ${subdir.lastModifiedAt.toLocaleString()}`,
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title={`Move to ${subdir.file}`} onAction={() => createSubdir(subdir.file)} />
                <Action.ShowInFinder path={subdir.path} />
                <Action.CopyToClipboard
                  title="Copy File"
                  content={{ file: subdir.path }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.OpenWith path={subdir.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withAccessToPicturesDir(Command);
