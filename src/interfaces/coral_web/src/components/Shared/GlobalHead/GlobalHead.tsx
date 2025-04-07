'use client';

import Head from 'next/head';

/*
 * Some basic meta tag values for the site.
 */
export const GlobalHead: React.FC = () => {
  const description =
    'GPT Review - Chat with GPT models with powerful annotation tools to get the best answers to your questions.';

  return (
    <Head>
      <link rel="icon" href="/favicon.ico" />
      <meta name="description" content={description} />
      <meta
        name="viewport"
        content="initial-scale=1.0, width=device-width, viewport-fit=cover, maximum-scale=1.0"
      />

      <meta property="og:description" content={description} />
      <meta property="og:image" content="/images/share.png" />
      <meta property="og:image:width" content="800" />
      <meta property="og:image:height" content="600" />
      <meta property="og:site_name" content="Cohere" />
    </Head>
  );
};
