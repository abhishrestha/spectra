import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="UTF-8" />
          <meta
            name="description"
            content="Chat with AI powered by semantic search"
          />
        </Head>
        <body className="bg-black text-white">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
