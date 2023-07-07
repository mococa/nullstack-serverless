const serverless = require("@vendia/serverless-express");
const { server } = require("./.production/server").default;

server.less = Boolean(process.env.LAMBDA);

if (!process.env.LAMBDA)
  return server.listen(3000, () => {
    console.log("Server is listening on port 3000");
  });

exports.handler = serverless({ app: server, trimStageFromRequestPath: true });
