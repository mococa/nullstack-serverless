import Nullstack, { NullstackClientContext, NullstackNode } from 'nullstack';

import { Home } from './pages/Home';
import { AnotherRoute } from './pages/AnotherRoute';

import './Application.css';

declare function Head(): NullstackNode;

class Application extends Nullstack {
  prepare({ page }: NullstackClientContext) {
    page.locale = 'pt-BR';
  }

  renderHead() {
    return (
      <head>
        <link href="https://fonts.gstatic.com" rel="preconnect" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crete+Round&family=Roboto&display=swap"
          rel="stylesheet"
        />
      </head>
    );
  }

  render() {
    return (
      <body>
        <Head />

        <Home route="/" greeting="Nulla-chan te dá as boas vindas!" />

        <AnotherRoute route="/another-route/:id" />
      </body>
    );
  }
}

export default Application;
