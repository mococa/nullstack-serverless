import Nullstack, { NullstackClientContext, NullstackNode } from "nullstack";

import Counter from "./Counter";
import "./Home.css";

export class AnotherRoute extends Nullstack {
  prepare({ project, page }: NullstackClientContext) {
    page.title = `Another route`;
    page.description = `${project.name} foi feito com Nullstack in another route!`;
  }

  render() {
    return (
      <section>
        <h1>Hi from another route!</h1>

        <Counter />

        <a href="/">Go home</a>
      </section>
    );
  }
}
