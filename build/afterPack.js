const { execSync } = require("child_process");
const path = require("path");

/**
 * afterPack hook for electron-builder.
 *
 * Problem: electron-builder reuses hard links when the same source file is copied
 * to multiple destinations (e.g. tray-icon.png and desktop icon both from 32x32.png).
 * The resulting data.tar in the .deb contains hard link entries. When dpkg extracts
 * files to paths on different filesystems (e.g. /opt and /usr), link() fails with
 * EXDEV ("Invalid cross-device link"), making the .deb uninstallable.
 *
 * Fix: after packing but before the .deb is created, find all files with multiple
 * hard links (nlink > 1) and replace them with independent copies.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "linux") {
    return;
  }

  const appOutDir = context.appOutDir;
  console.log(`[afterPack] Dereferencing hard links in ${appOutDir}`);

  try {
    // Find files with hard link count > 1, replace each with an independent copy.
    // `cp --remove-destination` removes the target before copying, breaking the link.
    const result = execSync(
      `find "${appOutDir}" -type f -links +1 -exec cp --remove-destination {} {} \\;`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );

    if (result) {
      console.log(`[afterPack] ${result}`);
    }

    console.log("[afterPack] Hard links dereferenced successfully");
  } catch (error) {
    console.error(
      "[afterPack] Failed to dereference hard links:",
      error.message,
    );
    // Non-fatal: the build can continue, the .deb will just have hard links
    // which only fails on systems with /opt and /usr on different filesystems.
  }
};
