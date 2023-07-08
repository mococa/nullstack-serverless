const serverless = require("@vendia/serverless-express");
const { server } = require("./.production/server").default;

server.less = Boolean(process.env.LAMBDA === "true");

exports.handler = serverless({ app: server, trimStageFromRequestPath: true });

if (!server.less) server.listen(3000, () => console.log("Listening on :3000"));
