/* Payload admin 404. Based on the Payload 3 template. */
import config from "@payload-config";
import { generatePageMetadata, NotFoundPage } from "@payloadcms/next/views";
import type { Metadata } from "next";
import { connection } from "next/server";
import { importMap } from "../importMap.js";

type Args = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
};

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });

const NotFound = async ({ params, searchParams }: Args) => {
  await connection();
  return NotFoundPage({ config, params, searchParams, importMap });
};

export default NotFound;
