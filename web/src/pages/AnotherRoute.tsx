import Nullstack, { NullstackClientContext } from 'nullstack';

import Counter from '../components/Counter';
import { Image } from '../components/Image';

import './Home.css';

export class AnotherRoute extends Nullstack {
  prepare({ project, page }: NullstackClientContext) {
    page.title = `Another route`;
    page.description = `${project.name} in another route!`;
  }

  render() {
    return (
      <main>
        <section>
          <Image
            class="hero"
            src="/image-1200x630.png"
            height={225}
            width={390}
          />

          <h1>Hello from another route!</h1>

          <Counter />

          <a href="/">Home page</a>
        </section>
      </main>
    );
  }
}
