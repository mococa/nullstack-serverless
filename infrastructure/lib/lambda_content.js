const serverless = require("@vendia/serverless-express");
const { server } = require("./.production/server").default;

if (!process.env.LAMBDA) {
  server.listen(3000, () => {
    console.log("Server is listening on port 3000");
  });
} else {
  server.less = true;
  exports.handler = serverless({ app: server, trimStageFromRequestPath: true });
}
