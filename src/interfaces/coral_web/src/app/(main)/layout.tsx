'use client';

import { NextPage } from 'next';
import { TermsWrapper } from '@/components/TermsWrapper';

import { AgentsList } from '@/components/Agents/AgentsList';
import ConversationListPanel from '@/components/ConversationList/ConversationListPanel';
import { AgentsLayout, Layout, LeftSection, MainSection } from '@/components/Layout';
import { ProtectedPage } from '@/components/ProtectedPage';
import { useExperimentalFeatures } from '@/hooks/experimentalFeatures';
import { TermsModal } from '@/components/TermsModal';

const MainLayout: NextPage<React.PropsWithChildren> = ({ children }) => {
  const { data: experimentalFeatures } = useExperimentalFeatures();
  const isAgentsModeOn = !!experimentalFeatures?.USE_AGENTS_VIEW;

  if (isAgentsModeOn) {
    return (
      <TermsWrapper>
        <ProtectedPage>
          <AgentsLayout showSettingsDrawer>
            <LeftSection>
              <AgentsList />
            </LeftSection>
            <MainSection>{children}</MainSection>
            <TermsModal onAccept={() => {}} />
          </AgentsLayout>
        </ProtectedPage>
      </TermsWrapper>
    );
  }

  return (
    <TermsWrapper>
      <ProtectedPage>
        <Layout>
          <LeftSection>
            <ConversationListPanel />
          </LeftSection>
          <MainSection>{children}</MainSection>
          <TermsModal onAccept={() => {}} />
        </Layout>
      </ProtectedPage>
    </TermsWrapper>
  );
};

export default MainLayout;
