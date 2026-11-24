/* Payload admin pages. Based on the Payload 3 template. */
import config from "@payload-config";
import { generatePageMetadata, RootPage } from "@payloadcms/next/views";
import type { Metadata } from "next";
import { connection } from "next/server";
import { importMap } from "../importMap.js";

type Args = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
};

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });

// The admin is always per-request (auth cookies, TOTP time checks), so skip prerendering.
const Page = async ({ params, searchParams }: Args) => {
  await connection();
  return RootPage({ config, params, searchParams, importMap });
};

export default Page;
