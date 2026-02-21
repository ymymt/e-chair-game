import React from 'react';
import Document, { Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <html lang="ja">
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap"
            rel="stylesheet"
          />
          <link rel="stylesheet" href="/static/styles.css" />
        </Head>
        <body className="antialiased overscroll-none">
          <Main />
          <NextScript />
        </body>
      </html>
    );
  }
}
