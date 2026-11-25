import React, { useState } from 'react';
import { Row } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import {
  Action,
  ConsumerGroup,
  ConsumerGroupOffsetsResetType,
  ResourceType,
} from 'generated-sources';
import useAppParams from 'lib/hooks/useAppParams';
import { ClusterNameRoute } from 'lib/paths';
import { consumerGroupsApiClient as api } from 'lib/api';
import { useConfirm } from 'lib/hooks/useConfirm';
import { ActionCanButton } from 'components/common/ActionComponent';
import { isPermitted } from 'lib/permissions';
import { useUserInfo } from 'lib/hooks/useUserInfo';
import { showServerError, showSuccessAlert } from 'lib/errorHandling';
import { Modal } from 'components/common/Modal';
import { Button } from 'components/common/Button/Button';
import Select from 'components/common/Select/Select';
import { InputLabel } from 'components/common/Input/InputLabel.styled';
import { useTimezone } from 'lib/hooks/useTimezones';
import * as S from 'components/ConsumerGroups/Details/ResetOffsets/ResetOffsets.styled';
import 'react-datepicker/dist/react-datepicker.css';

interface BatchActionsBarProps {
  rows: Row<ConsumerGroup>[];
  resetRowSelection(): void;
}

const resetTypeOptions = [
  ConsumerGroupOffsetsResetType.EARLIEST,
  ConsumerGroupOffsetsResetType.LATEST,
  ConsumerGroupOffsetsResetType.TIMESTAMP,
].map((value) => ({ value, label: value }));

const BatchActionsBar: React.FC<BatchActionsBarProps> = ({
  rows,
  resetRowSelection,
}) => {
  const { clusterName } = useAppParams<ClusterNameRoute>();
  const confirm = useConfirm(true);
  const client = useQueryClient();
  const { roles, rbacFlag } = useUserInfo();
  const { getDateInCurrentTimezone } = useTimezone();
  const groupIds = rows.map(({ original }) => original.groupId);

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetType, setResetType] = useState(
    ConsumerGroupOffsetsResetType.EARLIEST
  );
  const [resetToTimestamp, setResetToTimestamp] = useState(Date.now());

  const canDo = (action: Action) =>
    groupIds.every((value) =>
      isPermitted({
        roles,
        resource: ResourceType.CONSUMER,
        action,
        value,
        clusterName,
        rbacFlag,
      })
    );
  const canDelete = canDo(Action.DELETE);
  const canResetOffsets = canDo(Action.RESET_OFFSETS);

  const runForSelected = async (
    action: (id: string) => Promise<unknown>,
    message: string
  ) => {
    try {
      await Promise.all(groupIds.map(action));
      showSuccessAlert({ message });
      resetRowSelection();
    } catch (e) {
      showServerError(e as Response);
    } finally {
      client.invalidateQueries({
        queryKey: ['clusters', clusterName, 'consumerGroups'],
      });
    }
  };

  const deleteHandler = () => {
    confirm('Are you sure you want to delete selected consumer groups?', () =>
      runForSelected(
        (id) => api.deleteConsumerGroup({ clusterName, id }),
        `${groupIds.length} consumer group(s) deleted`
      )
    );
  };

  // Offsets are reset per topic, for every topic the group has offsets on
  const resetOffsetsHandler = () => {
    setIsResetOpen(false);
    runForSelected(async (id) => {
      const { partitions = [] } = await api.getConsumerGroup({
        clusterName,
        id,
      });
      const topics = [...new Set(partitions.map(({ topic }) => topic))];
      await Promise.all(
        topics.map((topic) =>
          api.resetConsumerGroupOffsets({
            clusterName,
            id,
            consumerGroupOffsetsReset: {
              topic,
              resetType,
              resetToTimestamp:
                resetType === ConsumerGroupOffsetsResetType.TIMESTAMP
                  ? resetToTimestamp
                  : undefined,
            },
          })
        )
      );
    }, `Offsets of ${groupIds.length} consumer group(s) reset`);
  };

  return (
    <>
      <ActionCanButton
        buttonSize="M"
        buttonType="secondary"
        onClick={deleteHandler}
        disabled={!groupIds.length}
        canDoAction={canDelete}
      >
        Delete selected consumer groups
      </ActionCanButton>
      <ActionCanButton
        buttonSize="M"
        buttonType="secondary"
        onClick={() => setIsResetOpen(true)}
        disabled={!groupIds.length}
        canDoAction={canResetOffsets}
      >
        Reset offsets
      </ActionCanButton>
      <Modal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title={`Reset offsets of ${groupIds.length} consumer group(s)`}
        maxWidth="400px"
        footer={
          <>
            <Button
              buttonSize="M"
              buttonType="secondary"
              onClick={() => setIsResetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              buttonSize="M"
              buttonType="primary"
              onClick={resetOffsetsHandler}
            >
              Reset
            </Button>
          </>
        }
      >
        <InputLabel>Reset Type</InputLabel>
        <Select
          options={resetTypeOptions}
          value={resetType}
          onChange={setResetType}
        />
        {resetType === ConsumerGroupOffsetsResetType.TIMESTAMP && (
          <>
            <InputLabel>Timestamp</InputLabel>
            <S.DatePickerInput
              showTimeInput
              timeInputLabel="Time:"
              dateFormat="MMMM d, yyyy h:mm aa"
              selected={getDateInCurrentTimezone(new Date(resetToTimestamp))}
              onChange={(selectedDate: Date | null) =>
                setResetToTimestamp(selectedDate?.getTime() ?? Date.now())
              }
            />
          </>
        )}
      </Modal>
    </>
  );
};

export default BatchActionsBar;
