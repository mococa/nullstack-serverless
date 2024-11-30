/* ---------- External ---------- */
import { join, sep } from "path";
import { mkdirSync, existsSync, rmSync } from "fs";
import AdmZip from "adm-zip";

/**
 * Compresses SSR Nullstack Apps into zip files to be sent to AWS
 *
 * @param app_dirs Nullstack Apps directories
 * @returns {Promise<boolean>} Whether all apps have been successfully zipped
 */
export async function compressSSRNullstackApps(app_dirs: string[]): Promise<boolean> {
  try {

    await Promise.all(
      app_dirs.map(async (app_dir) => {
        const build_parent = join(__dirname, "nullstack-build");
        const serverless_express = join(__dirname, "..", "pkg", "@codegenie", "serverless-express");
        const build_folder = join(build_parent, app_dir.split(sep).reverse()[0]);
        const target = join(build_folder, "build.zip");
        const dot_production = join(app_dir, ".production");
        const public_folder = join(app_dir, "public");
        const index_js_content = [
          'const serverless = require("@codegenie/serverless-express");',
          'const { server } = require("./.production/server.js").default;',
          "server.less = true;",
          "exports.handler = serverless({ app: server, trimStageFromRequestPath: true });",
          "",
        ].join("\n");

        if (!existsSync(build_parent)) mkdirSync(build_parent);
        if (!existsSync(build_folder)) mkdirSync(build_folder);
        if (existsSync(target)) rmSync(target)
        if (!existsSync(dot_production)) {
          throw new Error(`Please, build this SSR nullstack app first. ${build_folder}`);
        }

        // Creating zip
        const build_zip = new AdmZip();

        // Adding lambda entry to zip
        build_zip.addFile("index.js", Buffer.from(index_js_content));

        // Adding node modules to zip
        build_zip.addLocalFolder(
          serverless_express,
          join("node_modules", "@codegenie", "serverless-express")
        );

        // Adding public folder to zip
        build_zip.addLocalFolder(public_folder, "public");

        // Adding .production folder to zip
        if (existsSync(join(app_dir, ".production"))) {
          build_zip.addLocalFolder(
            dot_production,
            ".production",
            new RegExp("client|server"),
          );
        }

        // Writing zip
        return new Promise<boolean>((resolve, reject) => {
          build_zip.writeZip(join(build_folder, "build.zip"), (err: Error | null) => {
            if (err) return reject(err);

            resolve(true);
          });
        });
      })
    );
    return true; // All succeeded
  } catch (error) {
    return false; // At least one failed
  }
}
