import { styled } from '@linaria/react';
import { useState, useMemo } from 'react';

import { ActivityList } from '@/activities/components/ActivityList';
import { CustomResolverFetchMoreLoader } from '@/activities/components/CustomResolverFetchMoreLoader';
import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { ComposeEmailModal } from '@/activities/emails/components/ComposeEmailModal';
import { EmailThreadPreview } from '@/activities/emails/components/EmailThreadPreview';
import { TIMELINE_THREADS_DEFAULT_PAGE_SIZE } from '@/activities/emails/constants/Messaging';
import { getTimelineThreadsFromCompanyId } from '@/activities/emails/graphql/queries/getTimelineThreadsFromCompanyId';
import { getTimelineThreadsFromOpportunityId } from '@/activities/emails/graphql/queries/getTimelineThreadsFromOpportunityId';
import { getTimelineThreadsFromPersonId } from '@/activities/emails/graphql/queries/getTimelineThreadsFromPersonId';
import { useCustomResolver } from '@/activities/hooks/useCustomResolver';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { Trans } from '@lingui/react/macro';
import { H1Title, H1TitleFontColor } from 'twenty-ui/display';
import {
  AnimatedPlaceholder,
  AnimatedPlaceholderEmptyContainer,
  AnimatedPlaceholderEmptySubTitle,
  AnimatedPlaceholderEmptyTextContainer,
  AnimatedPlaceholderEmptyTitle,
  EMPTY_PLACEHOLDER_TRANSITION_PROPS,
  Section,
} from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import {
  type TimelineThread,
  type TimelineThreadsWithTotal,
} from '~/generated/graphql';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  height: 100%;
  overflow: auto;
  padding: ${themeCssVariables.spacing[6]} ${themeCssVariables.spacing[6]}
    ${themeCssVariables.spacing[2]};
`;

const StyledH1TitleWrapper = styled.div`
  > h2 {
    display: flex;
    gap: ${themeCssVariables.spacing[2]};
  }
`;

const StyledEmailCount = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

const StyledComposeButton = styled.button`
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  border-radius: ${themeCssVariables.border.radius.sm};
  border: 1px solid ${themeCssVariables.border.color.medium};
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  cursor: pointer;

  &:hover {
    background: ${themeCssVariables.background.tertiary};
  }
`;

const StyledHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const EmailsCard = () => {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const targetRecord = useTargetRecord();

  const [query, queryName] =
    targetRecord.targetObjectNameSingular === CoreObjectNameSingular.Person
      ? [getTimelineThreadsFromPersonId, 'getTimelineThreadsFromPersonId']
      : targetRecord.targetObjectNameSingular === CoreObjectNameSingular.Company
        ? [getTimelineThreadsFromCompanyId, 'getTimelineThreadsFromCompanyId']
        : [
            getTimelineThreadsFromOpportunityId,
            'getTimelineThreadsFromOpportunityId',
          ];

  const { data, firstQueryLoading, isFetchingMore, fetchMoreRecords } =
    useCustomResolver<TimelineThreadsWithTotal>(
      query,
      queryName,
      'timelineThreads',
      targetRecord,
      TIMELINE_THREADS_DEFAULT_PAGE_SIZE,
    );

  const { totalNumberOfThreads, timelineThreads } = data?.[queryName] ?? {};
  const hasMoreTimelineThreads =
    timelineThreads && totalNumberOfThreads
      ? timelineThreads?.length < totalNumberOfThreads
      : false;

  const handleLastRowVisible = async () => {
    if (hasMoreTimelineThreads) {
      await fetchMoreRecords();
    }
  };

  if (firstQueryLoading) {
    return <SkeletonLoader />;
  }

  const defaultTo = useMemo(() => {
    const record = targetRecord?.targetRecord;

    if (!record) return '';

    if (record.emails?.primaryEmail) return record.emails.primaryEmail;

    return '';
  }, [targetRecord]);

  if (!firstQueryLoading && !timelineThreads?.length) {
    return (
      <>
        <AnimatedPlaceholderEmptyContainer
          // oxlint-disable-next-line react/jsx-props-no-spreading
          {...EMPTY_PLACEHOLDER_TRANSITION_PROPS}
        >
          <AnimatedPlaceholder type="emptyInbox" />
          <AnimatedPlaceholderEmptyTextContainer>
            <AnimatedPlaceholderEmptyTitle>
              <Trans>Empty Inbox</Trans>
            </AnimatedPlaceholderEmptyTitle>
            <AnimatedPlaceholderEmptySubTitle>
              <Trans>
                No email exchange has occurred with this record yet.
              </Trans>
            </AnimatedPlaceholderEmptySubTitle>
          </AnimatedPlaceholderEmptyTextContainer>
          <StyledComposeButton onClick={() => setIsComposeOpen(true)}>
            <Trans>Compose Email</Trans>
          </StyledComposeButton>
        </AnimatedPlaceholderEmptyContainer>
        <ComposeEmailModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          defaultTo={defaultTo}
        />
      </>
    );
  }

  return (
    <StyledContainer>
      <Section>
        <StyledHeaderRow>
          <StyledH1TitleWrapper>
            <H1Title
              title={
                <>
                  <Trans>Inbox</Trans>{' '}
                  <StyledEmailCount>{totalNumberOfThreads}</StyledEmailCount>
                </>
              }
              fontColor={H1TitleFontColor.Primary}
            />
          </StyledH1TitleWrapper>
          <StyledComposeButton onClick={() => setIsComposeOpen(true)}>
            <Trans>Compose</Trans>
          </StyledComposeButton>
        </StyledHeaderRow>
        {!firstQueryLoading && (
          <ActivityList>
            {timelineThreads?.map((thread: TimelineThread) => (
              <EmailThreadPreview key={thread.id} thread={thread} />
            ))}
          </ActivityList>
        )}
        <CustomResolverFetchMoreLoader
          loading={isFetchingMore || firstQueryLoading}
          onLastRowVisible={handleLastRowVisible}
        />
      </Section>
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        defaultTo={defaultTo}
      />
    </StyledContainer>
  );
};
