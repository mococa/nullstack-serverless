import Nullstack, { NullstackServerContext } from "nullstack";

import Application from "./src/Application";

const context = Nullstack.start(Application) as NullstackServerContext;

context.project.cdn =
  "https://nullstackpublic-cool.s3.us-east-1.amazonaws.com/";

context.start = async function start() {
  // https://nullstack.app/pt-br/inicializacao-da-aplicacao
};

export default context;
