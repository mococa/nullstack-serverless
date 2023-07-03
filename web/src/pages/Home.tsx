import Nullstack, { NullstackClientContext } from 'nullstack';

import Counter from '../components/Counter';
import { Image } from '../components/Image';

import './Home.css';

export class Home extends Nullstack {
  prepare({ settings, page }: NullstackClientContext) {
    page.title = `Count: ${settings.count || 0}`;
    page.description = `The count button has been clicked ${
      settings.count || 0
    } times with Nullstack Serverless!`;
  }

  render() {
    return (
      <main>
        <h1 class="title">Welcome to Serverless Nullstack!</h1>

        <Image class="lambda" src="/lambda.png" height={150} width={150} />

        <Counter />

        <a href="/another-route">Go to another route</a>
      </main>
    );
  }
}
