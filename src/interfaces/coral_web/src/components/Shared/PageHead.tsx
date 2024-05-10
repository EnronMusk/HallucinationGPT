import Head from 'next/head';

/**
 * Page head wrapper component that aligns page titles.
 */
export const PageHead: React.FC<{ title: string; children?: React.ReactNode }> = ({
  title,
  children,
}) => {
  const fullTitle = `ChatGPT Hallucination Leaderboard`;
  return (
    <Head>
      <title>{fullTitle}</title>
      {children}
    </Head>
  );
};
