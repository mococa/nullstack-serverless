import Nullstack, { NullstackServerContext } from "nullstack";

import "./Counter.css";

interface SetCountProps {
  count: number;
}

interface Counter {
  setCount(props: SetCountProps): void;
  getCount(): Promise<number>;
}

class Counter extends Nullstack {
  count = 0;

  static async getCount({ settings }: NullstackServerContext): Promise<number> {
    return Number(settings.count) || 0;
  }

  async initiate() {
    this.count = await this.getCount();
  }

  static async setCount({
    settings,
    count,
  }: NullstackServerContext<SetCountProps>) {
    settings.count = String(count);
  }

  increment() {
    this.count++;
    this.setCount({ count: this.count });
  }

  render() {
    return <button onclick={this.increment}>this.count = {this.count}</button>;
  }
}

export default Counter;
