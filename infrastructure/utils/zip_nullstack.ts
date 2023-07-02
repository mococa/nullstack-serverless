import zipper from "adm-zip";
import { readFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import path from "path";

const create_folder = (folder_path: string) => {
  if (!existsSync(folder_path)) mkdirSync(folder_path);
};

export const zip_nullstack = (app_dir: string) => {
  console.log("Zipping...");

  return new Promise((resolve, reject) => {
    const index_js_content = readFileSync(
      path.join(__dirname, "..", "lib", "lambda_content.js"),
      { encoding: "utf-8" }
    ).toString();

    const build_folder_path = path.join(__dirname, "..", "nullstack-build");

    create_folder(build_folder_path);

    const build_zip = new zipper();
    build_zip.addLocalFolder(path.join(app_dir, ".production"), ".production");
    build_zip.addLocalFolder(path.join(app_dir, "public"), "public");
    build_zip.addLocalFolder(
      path.join(
        __dirname,
        "..",
        "node_modules",
        "@vendia",
        "serverless-express"
      ),
      path.join("node_modules", "@vendia", "serverless-express")
    );
    build_zip.addFile("index.js", Buffer.from(index_js_content));
    build_zip.writeZip(path.join(build_folder_path, "build.zip"), (err) => {
      if (err) reject(err);
    });

    const lambda_zip = new zipper();
    lambda_zip.addLocalFolder(build_folder_path);
    lambda_zip.writeZip("nullstack-build.zip", (err) => {
      if (err) reject(err);
    });

    resolve(true);
  });
};
