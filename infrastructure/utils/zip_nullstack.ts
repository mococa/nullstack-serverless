import AdminZip from "adm-zip";
import { readFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import path from "path";

const create_folder = (folder_path: string) => {
  if (!existsSync(folder_path)) mkdirSync(folder_path);
};

interface ZipNullstackProps {
  /**
   * Necessary paths to build it successfully
   */
  paths?: {
    /**
     * @default `path.join(__dirname, "..", "nullstack-build")`
     */
    build_folder?: string;

    /**
     * @default path.join(__dirname, "..", "..", "node_modules", "@vendia", "serverless-express")
     */
    serverless_express?: string;
  };

  /**
   * @default true
   */
  zip_public_folder?: boolean;

  /**
   * @default "build.zip"
   */
  zip_name?: string;
}

/**
 *
 *
 * @description
 * Zips the nullstack app into nullstack-buid.zip or custom path
 * for the lambda to properly run
 *
 * Only usable for SSR builds
 *
 * @returns Promise
 */
export const zip_nullstack = async (
  app_dir: string,
  props?: ZipNullstackProps
): Promise<AdminZip> => {
  const config: ZipNullstackProps = {
    zip_name: props?.zip_name || "build.zip",

    zip_public_folder: props?.zip_public_folder || true,

    paths: {
      build_folder:
        props?.paths?.build_folder ||
        path.join(__dirname, "..", "nullstack-build"),

      serverless_express:
        props?.paths?.serverless_express ||
        path.join(
          __dirname,
          "..",
          "..",
          "node_modules",
          "@vendia",
          "serverless-express"
        ),
    },
  };

  const zip_name = `${path
    .basename(config.paths?.build_folder || "")
    .split(path.sep)
    .at(-1)}.zip`;

  return new Promise((resolve, reject) => {
    // Handling errors
    if (!config.paths) throw new Error("Missing paths");

    if (!config.paths.build_folder) throw new Error("Missing build folder");

    if (!config.paths.serverless_express)
      throw new Error("Missing serverless-express folder");

    if (!config.zip_name) throw new Error("Missing zip name");

    const index_js_content = readFileSync(
      path.join(__dirname, "..", "lib", "nullstack-lambda.js"),
      { encoding: "utf-8" }
    ).toString();

    create_folder(config.paths.build_folder);

    const build_zip = new AdminZip();
    // Zipping .production folder
    build_zip.addLocalFolder(path.join(app_dir, ".production"), ".production");

    // Zipping public folder
    if (config.zip_public_folder)
      build_zip.addLocalFolder(path.join(app_dir, "public"), "public");

    // Zipping serverless express dependency
    build_zip.addLocalFolder(
      config.paths.serverless_express,
      path.join("node_modules", "@vendia", "serverless-express")
    );

    // Zipping lambda index.js
    build_zip.addFile("index.js", Buffer.from(index_js_content));

    // Building "build.zip"
    build_zip.writeZip(
      path.join(config.paths.build_folder, config.zip_name),
      (err) => {
        if (err) reject(err);
      }
    );

    // Zipping "build.zip"
    const lambda_zip = new AdminZip();
    // Adding it to "nullstack-build" folder, then zipping it
    lambda_zip.addLocalFolder(config.paths?.build_folder || "");
    lambda_zip.writeZip(zip_name, (err) => {
      if (err) reject(err);
    });

    resolve(lambda_zip);
  });
};
