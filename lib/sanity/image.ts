import imageUrlBuilder from "@sanity/image-url";
import { client } from "./client";

const builder = imageUrlBuilder(client);

export interface SanityImageSource {
  _type: string;
  asset: {
    _ref: string;
    _type: string;
  };
  crop?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  hotspot?: {
    x: number;
    y: number;
    height: number;
    width: number;
  };
}

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
