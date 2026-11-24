/* Payload admin root layout. Based on the Payload 3 template; keep in sync on upgrades. */
import config from "@payload-config";
import "@payloadcms/next/css";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import { connection } from "next/server";
import type { ServerFunctionClient } from "payload";
import type React from "react";
import { importMap } from "./admin/importMap.js";
import "./custom.scss";

type Args = { children: React.ReactNode };

/** The admin has no static shell: it renders per request, behind auth. Applies to the admin group only. */
export const instant = false;

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

// Admin is per-request (auth cookies, token expiry checks): opt out of prerendering.
const Layout = async ({ children }: Args) => {
  await connection();
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  );
};

export default Layout;
