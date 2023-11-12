/* ---------- External ---------- */
import { join, sep } from "path";
import { mkdirSync, existsSync } from "fs";
import AdmZip from "adm-zip";

/**
 * Compresses SSR Nullstack Apps into zip files to be sent to AWS
 *
 * @param app_dirs Nullstack Apps directories
 * @returns Promise<boolean>
 */
export async function compressSSRNullstackApps(app_dirs: string[]) {
  const build_parent = join(__dirname, "nullstack-build");

  if (!existsSync(build_parent)) mkdirSync(build_parent);

  const serverless_express = join(
    __dirname,
    "..",
    "..",
    "..",
    "@vendia",
    "serverless-express"
  );

  const index_js_content = [
    'const serverless = require("@vendia/serverless-express");',

    'const { server } = require("./.production/server.js").default;',

    "server.less = true;",

    "exports.handler = serverless({ app: server, trimStageFromRequestPath: true });",
    "",
  ].join("\n");

  return Promise.all(
    app_dirs.map(async (app_dir) => {
      const build_folder = join(build_parent, app_dir.split(sep).reverse()[0]);

      if (!existsSync(build_folder)) mkdirSync(build_folder);

      // Creating zip
      const build_zip = new AdmZip();

      // Adding .production folder to zip
      if (existsSync(join(app_dir, ".production")))
        build_zip.addLocalFolder(join(app_dir, ".production"), ".production");

      // Adding public folder to zip
      build_zip.addLocalFolder(join(app_dir, "public"), "public");

      // Adding node modules to zip
      build_zip.addLocalFolder(
        serverless_express,
        join("node_modules", "@vendia", "serverless-express")
      );

      // Adding lambda entry to zip
      build_zip.addFile("index.js", Buffer.from(index_js_content));

      // Writing zip
      return new Promise((resolve, reject) => {
        build_zip.writeZip(join(build_folder, "build.zip"), (err) => {
          if (err) return reject(err);

          resolve(true);
        });
      });
    })
  );
}
