import React from 'react';
import { render, WithRoute } from 'lib/testHelpers';
import { screen } from '@testing-library/react';
import ClusterContext from 'components/contexts/ClusterContext';
import userEvent from '@testing-library/user-event';
import { clusterTopicsPath } from 'lib/paths';
import ListPage from 'components/Topics/List/ListPage';

const clusterName = 'test-cluster';

jest.mock('components/Topics/List/TopicTable', () => () => <>TopicTableMock</>);

describe('ListPage Component', () => {
  const renderComponent = () =>
    render(
      <ClusterContext.Provider
        value={{
          isReadOnly: false,
          hasKafkaConnectConfigured: true,
          hasSchemaRegistryConfigured: true,
          isTopicDeletionAllowed: true,
          ftsEnabled: false,
          ftsDefaultEnabled: false,
        }}
      >
        <WithRoute path={clusterTopicsPath()}>
          <ListPage />
        </WithRoute>
      </ClusterContext.Provider>,
      { initialEntries: [clusterTopicsPath(clusterName)] }
    );

  describe('Component Render', () => {
    beforeEach(() => {
      renderComponent();
    });
    it('handles switch of Internal Topics visibility', async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
      const switchInput = screen.getByLabelText('Show Internal Topics');
      expect(switchInput).toBeInTheDocument();

      expect(global.localStorage.getItem('hideInternalTopics')).toBeNull();
      await userEvent.click(switchInput);
      expect(global.localStorage.getItem('hideInternalTopics')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Filters (1 hidden)' })
      ).toBeInTheDocument();
      await userEvent.click(switchInput);
      expect(global.localStorage.getItem('hideInternalTopics')).toBeNull();
    });

    it('handles switches of consumer group filters', async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
      const switchInput = screen.getByLabelText(
        'Show Topics Without Consumer Groups'
      );
      expect(switchInput).toBeChecked();
      expect(
        screen.getByLabelText('Show Topics With Only Empty Consumer Groups')
      ).toBeChecked();
      expect(
        screen.getByLabelText('Show Topics With Active Consumer Groups')
      ).toBeChecked();
      await userEvent.click(switchInput);
      expect(switchInput).not.toBeChecked();
      expect(
        global.localStorage.getItem('hideNoConsumerGroupsTopics')
      ).toBeTruthy();

      await userEvent.click(screen.getByRole('button', { name: 'Show all' }));
      expect(switchInput).toBeChecked();
      expect(
        global.localStorage.getItem('hideNoConsumerGroupsTopics')
      ).toBeNull();
      expect(screen.getByRole('button', { name: 'Show all' })).toBeDisabled();
    });

    it('renders the TopicsTable', () => {
      expect(screen.getByText('TopicTableMock')).toBeInTheDocument();
    });
  });
});
