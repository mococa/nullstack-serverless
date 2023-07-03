/* eslint-disable @typescript-eslint/no-unused-vars */
import Nullstack, {
  ImgHTMLAttributes,
  NullstackClientContext,
} from 'nullstack';

type Props = ImgHTMLAttributes<HTMLImageElement>;

export class Image extends Nullstack<Props> {
  render({
    project,
    children,
    environment,
    instances,
    page,
    params,
    router,
    settings,
    ...props
  }: NullstackClientContext<Props>) {
    return (
      <img
        {...props}
        src={`${
          project.cdn?.endsWith('/')
            ? project.cdn.slice(0, -1)
            : project.cdn || ''
        }/${props.src.startsWith('/') ? props.src.slice(1) : props.src}`}
      />
    );
  }
}
