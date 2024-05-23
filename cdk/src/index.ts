import {
  NullstackAppConstruct,
  AppBucket,
  BuildType as StackBuildType,
  StackProps as Props,
} from "../lib/nullstack-construct";

import { zip_nullstack } from "../utils/zip_nullstack";

export namespace NullstackProps {
  export type NullstackAppBucket = AppBucket;
  export type BuildType = StackBuildType;
  export type StackProps = Props;
}

export { zip_nullstack, NullstackAppConstruct };
