import Nullstack, { NullstackClientContext, NullstackNode } from "nullstack";
import Logo from "nullstack/logo";

import Counter from "./Counter";
import "./Home.css";
import { Image } from "./Image";

interface HomeProps {
  greeting: string;
}

interface HomeLinkProps {
  href: string;
}

declare function Link(context: HomeLinkProps): NullstackNode;

class Home extends Nullstack<HomeProps> {
  prepare({
    settings,
    page,
    greeting,
    project,
  }: NullstackClientContext<HomeProps>) {
    page.title = `Count: ${settings.count || 0} - ${greeting}`;
    page.description = `${
      settings.count || 0
    } contagens foram feitas com Nullstack`;
  }

  renderLink({
    children,
    href,
  }: NullstackClientContext<HomeProps & HomeLinkProps>) {
    const link = `${href}?ref=create-nullstack-app`;
    return (
      <a href={link} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  render({ project, greeting }: NullstackClientContext<HomeProps>) {
    return (
      <section>
        <article>
          <a href="/another-route">Go to another route</a>

          <Link href="https://nullstack.app/pt-br">
            <Logo height={60} light />
          </Link>
          <h1> {project.name} </h1>
          <p> {greeting} </p>
          <p>
            Fizemos alguns exemplos para te ajudar a começar! Dê uma olhada na
            <Link href="vscode://file/C:/Users/luizfelipe/Documents/repos/nullstack-test/web/src">
              pasta src
            </Link>
            .
          </p>
          <ul>
            <li>
              <Link href="https://nullstack.app/pt-br/componentes-renderizaveis">
                🎉 Crie seu primeiro componente{" "}
              </Link>
            </li>
            <li>
              <Link href="https://nullstack.app/pt-br/rotas-e-parametros">
                ✨ Configure sua primeira rota
              </Link>
            </li>
            <li>
              <Link href="https://nullstack.app/pt-br/contexto">
                ⚡ Defina seu context
              </Link>
            </li>
            <li>
              <Link href="https://github.com/nullstack/nullstack/stargazers">
                ⭐ Dê uma estrela no github
              </Link>
            </li>
            <li>
              <Link href="https://youtube.com/nullstack">
                🎬 Se inscreva no nosso Canal do Youtube
              </Link>
            </li>
          </ul>
          <span>
            Dica: nós temos uma
            <Link href="vscode:extension/ChristianMortaro.vscode-nullstack">
              Extensão para VS Code
            </Link>
          </span>
          <Counter />
        </article>
        <aside>
          <Link href="https://nullstack.app/pt-br/waifu">
            <Image
              src="/nulla-chan.webp"
              alt="Nulla-Chan: waifu oficial do Nullstack"
            />
          </Link>
        </aside>
      </section>
    );
  }
}

export default Home;
