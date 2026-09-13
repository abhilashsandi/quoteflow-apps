//@ts-check
const path = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A package-lock.json a few levels up (outside this monorepo) makes Turbopack guess the
  // wrong workspace root; pin it explicitly to quoteflow-apps.
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
};

module.exports = nextConfig;
