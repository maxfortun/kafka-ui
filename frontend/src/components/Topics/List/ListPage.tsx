import React, { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clusterTopicNewRelativePath } from 'lib/paths';
import { PER_PAGE } from 'lib/constants';
import ClusterContext from 'components/contexts/ClusterContext';
import Search from 'components/common/Search/Search';
import { ActionButton } from 'components/common/ActionComponent';
import { ControlPanelWrapper } from 'components/common/ControlPanel/ControlPanel.styled';
import Switch from 'components/common/Switch/Switch';
import PlusIcon from 'components/common/Icons/PlusIcon';
import PageLoader from 'components/common/PageLoader/PageLoader';
import TopicTable from 'components/Topics/List/TopicTable';
import {
  Action,
  GetTopicsRequest,
  ResourceType,
  SortOrder,
  TopicColumnsToSort,
} from 'generated-sources';
import ResourcePageHeading from 'components/common/ResourcePageHeading/ResourcePageHeading';
import Fts from 'components/common/Fts/Fts';
import useFts from 'components/common/Fts/useFts';
import useAppParams from 'lib/hooks/useAppParams';
import { ClusterName } from 'lib/interfaces/cluster';
import { DownloadCsvButton } from 'components/common/DownloadCsvButton/DownloadCsvButton';
import { topicsApiClient } from 'lib/api';
import { Button } from 'components/common/Button/Button';
import useClickOutside from 'lib/hooks/useClickOutside';
import FilterIcon from 'components/common/Icons/FilterIcon';

import * as S from './ListPage.styled';

// URL param, localStorage key and label of each Show/Hide filter
const filters = [
  ['hideInternal', 'hideInternalTopics', 'Show Internal Topics'],
  [
    'hideNoConsumerGroups',
    'hideNoConsumerGroupsTopics',
    'Show Topics Without Consumer Groups',
  ],
  [
    'hideEmptyConsumerGroups',
    'hideEmptyConsumerGroupsTopics',
    'Show Topics With Only Empty Consumer Groups',
  ],
  [
    'hideActiveConsumerGroups',
    'hideActiveConsumerGroupsTopics',
    'Show Topics With Active Consumer Groups',
  ],
];

const ListPage: React.FC = () => {
  const { clusterName } = useAppParams<{ clusterName: ClusterName }>();
  const { isReadOnly } = React.useContext(ClusterContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const { isFtsEnabled } = useFts('topics');
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);
  const filtersRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(filtersRef, () => setIsFiltersOpen(false));

  // Set the search params to the url based on the localStorage value
  React.useEffect(() => {
    if (!searchParams.has('perPage')) {
      searchParams.set('perPage', String(PER_PAGE));
    }
    filters.forEach(([param, storageKey]) => {
      if (!!localStorage.getItem(storageKey) && !searchParams.has(param)) {
        searchParams.set(param, 'true');
      }
    });
    setSearchParams(searchParams);
  }, []);

  const handleSwitch = (param: string, storageKey: string) => {
    if (searchParams.has(param)) {
      localStorage.removeItem(storageKey);
      searchParams.delete(param);
    } else {
      localStorage.setItem(storageKey, 'true');
      searchParams.set(param, 'true');
    }
    // Page must be reset when the switch is toggled
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const handleShowAll = () => {
    filters.forEach(([param, storageKey]) => {
      localStorage.removeItem(storageKey);
      searchParams.delete(param);
    });
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const params: GetTopicsRequest = {
    clusterName,
    showInternal: !searchParams.has('hideInternal'),
    showNoConsumerGroups: !searchParams.has('hideNoConsumerGroups'),
    showEmptyConsumerGroups: !searchParams.has('hideEmptyConsumerGroups'),
    showActiveConsumerGroups: !searchParams.has('hideActiveConsumerGroups'),
    search: searchParams.get('q') || undefined,
    orderBy: (searchParams.get('sortBy') as TopicColumnsToSort) || undefined,
    sortOrder:
      (searchParams.get('sortDirection')?.toUpperCase() as SortOrder) ||
      undefined,
    fts: isFtsEnabled,
  };

  const hiddenCount = filters.filter(([param]) =>
    searchParams.has(param)
  ).length;

  const fetchCsv = async () => {
    return topicsApiClient.getTopicsCsv(params);
  };

  return (
    <>
      <ResourcePageHeading text="Topics">
        <>
          {!isReadOnly && (
            <ActionButton
              buttonType="primary"
              buttonSize="M"
              to={clusterTopicNewRelativePath}
              permission={{
                resource: ResourceType.TOPIC,
                action: Action.CREATE,
              }}
            >
              <PlusIcon /> Add a Topic
            </ActionButton>
          )}

          <DownloadCsvButton
            filePrefix={`topics-${clusterName}`}
            fetchCsv={fetchCsv}
          />
        </>
      </ResourcePageHeading>
      <ControlPanelWrapper hasInput>
        <Search
          key={clusterName}
          placeholder="Search by Topic Name"
          extraActions={<Fts resourceName="topics" />}
        />
        <S.Filters ref={filtersRef}>
          <Button
            buttonType="secondary"
            buttonSize="M"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          >
            <FilterIcon />
            {`Filters${hiddenCount ? ` (${hiddenCount} hidden)` : ''}`}
          </Button>
          {isFiltersOpen && (
            <S.FiltersPopup>
              {filters.map(([param, storageKey, label]) => (
                <label key={param}>
                  <Switch
                    name={label.replace(/ /g, '')}
                    checked={!searchParams.has(param)}
                    onChange={() => handleSwitch(param, storageKey)}
                  />
                  {label}
                </label>
              ))}
              <Button
                buttonType="secondary"
                buttonSize="S"
                disabled={!hiddenCount}
                onClick={handleShowAll}
              >
                Show all
              </Button>
            </S.FiltersPopup>
          )}
        </S.Filters>
      </ControlPanelWrapper>
      <Suspense fallback={<PageLoader />}>
        <TopicTable params={params} />
      </Suspense>
    </>
  );
};

export default ListPage;
