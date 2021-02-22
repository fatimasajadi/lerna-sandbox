const fs = require("fs");
const path = require("path");

const packagesDir = "packages";

/* eslint-disable no-unused-vars */
module.exports = {
  // The plugin main logic uses `on...` event handlers that are triggered on
  // each new Netlify Build.
  // Anything can be done inside those event handlers.
  // Information about the current build are passed as arguments. The build
  // configuration file and some core utilities are also available.
  async onPreBuild({
    // Whole configuration file. For example, content of `netlify.toml`
    netlifyConfig,
    // Users can pass configuration inputs to any plugin in their Netlify
    // configuration file.
    // For example:
    //
    //   [[plugins]]
    //   package = "netlify-plugin-{{name}}"
    //     [plugins.inputs]
    //     foo = "bar"
    inputs,
    // `onError` event handlers receive the error instance as argument
    error,

    // Build constants
    constants: {
      // Path to the Netlify configuration file. `undefined` if none was used
      CONFIG_PATH,
      // Directory that contains the deploy-ready HTML files and assets
      // generated by the build. Its value is always defined, but the target
      // might not have been created yet.
      PUBLISH_DIR,
      // The directory where function source code lives.
      // `undefined` if not specified by the user.
      FUNCTIONS_SRC,
      // The directory where built serverless functions are placed before
      // deployment. Its value is always defined, but the target might not have
      // been created yet.
      FUNCTIONS_DIST,
      // Boolean indicating whether the build was run locally (Netlify CLI) or
      // in the production CI
      IS_LOCAL,
      // Version of Netlify Build as a `major.minor.patch` string
      NETLIFY_BUILD_VERSION,
      // The Netlify Site ID
      SITE_ID,
    },

    // Core utilities
    utils: {
      // Utility to report errors.
      // See https://github.com/netlify/build#error-reporting
      build,
      // Utility to display information in the deploy summary.
      // See https://github.com/netlify/build#logging
      status,
      // Utility for caching files.
      // See https://github.com/netlify/build/blob/master/packages/cache-utils#readme
      cache,
      // Utility for running commands.
      // See https://github.com/netlify/build/blob/master/packages/run-utils#readme
      run,
      // Utility for dealing with modified, created, deleted files since a git commit.
      // See https://github.com/netlify/build/blob/master/packages/git-utils#readme
      git,
      // Utility for handling Netlify Functions.
      // See https://github.com/netlify/build/tree/master/packages/functions-utils#readme
      functions,
    },
  }) {
    try {
      console.log("packagesDir", packagesDir, process.cwd());
      const allPackages = fs
        .readdirSync(packagesDir)
        .filter((f) => fs.statSync(path.join(packagesDir, f)).isDirectory());

      console.log("allPackages", allPackages);

      const changedPackages = allPackages
        .map((package) => {
          const { edited, deleted } = git.fileMatch(
            path.join(packagesDir, package, "**", "*")
          );

          console.log("changes for ", package, edited, deleted);

          return edited.length || deleted.length ? package : null;
        })
        .filter(Boolean);

      console.log("changedPackages", changedPackages);

      const changedPackageNames = changedPackages
        .map((packageDir) => {
          const packageJsonPath = path.join(
            packagesDir,
            packageDir,
            "package.json"
          );

          if (!fs.existsSync(packageJsonPath)) {
            return null;
          }

          const jsonContent = fs.readFileSync(packageJsonPath);
          return JSON.parse(jsonContent).name;
        })
        .filter(Boolean);

      const changedPackgesScopeFileContent = changedPackageNames
        .map((pkg) => `--scope ${pkg}`)
        .join(" ");

      console.log("changedPackagesScope", changedPackgesScopeFileContent);

      fs.writeFileSync(".changed_scope", changedPackgesScopeFileContent);

      for (const packageDir of allPackages) {
        const distPath = path.join(packagesDir, packageDir, "dist");
        console.log("Restoring cache", distPath);
        const status = await cache.restore(distPath);
        console.log("Restoring status", status, distPath);
      }
    } catch (error) {
      // Report a user error
      build.failBuild("Error message", { error });
    }

    // Console logs are shown in Netlify logs
    console.log("Netlify configuration", netlifyConfig);
    console.log("Plugin configuration", inputs);
    console.log("Build directory", PUBLISH_DIR);

    // Display success information
    status.show({ summary: "Success!" });
  },

  async onSuccess({ utils: { cache } }) {
    const allPackages = fs
      .readdirSync(packagesDir)
      .filter((f) => fs.statSync(path.join(packagesDir, f)).isDirectory());

    for (const packageDir of allPackages) {
      const distPath = path.join(packagesDir, packageDir, "dist");

      console.log("Caching", distPath);

      const status = await cache.save(distPath);

      console.log("Cache status", distPath, status);
    }
  },

  // Other available event handlers
  // Before build commands are executed
  // onPreBuild() {},
  // Build commands are executed
  onBuild() {
    console.log("asdads");
  },
  // After Build commands are executed
  onPostBuild() {},
  // Runs on build success
  // Runs on build error
  onError() {},
  // Runs on build error or success
  onEnd() {},
};
